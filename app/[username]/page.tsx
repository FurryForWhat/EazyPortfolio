import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PortfolioCard from "@/components/portfolio-card";

// Force request-time rendering so new portfolios appear immediately
// without waiting for the next Vercel rebuild. Revalidate every 60s.
export const dynamic = "force-dynamic";
export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `${username} · Portfolio`,
    description: `Projects by ${username}`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const { data: runs } = await supabase
    .from("runs")
    .select("id")
    .eq("username", username)
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1);

  if (!runs?.length) {
    notFound();
  }

  const { data: entries } = await supabase
    .from("project_entries")
    .select("entry")
    .eq("run_id", runs[0].id)
    .order("created_at", { ascending: true });

  const projects = (entries || []).map((e) => e.entry);

  return (
    <div className="min-h-screen bg-[#070b1a]">
      {/* Hero */}
      <header className="border-b border-[#1a1f3a]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-2">@{username}</h1>
          <p className="text-[#7b80a0]">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · Generated from GitHub commit history
          </p>
        </div>
      </header>

      {/* Projects */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          <p className="text-[#7b80a0] text-center py-12">
            No projects yet. Run /update-portfolio to generate.
          </p>
        ) : (
          <div className="space-y-8">
            {projects.map((project, i) => (
              <PortfolioCard key={(project.id as string) + i} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1f3a] mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-[#7b80a0]">
          Powered by{" "}
          <a
            href="https://eazyportfolio.dev"
            className="text-[#4f6ef6] hover:underline"
          >
            EazyPortfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
