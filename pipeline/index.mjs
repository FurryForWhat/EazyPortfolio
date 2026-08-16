#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fetchRepoEvidence } from './fetcher.mjs';
import { analyzeRepo } from './analyzer.mjs';
import { publish } from './publisher.mjs';

const PROJECTS_JSON = process.env.PROJECTS_JSON_PATH
  || path.resolve(process.cwd(), '../EazyPortfolio-web/projects.json');

async function main() {
  const repoArgs = process.argv.slice(2); // e.g. node index.mjs FurryForWhat/EazyPortfolio
  if (repoArgs.length === 0) {
    console.error('Usage: node index.mjs owner/repo [owner/repo ...]');
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

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
