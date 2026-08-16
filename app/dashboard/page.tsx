import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Dashboard from "@/components/dashboard";
import PortfolioCard from "@/components/portfolio-card";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: session.user.id,
        github_id: parseInt(session.user.user_metadata?.github_id || "0"),
        github_login: session.user.user_metadata?.github_login || session.user.email?.split("@")[0] || "",
      })
      .select("*")
      .single();

    if (error || !newProfile) {
      return <div className="flex min-h-screen items-center justify-center"><p className="text-red-400">Failed to create profile.</p></div>;
    }
  }

  // Fetch user's latest successful run and its projects
  const { data: runs } = await supabase
    .from("runs")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1);

  let projects: Record<string, unknown>[] = [];
  if (runs?.length) {
    const { data: entries } = await supabase
      .from("project_entries")
      .select("entry")
      .eq("run_id", runs[0].id)
      .order("created_at", { ascending: true });
    projects = entries?.map((e) => e.entry) || [];
  }

  return <Dashboard profile={profile} initialProjects={projects} />;
}
