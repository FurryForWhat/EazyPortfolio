# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## EazyPortfolio — Agent Pipeline Portfolio Generator

EazyPortfolio is a Claude Code agent pipeline that reads a developer's GitHub commit history and auto-generates a portfolio of case-study-style project cards. The pipeline is triggered by a single slash command: `/update-portfolio`.

Repository: `FurryForWhat/EazyPortfolio`

## Stack

- **Claude Code** — Skills and subagents orchestrate the pipeline
- **GitHub CLI (`gh`)** — Lists repos; git handles clone/push
- **Vercel** — Hosts the generated portfolio page
- **Marp** — Markdown-to-slides for the pitch deck in `slides/`

## Architecture

The project has NO traditional code (no build system, no source files, no tests). It is built entirely on Claude Code's agent infrastructure:

### Pipeline stages (three subagents)

| Subagent | Model | Job |
|---|---|---|
| `github-fetcher` | Haiku | Clone repo, extract commit hotspots and README |
| `github-analyzer` | Sonnet | Reason about evidence from commits → structured JSON |
| `portfolio-publisher` | Haiku | Merge new JSON entries and git push |

### Key files (to be created as the project evolves)

- **Skills** — `github-analyzer.skill.md` defines the contract between agents: where to look (commit hotspots), what counts as a real problem, field length limits, fallback when evidence is missing
- **GitHub CLI** — `gh repo list` for repo discovery; git handles clone/push
- **Output** — `projects.json` is the single source of truth for portfolio data; the portfolio webpage reads from it

### Data model

Each portfolio entry captures:
- `problem_solved` — a concrete technical difficulty grounded in commit evidence
- `how_i_solved_it` — resolution tied to specific commits

The goal is case-study depth, not README paraphrasing.

## Commands

### Slides (Marp)

```bash
# Preview slides while editing (requires Marp CLI or VS Code extension)
npx @marp-team/marp-cli slides/pitch.md --preview

# Export slides to HTML
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.html

# Export slides to PDF
npx @marp-team/marp-cli slides/pitch.md -o slides/pitch.pdf
```

### Portfolio pipeline

```bash
# The single entry point — run inside Claude Code
/update-portfolio
```

## Conventions

- The pipeline does not generate boilerplate from scratch — Claude Code writes the code, the developer writes the rules (skills).
- Model selection is deliberate: reasoning (Sonnet) only on the analysis stage; speed (Haiku) on fetch and publish.
- Every portfolio entry must be grounded in commit evidence. When evidence is missing, the skill defines fallback behavior — never hallucinate.
- `projects.json` is the single source of truth; the portfolio UI reads it and nothing else.
