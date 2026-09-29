<!-- Open-issues template. Copied from team-02/ch-5/issues-template.md, filled. -->

# Open Issues — EazyPortfolio

User feedback → GitHub issues. Each real problem was filed as an issue in the repo,
then listed here. (These are what get closed in Chapter 6.)

| # | Issue title | GitHub link | From (user/feedback) | Priority |
|---|---|---|---|---|
| 1 | Deselected repos remain on the portfolio after a new sync | https://github.com/FurryForWhat/EazyPortfolio/issues/1 | Own QA on the live deployment | high |
| 2 | Runs stuck in fetching/analyzing forever when the background task dies | https://github.com/FurryForWhat/EazyPortfolio/issues/2 | Own QA on the live deployment | medium |
| 3 | Custom domains are stored but never verified or routed | https://github.com/FurryForWhat/EazyPortfolio/issues/3 | Own QA on the live deployment | medium |
| 4 | GET /api/export/[username] returns [] to public visitors under RLS | https://github.com/FurryForWhat/EazyPortfolio/issues/4 | Own QA on the live deployment | medium |
| 5 | Access-Control-Allow-Origin: * applied to every route, including authed API routes | https://github.com/FurryForWhat/EazyPortfolio/issues/5 | Own QA on the live deployment | low |

## Notes

All five were found by reading the code and probing the live deployment, not by a
user report — treat "From" as "surfaced during pre-submission QA of
`eazy-portfolio-eight.vercel.app`".

Triage:

- **#1 is the only one a user hits by doing a normal thing** (uncheck a repo, regenerate)
  and it silently shows a project they removed. Highest impact, cheapest fix — the sync
  route upserts `included: true` and never writes `included: false`, while
  `lib/portfolio.ts` drives the public page off `included = true`.
- **#2 and #4 are both "the row says X but the truth is Y"** — a dead `after()` task
  leaves `status: fetching` forever, and `runs` RLS makes the public export route answer
  `[]` before it ever reaches `project_entries` (which *does* have a public read policy).
- **#3 is a promise the UI makes and the backend doesn't keep**: `custom_domains` gains a
  row with `verified: false` and nothing in the codebase ever flips it or maps a host.
- **#5 is deliberately last**: `*` is correct for `/api/export/[username]` (public
  embeddable feed) and wrong everywhere else. Fix is to move the header out of
  `next.config.ts` into that one route, which already builds its own `corsHeaders`.

Sequencing for Chapter 6: #1 → #4 → #2 → #3 → #5 (impact/effort order).
