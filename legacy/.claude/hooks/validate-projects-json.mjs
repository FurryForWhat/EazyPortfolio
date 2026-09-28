#!/usr/bin/env node
// PreToolUse hook — fires before every Bash call.
// Only acts when the command is a git commit AND the portfolio publisher's
// known tmp path has a projects.json sitting in it. Everything else passes
// through untouched (exit 0) so this never slows down unrelated Bash calls.

import fs from 'node:fs';
import { validateProjectsData } from '../../pipeline/lib/validate.mjs';

const PROJECTS_JSON_PATH = '/tmp/portfolio-publish/portfolio_tmp/projects.json';

function fail(reasons) {
  process.stderr.write(
    'projects.json failed validation — commit blocked:\n' +
    reasons.map((r) => `- ${r}`).join('\n') +
    '\nFix the offending field(s) in the merged data, then retry the commit.\n'
  );
  process.exit(2);
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let hookInput;
  try {
    hookInput = JSON.parse(input);
  } catch {
    process.exit(0); // malformed hook input — don't block on our own bug
  }

  const command = hookInput?.tool_input?.command || '';
  if (!/git\s+commit/i.test(command)) {
    process.exit(0); // not a commit, nothing to check yet
  }

  if (!fs.existsSync(PROJECTS_JSON_PATH)) {
    process.exit(0); // not the portfolio publish flow, don't interfere
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(PROJECTS_JSON_PATH, 'utf8'));
  } catch (e) {
    fail([`projects.json is not valid JSON: ${e.message}`]);
    return;
  }

  const { ok, errors } = validateProjectsData(data);
  if (!ok) {
    fail(errors);
  } else {
    process.exit(0);
  }
});
