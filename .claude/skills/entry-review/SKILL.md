---
name: entry-review
description: Audit a single generated portfolio project entry against the evidence rules and pipeline/validate.mjs — schema validity, two-sentence caps, banned vague phrasing, contributor framing, and evidence_level humility. Use after a generation run, when the user asks whether an entry is accurate, or before publishing entries to the portfolio.
---

# Entry Review

You judge one entry. You do not regenerate it and you do not fetch new evidence — you report pass/fail with reasons and hand back a corrected version only if the user asks for one.

Input is one entry object (from `project_entries.entry`, or pasted JSON), optionally with its `repo_name` and `run_id`.

## 1. Schema check

Run the real validator rather than eyeballing it:

```bash
node -e "import('./pipeline/validate.mjs').then(m => { const e = JSON.parse(process.argv[1]); console.log(JSON.stringify(m.validateEntry(e), null, 2)); })" '<entry-json>'
```

Any `ok: false` is an automatic FAIL — stop here and report the exact error strings. `validateEntry` covers required fields, `tech_stack` being a string array, `status` ∈ `in_progress|completed|archived`, `evidence_level` ∈ `commit_history|readme_only`, and `demo_url` being string-or-null.

## 2. Evidence rules

Check each against AGENTS.md "Critical rules". Each is its own line in the output: PASS or FAIL with a quote.

- **No "various bugs".** `problem_solved` must name one specific technical difficulty. Banned filler: "various bugs", "several issues", "multiple challenges", "complex problems", "a number of edge cases".
- **Two-sentence caps.** `problem_solved` and `how_i_solved_it` are each ≤ 2 sentences. Count sentence-ending punctuation, not words.
- **`how_i_solved_it` must be a resolution.** It has to state what changed and what that fixed — a restatement of the problem is a FAIL.
- **Evidence level honesty.** `readme_only` means thin evidence: frame the problem as a learning challenge and the solution as a study method. A `readme_only` entry claiming a deep production fix is a FAIL. `commit_history` requires ≥ 10 commits with usable hotspots.
- **Contributor framing.** If the source had multiple contributors, the entry must not read as a solo build ("I built", "my architecture"). Team entries describe what was delivered. Solo entries may use first person.
- **Tech stack ordering.** Array ordered by relevance, never alphabetical — an alphabetized list (e.g. `["CSS","HTML","JavaScript"]`) is a FAIL.
- **Concrete fields.** `id` is kebab-case repo name; `repo_url` matches the source; `last_updated` is ISO 8601; `demo_url` is a real URL or `null`, never `"null"`, `""`, or a placeholder.

## 3. Report

Output a flat checklist, then a verdict line:

```
schema          PASS
vague-phrasing  FAIL  problem_solved contains "various bugs"
sentence-caps   PASS  (1 sentence / 2 sentences)
resolution      PASS
evidence-level  PASS  commit_history
contributors    PASS  solo, 1 contributor
tech-stack      PASS  relevance-ordered
fields          FAIL  demo_url is "" (should be null)
VERDICT: FAIL (2 of 8)
```

Follow with one short paragraph naming the two highest-impact fixes. Do not rewrite the entry unless asked.

## Hard rules

- Never soften a FAIL to PASS because the entry "reads well".
- Never invent commit evidence to justify an `evidence_level` upgrade — if you have not seen the commit data, say the level is unverified rather than asserting it.
- If you are given an entry but no evidence to check it against, you may verify schema and the mechanical rules (caps, banned phrases, field shapes) but must mark the evidence-dependent rules `UNVERIFIED`.
