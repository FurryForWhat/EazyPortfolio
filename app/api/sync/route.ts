import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { orchestrate } from "../../../pipeline/index.mjs";

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

export async function POST(req: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repoSelections?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { repoSelections } = body;

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
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  // Save the selection as a full snapshot, not an append-only list: repos
  // currently checked are upserted with included=true, and every other row
  // this profile ever wrote is flipped to included=false. Without the second
  // half, unchecking a repo never reached the database and the project stayed
  // on the public portfolio forever (issue #1).
  const selectedSet = new Set(repoSelections);
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

  const { data: previouslyIncluded } = await supabase
    .from("selected_repos")
    .select("github_repo")
    .eq("profile_id", profile.id)
    .eq("included", true);

  const deselected = (previouslyIncluded ?? [])
    .map((r) => r.github_repo)
    .filter((repo) => !selectedSet.has(repo));

  if (deselected.length > 0) {
    const { error: deselectError } = await supabase
      .from("selected_repos")
      .update({ included: false })
      .eq("profile_id", profile.id)
      .in("github_repo", deselected);
    if (deselectError) {
      return NextResponse.json(
        { error: "Failed to update repo selection", detail: deselectError.message },
        { status: 500 }
      );
    }
  }

  // Create the run row up-front so the browser can navigate to
  // /generate/[runId] and start polling before any repo is processed.
  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({ profile_id: profile.id, username: profile.github_login, status: "pending" })
    .select()
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: "Failed to create run", detail: runError?.message },
      { status: 500 }
    );
  }

  // Kick off generation after the response is sent — the request returns
  // in milliseconds instead of blocking for the full pipeline run.
  const selected = repoSelections.map((r) => ({
    name: r,
    github_url: `https://github.com/${r}`,
  }));
  const runId = run.id;
  const profileId = profile.id;
  const username = profile.github_login;
  const githubToken = profile.github_access_token;

  after(async () => {
    try {
      const result = await orchestrate({
        profileId,
        username,
        selectedRepos: selected,
        githubToken,
        runId,
      });
      console.log(
        `[sync] run ${runId} finished: ${result.totalSucceeded}/${result.totalProcessed} ok`
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[sync] run ${runId} failed:`, detail);
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin
        .from("runs")
        .update({
          status: "failed",
          error: detail,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  });

  return NextResponse.json({ runId });
}
