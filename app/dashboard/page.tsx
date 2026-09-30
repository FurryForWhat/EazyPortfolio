import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { createClient } from "@/lib/supabase-server";
import { fetchPortfolioProjects } from "@/lib/portfolio";

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
          <div className="flex min-h-screen items-center justify-center bg-[#070b1a]">
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

  // Portfolio = freshest entry per currently selected repo (see lib/portfolio)
  const projects = await fetchPortfolioProjects(supabase, profile.id);

  return <Dashboard profile={profile} initialProjects={projects} />;
}
