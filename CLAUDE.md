# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## EazyPortfolio — Agent Pipeline Portfolio Generator

EazyPortfolio is a Claude Code agent pipeline that reads a developer's GitHub commit history and auto-generates a portfolio of case-study-style project cards. The pipeline is triggered by a single slash command: `/update-portfolio`.

Repository: `FurryForWhat/EazyPortfolio`

## Repository layout

| Directory | What it is |
|---|---|
| `EazyPortfolio/` | The Claude Code project: skills, subagent definitions, config, slides, and its own git history (deployed as a portfolio **source** repo) |
| `EazyPortfolio-web/` | Static portfolio webpage — fetches `projects.json` at runtime and renders project cards. Deployed to Vercel. |

The web directory and the pipeline directory are separate concerns: the pipeline writes `projects.json`, the webpage reads it. They share no build tooling.

## Stack

- **Claude Code** — Skills and subagents orchestrate the pipeline
- **GitHub CLI (`gh`)** — Lists repos; git handles clone/push
- **Vercel** — Hosts the generated portfolio page (`EazyPortfolio-web/`)
- **Marp** — Markdown-to-slides for the pitch deck in `EazyPortfolio/slides/`

## Architecture

The project has NO traditional build system or source code. It is built entirely on Claude Code's agent infrastructure.

### Pipeline stages (three subagents)

| Subagent | Model | Tools | Job |
|---|---|---|---|
| `github-fetcher` | Haiku | Bash, Read | Clone a repo, extract commit hotspots (top 5 files by commit count), README content, and repo metadata |
| `github-analyzer` | Sonnet | None | Reason about fetcher evidence → structured JSON entry (`problem_solved`, `how_i_solved_it`, tech stack, status). Pure reasoning — no tool access. |
| `portfolio-publisher` | Haiku | Bash, Read, Write | Clone portfolio repo, merge new entries into `projects.json`, commit + push. Called exactly once per orchestrator run. |

### Orchestrator

The `update-portfolio` skill (`EazyPortfolio/.claude/skills/update-portfolio/SKILL.md`) is the orchestrator. It:
1. Reads `.portfolio/config.json` for `github_username`, `portfolio_repo_url`, and `exclude_repos`
2. Lists the user's GitHub repos (skipping excluded ones and the portfolio repo itself)
3. Runs each repo through fetcher → analyzer in sequence (not parallel, to avoid `/tmp` collisions)
4. Calls publisher once with all analyzed projects

### Skills (defining contracts between agents)

| Skill file | Purpose |
|---|---|
| `EazyPortfolio/.claude/skills/update-portfolio/SKILL.md` | Orchestrator: sequences subagents, handles failures, reports results |
| `EazyPortfolio/.claude/skills/github-analyzer/SKILL.md` | Defines the analyzer's output schema, evidence rules (hotspot analysis, fallback to README-only), and hard rules (no vague summaries, 2-sentence caps) |
| `EazyPortfolio/.claude/skills/portfolio-page/SKILL.md` | Data contract for the webpage: sort order (`in_progress` first → then recency), field-to-UI mapping, status badge treatment, empty/loading/error states |

### Agent definitions

| Agent file | Defines |
|---|---|
| `EazyPortfolio/.claude/agents/github-fetcher.md` | Fetcher subagent: model, tools, output contract |
| `EazyPortfolio/.claude/agents/github-analyzer.md` | Analyzer subagent: model (Sonnet for reasoning), no tools, skill preloaded |
| `EazyPortfolio/.claude/agents/portfolio-publisher.md` | Publisher subagent: model, tools, exact step-by-step procedure (clone → merge → write → commit → push → cleanup) |

### Data flow

```
User's GitHub repos
  → github-fetcher (per repo: raw JSON of hotspots + README + metadata)
  → github-analyzer (per repo: structured portfolio entry JSON)
  → orchestrator collects all entries
  → portfolio-publisher (merges into EazyPortfolio-web/projects.json, git pushes)
  → Vercel deploys EazyPortfolio-web/
```

### Data model (projects.json)

Each portfolio entry:
- `id` — kebab-case repo name
- `title`, `summary`, `repo_url`
- `tech_stack` — array of strings, ordered by relevance (not alphabetical)
- `problem_solved` — one specific, concrete technical difficulty (2 sentences max, never "various bugs")
- `how_i_solved_it` — resolution grounded in commit evidence (2 sentences max)
- `status` — `in_progress` | `completed` | `archived`
- `last_updated` — ISO 8601
- `demo_url` — string or null
- `evidence_level` — `commit_history` (≥10 commits with hotspots) or `readme_only` (fallback)

Root-level: `last_synced` (ISO 8601), `projects` (array).

`projects.json` is the single source of truth — the webpage reads nothing else.

### Config

`EazyPortfolio/.portfolio/config.json`:
```json
{
  "github_username": "FurryForWhat",
  "portfolio_repo_url": "https://github.com/FurryForWhat/EazyPortfolio.git",
  "exclude_repos": []
}
```

If any value starts with `REPLACE_WITH_`, the orchestrator must stop and tell the user to fill in real values.

## The webpage (`EazyPortfolio-web/`)

Single static HTML file (`index.html`) with inline CSS + JS. Fetches `projects.json` at runtime — no hardcoded project data. Key behaviors:
- Sort: `in_progress` first, then by `last_updated` descending
- Tech stack → pill/badge elements (not comma-separated)
- `problem_solved` + `how_i_solved_it` → CH:/RES: split-panel layout (the page's signature element)
- `demo_url` null → omit element entirely (no disabled button)
- `evidence_level: readme_only` → subtle low-emphasis marker, never a warning
- States: loading spinner, empty message ("No projects yet — run `/update-portfolio`"), error with retry button
- Single page only — no routing/pagination

## Commands

### Slides (Marp)

From the `EazyPortfolio/` directory:
```bash
# Preview slides while editing
npx @marp-team/marp-cli slides/pitch.md --preview

# Export slides to HTML
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.html

# Export slides to PDF
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.pdf
```

### Portfolio pipeline

Run inside Claude Code (requires `gh` CLI authenticated):
```
/update-portfolio
```

The pipeline expects git push credentials (SSH or HTTPS) already configured in the environment — it does not handle auth setup.

## Conventions

- The pipeline does not generate boilerplate from scratch — Claude Code writes the code, developers write the rules (skills).
- Model selection is deliberate: reasoning (Sonnet) only on the analysis stage; speed (Haiku) on fetch and publish.
- Every portfolio entry must be grounded in commit evidence. When evidence is missing, the analyzer skill defines fallback (`evidence_level: readme_only`) — never hallucinate.
- `projects.json` is the single source of truth; the portfolio UI reads it and nothing else.
- Repos are processed sequentially, not in parallel — to keep temp clone directories from colliding.
- One bad repo should never stop the whole pipeline run — skip it, note it, continue.
- The publisher runs exactly once per orchestrator run, after all repos are processed.
- Never hardcode project data into `index.html`.
