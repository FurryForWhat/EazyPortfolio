# AGENTS.md

## Architecture

**No build system.** This is a Claude Code agent pipeline (skills + agents), not source code.

Two directories with separate concerns:
- `EazyPortfolio/` — Pipeline source (skills, agents, config, slides). Deployed as a **source** repo.
- `EazyPortfolio-web/` — Static portfolio site. Single `index.html` with inline CSS+JS. Fetches `projects.json` at runtime. Deployed to Vercel.

The pipeline writes `projects.json`; the webpage reads it. They share no tooling.

## Commands

### Portfolio pipeline (Claude Code slash command)

```
/update-portfolio                     # Process all repos
/update-portfolio <repo-url>          # Process single repo
```

**Not an npm script.** Runs inside Claude Code, orchestrated via the `update-portfolio` skill (`EazyPortfolio/.claude/skills/update-portfolio/SKILL.md`). Requires `gh` CLI authenticated + git push credentials configured.

### Slides (Marp)

From the root directory:
```bash
npx @marp-team/marp-cli slides/pitch.md --preview   # Live preview
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.html
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.pdf
```

### Local web preview

```bash
cd EazyPortfolio-web && python3 -m http.server 3000
```

## Pipeline stages

Sequential (not parallel) to avoid `/tmp` clone directory collisions:

| Stage | Model | Tools | Job |
|---|---|---|---|
| **github-fetcher** | Haiku | Bash, Read | Clone repo → extract top 5 hotspot files (by commit count) + README + metadata |
| **github-analyzer** | Sonnet | None | Reason about evidence → structured JSON entry. Pure reasoning, no tools. Skill preloaded: `github-analyzer` |
| **portfolio-publisher** | Haiku | Bash, Read, Write | Merge all entries into `projects.json`, commit + push. Runs **once** after all repos. |

One bad repo never stops the pipeline — skip it, note it, continue.

## Data model

`projects.json` is the single source of truth. Webpage reads nothing else.

Required fields per entry:
- `id` — kebab-case repo name
- `title`, `summary`, `repo_url`
- `tech_stack` — array, ordered by relevance (never alphabetical)
- `problem_solved` — one specific technical difficulty (2 sentences max, never "various bugs")
- `how_i_solved_it` — resolution grounded in commit evidence (2 sentences max)
- `status` — `in_progress` | `completed` | `archived`
- `last_updated` — ISO 8601
- `demo_url` — string or null
- `evidence_level` — `commit_history` (≥10 commits with hotspots) or `readme_only` (fallback)

Root-level: `last_synced` (ISO 8601), `projects` (array).

## Webpage rendering

`EazyPortfolio-web/index.html` — single static file, no routing.

- Sort: `in_progress` first, then by `last_updated` descending
- `tech_stack` → pill/badge elements (not comma-separated)
- `problem_solved` + `how_i_solved_it` → CH:/RES: split-panel layout
- `demo_url: null` → omit element entirely (no disabled button)
- `evidence_level: readme_only` → subtle marker, never a warning
- States: loading spinner, empty message, error with retry button

**Never hardcode project data into `index.html`.**

## Critical rules

- **Evidence-based only.** Every `problem_solved` and `how_i_solved_it` must come from commit history, not README paraphrasing. Thin evidence → `evidence_level: readme_only`. Never hallucinate.
- **Config validation.** If `.portfolio/config.json` contains `REPLACE_WITH_` placeholders, stop and ask the user to fill them in.
- **Sequential processing.** One repo at a time — prevents temp directory collisions.
- **Publisher runs once.** After all repos are analyzed, merges and pushes.
- **Solo vs team framing.** Analyzer checks contributor counts; team contributions are framed differently.
- **Model selection is deliberate.** Sonnet only for analysis (reasoning); Haiku for fetch/publish (speed).

## Config

`.portfolio/config.json` (tracked in gitignore, template at `.portfolio/config.template.json`):
```json
{
  "github_username": "FurryForWhat",
  "portfolio_repo_url": "https://github.com/FurryForWhat/EazyPortfolio.git",
  "exclude_repos": []
}
```

First-time setup:
```bash
cp EazyPortfolio/.portfolio/config.template.json EazyPortfolio/.portfolio/config.json
cp EazyPortfolio-web/projects.template.json EazyPortfolio-web/projects.json
```

## V2 — Self-serve SaaS (in progress)

A rewritten version that removes Claude Code dependency entirely. Any GitHub user can sign up, select repos, and get a live portfolio.

| Directory | Purpose |
|---|---|
| `web/app/` | Next.js App Router — landing, dashboard, auth, public portfolio pages |
| `api/` | Vercel serverless functions — OAuth callback, sync trigger, status polling |
| `pipeline/` | Framework-agnostic core logic — fetcher (GitHub REST), analyzer (Anthropic API), publisher (Supabase) |
| `supabase/migrations/` | PostgreSQL schema — profiles, selected_repos, runs, project_entries, custom_domains |
| `.env.example` | Required env vars |

### Data flow (v2)

```
User signs in via GitHub OAuth → profile created in Supabase
  → selects repos on dashboard → POST /api/sync
  → orchestrator sequences: fetch (GitHub REST) → analyze (Anthropic Messages API) → publish (Supabase)
  → status polled via GET /api/status/:runId
  → rendered at eazyportfolio.dev/{username} or custom domain
```

### Key differences from v1 (Claude Code pipeline)

- No `/update-portfolio` slash command — replaced by web UI + serverless API
- `git clone` replaced by GitHub REST API (`/repos/{owner}/{repo}/commits`)
- Claude Code subagents replaced by direct Anthropic Messages API calls
- `projects.json` in git replaced by Supabase `project_entries` table
- Portfolio hosted on your platform (or user's own hosting with embedded data)

### Running locally (v2)

```bash
npm install
cp .env.example .env          # fill in SUPABASE, GITHUB_TOKEN, ANTHROPIC_API_KEY
npx supabase start            # optional: local Supabase for dev
npm run dev                   # http://localhost:3000
```

See `.env.example` for all required variables.
