import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { fetchPortfolioProjects } from "@/lib/portfolio";

// Anon key + RLS made this route answer `[]` to every public visitor: `runs`
// has no policy for auth.uid() IS NULL, so the "latest successful run" query
// returned zero rows before it ever reached `project_entries` (issue #4).
// The service-role key is read server-side only — never NEXT_PUBLIC — and is
// only ever used here to select this username's profile and project entries.
// Same pattern as app/[username]/page.tsx.
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

  // Identical source of truth to the public /{username} page: freshest entry
  // per currently-selected repo. Reusing fetchPortfolioProjects means the JSON
  // feed and the rendered page can never drift (a deselected repo disappears
  // from both), and a partial old run can't hide projects that later runs
  // already published.
  const projects = await fetchPortfolioProjects(supabase, profile.id);

  return NextResponse.json(projects, { headers: corsHeaders });
}
