<!-- Open-issues template. Copied from team-02/ch-5/issues-template.md, filled.
     Updated in Chapter 6: all five are fixed, closed, and verified live. -->

# Issues — EazyPortfolio

User feedback → GitHub issues. Each real problem was filed as an issue in the repo, then
listed here. **All five were fixed and closed in Chapter 6** (fix commit `ada8d43`,
deployed to `eazy-portfolio-eight.vercel.app`).

| # | Issue title | GitHub link | From (user/feedback) | Priority | Status |
|---|---|---|---|---|---|
| 1 | Deselected repos remain on the portfolio after a new sync | https://github.com/FurryForWhat/EazyPortfolio/issues/1 | Own QA on the live deployment | high | Closed |
| 2 | Runs stuck in fetching/analyzing forever when the background task dies | https://github.com/FurryForWhat/EazyPortfolio/issues/2 | Own QA on the live deployment | medium | Closed |
| 3 | Custom domains are stored but never verified or routed | https://github.com/FurryForWhat/EazyPortfolio/issues/3 | Own QA on the live deployment | medium | Closed |
| 4 | GET /api/export/[username] returns [] to public visitors under RLS | https://github.com/FurryForWhat/EazyPortfolio/issues/4 | Own QA on the live deployment | medium | Closed |
| 5 | Access-Control-Allow-Origin: * applied to every route, including authed API routes | https://github.com/FurryForWhat/EazyPortfolio/issues/5 | Own QA on the live deployment | low | Closed |

## How each one was closed

- **#1** — `POST /api/sync` writes a full selection snapshot: repos in `repoSelections`
  become `included: true`, every other `selected_repos` row for that profile becomes
  `included: false`, and a failed write returns an error instead of half-applying.
  Verified live: a deselected repo disappears from `/{username}` and the JSON export.
- **#2** — `GET /api/status/[runId]` reaps non-terminal runs older than
  `RUN_STALE_MINUTES` (default 30) to `failed` + `finished_at`; the progress page polls
  that route, so every visitor sees the same terminal state. Verified live with an
  intentionally stale run.
- **#3** — the unverified surface was removed rather than shipped half-done: the
  custom-domain input is gone from the dashboard and `customDomain` is no longer accepted
  by `POST /api/sync`. The `custom_domains` table stays in the schema for a future
  implementation that verifies DNS and routes hosts as one unit.
- **#4** — the export route now uses the service-role key (server-side only) and calls
  `fetchPortfolioProjects()`, the same source of truth as the public page. Verified live:
  an anonymous `GET /api/export/{username}` matches the rendered cards.
- **#5** — global `headers()` CORS removed from `next.config.ts`; the wildcard lives only
  on the public, embeddable export route. Verified live: authed routes send no
  `Access-Control-Allow-Origin`, `/api/export/{username}` still sends `*`.

## Notes

All five were found by reading the code and probing the live deployment, not by a
user report — treat "From" as "surfaced during pre-submission QA of
`eazy-portfolio-eight.vercel.app`".

Regression coverage lives in `tests/e2e.mjs` (Playwright): selection snapshot, stale-run
reaping, export parity with the page, deselected-repo exclusion, CORS shape, and a
console-error check on every page.
