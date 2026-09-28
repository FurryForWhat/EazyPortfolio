/*
 * GitHub rate limit note:
 * - Uses each user's own OAuth token (captured at sign-in), not a shared one
 * - Authenticated rate limit: 5,000/hr, per user
 * - At scale, consider caching results (Redis/in-memory TTL) per user
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(_cookies: { name: string; value: string; options: any }[]) {},
      },
    }
  );
}

export async function GET() {
  const supabase = await getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const githubToken = profile.github_access_token;
  if (!githubToken) {
    return NextResponse.json(
      { error: "No GitHub token on file — please sign out and sign in again to reconnect." },
      { status: 401 }
    );
  }

  const ghRes = await fetch(
    `https://api.github.com/user/repos?per_page=100&type=owner&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (ghRes.status === 401) {
    return NextResponse.json(
      { error: "GitHub token expired or revoked — please sign out and sign in again." },
      { status: 401 }
    );
  }
  if (!ghRes.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repos from GitHub" },
      { status: 502 }
    );
  }

  const repos = await ghRes.json();

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
