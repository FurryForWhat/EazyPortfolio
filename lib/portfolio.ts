import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Portfolio contents for a profile: for each repo the user currently has
 * selected, the most recent entry generated for it (from any run).
 *
 * Reading "the latest successful run wholesale" drops every project in that
 * run whenever one repo fails a sync (GitHub rate limit, transient API error,
 * malformed entry) — the rest of the portfolio disappears until the next clean
 * run. Per-repo freshest keeps untouched projects in place; the failed repo
 * simply holds its previous entry until it succeeds again. Deselected repos
 * fall out because the query is driven by selected_repos.
 */
export async function fetchPortfolioProjects(
  supabase: SupabaseClient,
  profileId: string
): Promise<Record<string, unknown>[]> {
  const { data: selected } = await supabase
    .from("selected_repos")
    .select("github_repo")
    .eq("profile_id", profileId)
    .eq("included", true);

  const repoNames = (selected ?? []).map((s) => s.github_repo);
  if (repoNames.length === 0) return [];

  const { data: rows } = await supabase
    .from("project_entries")
    .select("repo_name, created_at, entry, runs!inner(profile_id)")
    .eq("runs.profile_id", profileId)
    .in("repo_name", repoNames)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const projects: Record<string, unknown>[] = [];
  for (const row of rows ?? []) {
    if (seen.has(row.repo_name)) continue;
    seen.add(row.repo_name);
    projects.push(row.entry as Record<string, unknown>);
  }
  return projects;
}
