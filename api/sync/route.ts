import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "../../../pipeline/index.mjs";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repoSelections?: string[]; customDomain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { repoSelections, customDomain } = body;

  if (!repoSelections || repoSelections.length === 0) {
    return NextResponse.json(
      { error: "No repos selected" },
      { status: 400 }
    );
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Save selected repos
  for (const repo of repoSelections) {
    const [owner, name] = repo.split("/");
    if (!owner || !name) continue;

    await supabase.from("selected_repos").upsert(
      {
        profile_id: profile.id,
        github_repo: repo,
        github_url: `https://github.com/${repo}`,
        included: true,
      },
      { onConflict: "profile_id,github_repo" }
    );
  }

  // Handle custom domain if provided
  if (customDomain) {
    await supabase.from("custom_domains").upsert(
      {
        profile_id: profile.id,
        domain: customDomain,
        verified: false,
      },
      { onConflict: "domain" }
    );
  }

  // Run orchestrator
  try {
    const result = await orchestrate({
      profileId: profile.id,
      username: profile.github_login,
      selectedRepos: repoSelections.map((r: string) => ({
        name: r,
        github_url: `https://github.com/${r}`,
      })),
    });

    return NextResponse.json({
      runId: result.runId,
      results: result.results,
      totalProcessed: result.totalProcessed,
      totalSucceeded: result.totalSucceeded,
      totalFailed: result.totalFailed,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("Orchestration failed:", error);
    return NextResponse.json(
      { error: "Pipeline failed", detail: error },
      { status: 500 }
    );
  }
}
