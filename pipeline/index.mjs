#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { fetchRepoEvidence } from './fetcher.mjs';
import { analyzeRepo } from './analyzer.mjs';
import { validateEntry } from './validate.mjs';
import { publish } from './publisher.mjs';

// Load environment variables from .env.local if available
try {
  const dotenv = await import('dotenv');
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
} catch (e) {
  // dotenv not available, proceed without it
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars (needed for orchestrate() to write runs/project_entries)');
  }
  // Service role client: orchestrate() is only ever called from an API route
  // that has already verified the user's session, so RLS is intentionally
  // bypassed here rather than re-authenticated per write.
  return createClient(url, key);
}

/**
 * Runs fetch -> analyze -> validate for each selected repo and writes
 * results into Supabase (runs, project_entries), matching the schema in
 * supabase/migrations/001_initial.sql and the shape app/api/sync/route.ts and
 * app/api/status/[runId]/route.ts expect back.
 *
 * @param {{ profileId: string, username: string, selectedRepos: { name: string, github_url?: string }[], githubToken?: string }} args
 */
export async function orchestrate({ profileId, username, selectedRepos, githubToken }) {
  if (!profileId || !username) throw new Error('orchestrate() requires profileId and username');
  if (!Array.isArray(selectedRepos) || selectedRepos.length === 0) {
    throw new Error('orchestrate() requires a non-empty selectedRepos array');
  }

  const supabase = getSupabase();
  // Prefer the calling user's own token (passed in from their stored
  // profile.github_access_token) — falls back to a shared server token only
  // for CLI/local testing, never for real per-user generation.
  const token = githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  const { data: run, error: runError } = await supabase
    .from('runs')
    .insert({ profile_id: profileId, username, status: 'fetching' })
    .select()
    .single();
  if (runError) throw new Error(`Failed to create run: ${runError.message}`);

  const runId = run.id;
  const results = [];
  let totalSucceeded = 0;
  let totalFailed = 0;

  for (const repo of selectedRepos) {
    const [owner, name] = (repo.name || '').split('/');
    if (!owner || !name) {
      results.push({ repo: repo.name, ok: false, error: 'Invalid repo format, expected "owner/repo"' });
      totalFailed++;
      continue;
    }

    try {
      await supabase.from('runs').update({ status: 'fetching' }).eq('id', runId);
      const evidence = await fetchRepoEvidence(owner, name, { token });

      await supabase.from('runs').update({ status: 'analyzing' }).eq('id', runId);
      const entry = await analyzeRepo(evidence);

      const { ok, errors } = validateEntry(entry);
      if (!ok) throw new Error(`Validation failed: ${errors.join('; ')}`);

      await supabase.from('runs').update({ status: 'publishing' }).eq('id', runId);
      const { error: insertError } = await supabase
        .from('project_entries')
        .insert({ run_id: runId, repo_name: repo.name, entry });
      if (insertError) throw new Error(`Failed to save entry: ${insertError.message}`);

      results.push({ repo: repo.name, ok: true, entry });
      totalSucceeded++;
    } catch (err) {
      results.push({ repo: repo.name, ok: false, error: err.message });
      totalFailed++;
    }
  }

  await supabase
    .from('runs')
    .update({
      status: totalSucceeded > 0 ? 'success' : 'failed',
      finished_at: new Date().toISOString(),
      error: totalFailed > 0 ? `${totalFailed} of ${selectedRepos.length} repo(s) failed` : null,
    })
    .eq('id', runId);

  return { runId, results, totalProcessed: selectedRepos.length, totalSucceeded, totalFailed };
}

// --- CLI entrypoint, only runs when this file is executed directly
// (e.g. `node pipeline/index.mjs owner/repo`) — NOT when imported by app/api/sync/route.ts.
// Writes to a local projects.json instead of Supabase, for local testing
// without needing a Supabase project configured.
async function main() {
  const PROJECTS_JSON = process.env.PROJECTS_JSON_PATH
    || path.resolve(process.cwd(), '../legacy/EazyPortfolio-web/projects.json');

  const repoArgs = process.argv.slice(2);
  if (repoArgs.length === 0) {
      console.error('Usage: node pipeline/index.mjs owner/repo [owner/repo ...]');
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  let existing = { last_synced: null, projects: [] };
  if (fs.existsSync(PROJECTS_JSON)) {
    existing = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'));
  }

  for (const arg of repoArgs) {
    const [owner, repo] = arg.split('/');
    if (!owner || !repo) {
      console.error(`Skipping "${arg}" — expected owner/repo`);
      continue;
    }
    console.log(`Fetching ${owner}/${repo}...`);
    const evidence = await fetchRepoEvidence(owner, repo, { token });
    console.log(`Analyzing ${owner}/${repo}...`);
    const entry = await analyzeRepo(evidence);
    console.log(`Publishing ${entry.id}...`);
    existing = publish(PROJECTS_JSON, existing, entry);
  }

  console.log(`Done — ${existing.projects.length} project(s) in ${PROJECTS_JSON}`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
