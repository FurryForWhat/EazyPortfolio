# EazyPortfolio

An AI agent pipeline that reads your GitHub commit history and auto-generates a portfolio of case-study-style project cards — no manual write-ups, no copy-paste, no README paraphrasing.

## What it does

EazyPortfolio scans your GitHub repos and produces a structured `projects.json` where each entry answers two questions: **what went wrong** and **how you fixed it** — backed by actual commit evidence, not guesswork.

The pipeline has three stages:

1. **Fetcher** — clones a repo, finds the top 5 most-changed files (commit hotspots), and extracts their full commit message history
2. **Analyzer** — reasons about the evidence and produces one structured JSON entry per repo: problem solved, how it was solved, tech stack, status
3. **Publisher** — merges all entries into `projects.json` and pushes to the portfolio repo

The portfolio webpage (`EazyPortfolio-web/`) is a thin, dumb renderer — it fetches `projects.json` at runtime and renders cards with status badges, tech stack pills, and a challenge/resolution split-panel for each project. No hardcoded data, no manual updates.

## How to run it

### Prerequisites

- [Claude Code](https://claude.ai/code)
- [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)
- Git push credentials configured (SSH or HTTPS) for your portfolio repo
- A `.portfolio/config.json` with your GitHub username and portfolio repo URL

### Setup (first time)

Fork this repo, then copy the template files into place:

```bash
# User config — fill in your GitHub username and fork URL
cp EazyPortfolio/.portfolio/config.template.json EazyPortfolio/.portfolio/config.json

# Portfolio data — starts empty, the pipeline fills it
cp EazyPortfolio-web/projects.template.json EazyPortfolio-web/projects.json
```

Edit `EazyPortfolio/.portfolio/config.json` and replace the `REPLACE_WITH_` placeholders with your actual values.

### Config

In `EazyPortfolio/.portfolio/config.json`:

```json
{
  "github_username": "your-github-handle",
  "portfolio_repo_url": "https://github.com/your-handle/your-portfolio.git",
  "exclude_repos": ["repo-to-skip", "another-skip"]
}
```

**Important:** If any value starts with `REPLACE_WITH_`, the pipeline will stop and ask you to fill in real values — it won't guess.

### Run

Inside Claude Code, from the `EazyPortfolio/` directory:

```
/update-portfolio
```

You can also pass a single repo URL to process just that one:

```
/update-portfolio https://github.com/your-handle/specific-repo
```

The pipeline processes repos one at a time, skips failures gracefully, and reports a summary when done.

### View locally

```bash
cd EazyPortfolio-web
python3 -m http.server 3000
# open http://localhost:3000
```

### Deploy

The `EazyPortfolio-web/` directory is a static site. Deploy it anywhere — Vercel, GitHub Pages, Netlify, or just serve it from the repo.

## Project structure

```
EazyPortfolio/
├── .portfolio/config.json          # your GitHub config
├── .claude/
│   ├── skills/
│   │   ├── update-portfolio/       # orchestrator: sequences subagents
│   │   ├── github-analyzer/        # analyzer rules + schema
│   │   └── portfolio-page/         # webpage data contract
│   └── agents/
│       ├── github-fetcher.md       # Haiku — clone + extract evidence
│       ├── github-analyzer.md      # Sonnet — reason about evidence → JSON
│       └── portfolio-publisher.md  # Haiku — merge + commit + push
└── slides/pitch.md                 # Marp pitch deck

EazyPortfolio-web/
├── index.html                      # single-page portfolio renderer
└── projects.json                   # single source of truth (pipeline output)
```

## Conventions

- Every portfolio entry is grounded in commit evidence. When evidence is thin (< 10 commits), entries are marked `readme_only` and framed honestly as learning exercises — never faked as production engineering.
- The pipeline never stops on one bad repo — it skips, notes it, and continues.
- `projects.json` is the single source of truth; the webpage reads it and nothing else.
- Solo projects and team contributions are framed differently — the analyzer checks contributor counts before writing.
