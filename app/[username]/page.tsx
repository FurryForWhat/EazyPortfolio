import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PortfolioCard from "@/components/portfolio-card";
import { fetchPortfolioProjects } from "@/lib/portfolio";

// Force request-time rendering so new portfolios appear immediately
// without waiting for the next Vercel rebuild. Revalidate every 60s.
export const dynamic = "force-dynamic";
export const revalidate = 60;

// Public portfolio page: anyone can visit /{username}, but RLS only lets the
// anon key read the visitor's *own* profiles/runs — so the anon query returned
// nothing and this page 404'd for every non-owner. The service-role key is
// read here server-side only (never NEXT_PUBLIC, never shipped to the browser)
// and only ever selects a profile row plus that profile's project entries.
const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  : createClient(
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("github_login", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const projects = await fetchPortfolioProjects(supabase, profile.id);

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
            href={(process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") || "/"}
            className="text-[#4f6ef6] hover:underline"
          >
            EazyPortfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
