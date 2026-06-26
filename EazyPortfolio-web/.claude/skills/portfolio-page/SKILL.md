---
name: portfolio-page
description: Defines how the portfolio webpage must read and render entries from projects.json — field mapping, sort order, status handling, and edge cases. Use this skill whenever building or editing the portfolio site's project-listing logic, whether scaffolding it the first time or modifying how a card renders. This is a data-contract skill, not a visual-design skill — for actual colors, type, and layout, also consult frontend-design.
---

# Portfolio Page Renderer

## Purpose

Make sure the webpage consumes `projects.json` consistently, so adding a new project to the JSON never requires touching the page's code. The page is a thin, dumb renderer over the data — all judgment calls about *what the data means* were already made upstream by the github-analyzer skill.

## Data source

Fetch `projects.json` at runtime via `fetch('/projects.json')` (or the deployed JSON endpoint). Do not hardcode any project data into the HTML/JS. Do not cache it beyond a single page load — Vercel's CDN caching is the right layer for that, not client-side storage.

## Sort order

Sort projects by this priority, in order:
1. `status === "in_progress"` first
2. then by `last_updated` descending (most recent first)

Rationale: visitors care most about what's actively being worked on, then about recency.

## Field-to-UI mapping

- `title` + `repo_url` → card heading, linked to the repo. Open in a new tab.
- `summary` → shown directly under the heading, always visible (not collapsed).
- `tech_stack` → rendered as small pill/badge elements, not a comma-separated sentence. Order as given; don't re-sort alphabetically (the analyzer may have ordered by relevance).
- `problem_solved` + `how_i_solved_it` → rendered as a two-part block, e.g. a "Challenge" label followed by `problem_solved`, then a "Resolution" label followed by `how_i_solved_it`. Keep these visually distinct from `summary` — they're the differentiator of this portfolio and shouldn't read as a third sentence of the same paragraph.
- `status` → small badge near the title. Suggested mapping: `in_progress` = active/in-motion treatment, `completed` = settled/done treatment, `archived` = muted/quiet treatment. Don't use literal traffic-light red/yellow/green — pick treatment consistent with the page's actual palette.
- `last_updated` → format as relative time ("3 days ago", "2 months ago"), not raw ISO string.
- `demo_url` → if present, render a "View demo" link/button. If `null`, omit the element entirely — do not render a disabled button or placeholder.
- `evidence_level` → not displayed prominently. If `"readme_only"`, optionally show a subtle, low-emphasis marker (e.g. a small dot with a tooltip) — never a label that reads as a warning or apology.

## Page-level rules

- `last_synced` (root of the JSON) → show once near the top or footer of the page, e.g. "Portfolio last synced 4 hours ago." This is the only place sync mechanics are mentioned; individual cards should never explain *how* they got their data.
- Empty state: if `projects` is an empty array, the page must still render cleanly with a clear, in-voice empty message — never a blank page or a console error visible to the visitor.
- This is a single page. Don't introduce routing/pagination unless the project count makes the page unusably long (a real threshold, not a guess — revisit only if it actually happens).

## Hard rules

- Never invent or display fields that aren't in the schema (no fake star counts, no fake contributor avatars) unless those are added to `projects.json` upstream first.
- Never block rendering on a slow or failed fetch — show a loading state, then a clear error state with a retry option if the fetch fails, rather than a stuck spinner.
- For the actual visual identity (palette, type, layout, the page's "signature" element) — that's a separate design pass. Consult the frontend-design skill before writing the visual layer; don't default to a generic card-grid-on-white-background template.