import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Anon key + RLS made this route answer `[]` to every public visitor: `runs`
// has no policy for auth.uid() IS NULL, so the "latest successful run" query
// returned zero rows before it ever reached `project_entries` (issue #4).
// The service-role key is read server-side only — never NEXT_PUBLIC — and only
// ever selects this username's profile, their selected repos, and that run's
// entries. Same pattern as app/[username]/page.tsx.
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

// CORS headers so self-hosted pages can fetch projects.json cross-origin.
// This is the only route in the app that opts into a wildcard origin — the
// blanket `Access-Control-Allow-Origin: *` on `/:path*` used to cover the
// cookie-authenticated routes too (issue #5).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const resolved = await params;
  const username = resolved.username;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("github_login", username)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  // Same source of truth as the public /{username} page: only repos the user
  // currently has selected, so a deselected project disappears from the feed
  // too instead of living on in the last successful run.
  const { data: selected } = await supabase
    .from("selected_repos")
    .select("github_repo")
    .eq("profile_id", profile.id)
    .eq("included", true);

  const includedRepos = (selected ?? []).map((s) => s.github_repo);
  if (includedRepos.length === 0) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  const { data: runs } = await supabase
    .from("runs")
    .select("id")
    .eq("username", username)
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1);

  if (!runs?.length) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  const { data: entries } = await supabase
    .from("project_entries")
    .select("repo_name, entry")
    .eq("run_id", runs[0].id)
    .order("created_at", { ascending: true });

  const projects = (entries || [])
    .filter((e) => includedRepos.includes(e.repo_name))
    .map((e) => e.entry);

  return NextResponse.json(projects, { headers: corsHeaders });
}
