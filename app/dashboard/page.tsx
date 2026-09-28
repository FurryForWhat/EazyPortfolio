import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { createClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const githubId = parseInt(session.user.user_metadata?.github_id || "0");
  const githubLogin = session.user.user_metadata?.github_login || session.user.email?.split("@")[0] || "";

  let profile = existingProfile;

  if (!profile) {
    // Check if profile exists by github_id (might have different auth.uid)
    const { data: existingByGithub } = await supabase
      .from("profiles")
      .select("*")
      .eq("github_id", githubId)
      .single();

    if (existingByGithub) {
      profile = existingByGithub;
    } else {
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: session.user.id,
          github_id: githubId,
          github_login: githubLogin,
        })
        .select("*")
        .single();

      if (error || !newProfile) {
        console.error("Profile creation error:", error);
        return (
          <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
            <div className="text-center">
              <p className="text-red-400 mb-2">Failed to create profile.</p>
              <p className="text-sm text-[#7b80a0]">{error?.message || "Unknown error"}</p>
            </div>
          </div>
        );
      }
      profile = newProfile;
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
