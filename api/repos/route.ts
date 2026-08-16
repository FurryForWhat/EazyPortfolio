/*
 * GitHub rate limit note:
 * - Uses shared GITHUB_TOKEN (not per-user tokens)
 * - Authenticated rate limit: 5,000/hr
 * - At scale, consider caching results (Redis/in-memory TTL)
 * - Per-user tokens would give 15,000/hr but require user token management
 */
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch user's GitHub repos via GitHub API
  const ghRes = await fetch(
    `https://api.github.com/user/repos?per_page=100&type=owner&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!ghRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repos from GitHub" },
      { status: 502 }
    );
  }

  const repos = await ghRes.json();

  // Merge with previously selected repos
  const { data: selected } = await supabase
    .from("selected_repos")
    .select("*")
    .eq("profile_id", profile.id);

  const selectedSet = new Map(
    (selected || []).map((r) => [r.github_repo, r])
  );

  const merged = repos.map((repo: any) => ({
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    language: repo.language,
    pushed_at: repo.pushed_at,
    stargazers: repo.stargazers_count,
    alreadySelected: selectedSet.has(repo.full_name),
  }));

  return NextResponse.json({ repos: merged });
}
