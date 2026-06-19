---
name: github-analyzer
description: Analyzes a single GitHub repository and produces a structured project summary entry for a personal portfolio (problem solved, how it was solved, tech stack, status). Use this skill whenever the analyzer subagent needs to turn raw repo data — README, repo metadata, commit hotspots, and commit messages — into a standardized JSON entry. Always consult this skill before writing problem_solved or how_i_solved_it; never invent these fields from the README alone. Evidence must come from commit history, not guesswork.
---

# GitHub Repo Analyzer

## Purpose

Turn raw data about one GitHub repo into one JSON object matching the portfolio's `projects.json` schema. The output is consumed directly by a portfolio webpage, so it must be consistent, evidence-based, and free of filler language.

## Required inputs

The orchestrator passes this subagent:

1. `readme_content` — raw text of the repo's README (may be empty)
2. `repo_metadata` — name, url, created_at, last_pushed_at, primary_language
3. `hotspot_files` — top 5 files ranked by commit count, e.g. `[{"path": "PaymentService.java", "commits": 14}, ...]`
4. `hotspot_commit_messages` — for each hotspot file, the list of commit messages that touched it, in chronological order

If `hotspot_files` is missing or empty (e.g. repo has fewer than 10 total commits), fall back to README-only analysis and set `"evidence_level": "readme_only"` in the output. Otherwise set `"evidence_level": "commit_history"`.

## Process

1. **Read the README** for the stated purpose, tech stack, and any setup instructions. This gives you the *what*.
2. **Scan hotspot files and their commit messages** for the *what went wrong and how it was fixed*. Look for patterns:
   - Repeated "fix", "bug", "revert", "workaround" → indicates a genuine struggle in that area
   - A messy sequence followed by a "refactor" or "rewrite" commit → indicates a design problem that got resolved
   - Steadily incrementing feature commits with no fix/revert pattern → this file is just actively developed, not necessarily a problem area. Don't force a struggle narrative onto it.
3. **Pick the single most evidenced struggle** across all hotspot files — don't try to summarize every hotspot. One well-evidenced problem beats five vague ones.
4. **Write `problem_solved`** as the specific technical difficulty, named concretely (e.g. "currency rounding errors when converting between THB and MMK minor units" — not "had some bugs with payments").
5. **Write `how_i_solved_it`** as the resolution implied by the commit sequence (e.g. "introduced a dedicated Money value object with explicit minor-unit conversion after three rounding-related fixes").
6. **Determine `status`**: `"in_progress"` if `last_pushed_at` is within 30 days, `"completed"` if README states it / repo has a stable tag, `"archived"` otherwise.

## Output format

Return exactly this JSON shape, nothing else:

```json
{
  "id": "kebab-case-repo-name",
  "title": "Human Readable Title",
  "repo_url": "https://github.com/...",
  "summary": "Two sentences max, plain language, no marketing tone.",
  "tech_stack": ["Java 21", "Spring Boot 3", "PostgreSQL"],
  "problem_solved": "One specific, concrete technical difficulty.",
  "how_i_solved_it": "One specific resolution, grounded in commit evidence.",
  "status": "in_progress | completed | archived",
  "last_updated": "ISO 8601 date",
  "demo_url": "string or null",
  "evidence_level": "commit_history | readme_only"
}
```

## Hard rules

- Never write "various bugs" or "some issues" — name the specific thing that was wrong.
- Never fabricate a struggle if the hotspot data doesn't support one. It's fine for `problem_solved` to describe a design decision rather than a bug if that's what the evidence shows.
- `summary` and `problem_solved` and `how_i_solved_it` are each capped at 2 sentences.
- If `tech_stack` can't be confidently determined from README or repo language metadata, omit uncertain entries rather than guessing.
- Output valid JSON only — no markdown fences, no commentary, no preamble.