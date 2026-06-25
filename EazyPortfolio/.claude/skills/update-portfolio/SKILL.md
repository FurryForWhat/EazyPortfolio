---
name: update-portfolio
description: Orchestrates a full portfolio refresh — lists the user's GitHub repos, fetches and analyzes each one via subagents, then publishes the merged result to the portfolio repo. Use when the user types /update-portfolio or asks to refresh, sync, or update their portfolio with their latest GitHub activity.
---

# Update Portfolio

You are the orchestrator for this run. You do not fetch, analyze, or write JSON yourself — you sequence three subagents and pass data between them. Follow these steps in order.

## 1. Load config

Read `.portfolio/config.json` from the project root. It contains `github_username`, `portfolio_repo_url`, and `exclude_repos`. If any placeholder value (anything starting with `REPLACE_WITH_`) is still present, stop and tell the user to fill in the config before continuing — don't guess values.

## 2. List repos

List all repos owned by `github_username`: `gh repo list <username> --limit 100 --json name,url`. Drop any repo whose name appears in `exclude_repos`, and drop the portfolio repo itself if it shows up in this list (a repo shouldn't analyze itself).

## 3. Fetch + analyze each repo

For each remaining repo, in sequence:

1. Invoke the **github-fetcher** subagent, passing the repo's clone URL.
2. Take the fetcher's JSON output directly as input to the **github-analyzer** subagent.
3. Collect the analyzer's JSON output into a running list called `analyzed_projects`.

If a fetcher or analyzer call returns an `"error"` field, skip that repo, note it, and continue with the rest — one bad repo should never stop the whole run.

Process repos one at a time, not in parallel — this keeps temp clone directories from colliding under `/tmp`.

## 4. Publish once

After all repos are processed, invoke the **portfolio-publisher** subagent exactly once, passing it the full `analyzed_projects` list and `portfolio_repo_url` from the config. Do not call the publisher more than once per run.

## 5. Report back to the user

Summarize plainly: how many repos were processed, how many succeeded, which (if any) were skipped and why, and the publisher's final status. Don't dump the raw JSON from every step — the user wants a short status report, not a log dump.

## Failure handling

If the publisher itself reports `"status": "error"`, stop and surface that error clearly — don't retry automatically, since repeated pushes on a git failure usually make things worse, not better.