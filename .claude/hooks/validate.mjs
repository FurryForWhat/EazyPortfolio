const VALID_STATUS = ['in_progress', 'completed', 'archived'];
const VALID_EVIDENCE = ['commit_history', 'readme_only'];
const REQUIRED_FIELDS = [
  'id', 'title', 'repo_url', 'summary', 'tech_stack',
  'problem_solved', 'how_i_solved_it', 'status',
  'last_updated', 'evidence_level',
];

function countSentences(str) {
  return (str.match(/[.!?](\s|$)/g) || []).length;
}

/**
 * Validates the full { last_synced, projects: [...] } shape against the
 * schema documented in .claude/skills/github-analyzer/SKILL.md.
 * Returns { ok, errors } — never throws.
 */
export function validateProjectsData(data) {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.projects)) {
    return { ok: false, errors: ['Root object must have a "projects" array.'] };
  }

  const errors = [];
  const seenIds = new Set();

  data.projects.forEach((p, i) => {
    const where = `projects[${i}] (id: ${p?.id ?? 'unknown'})`;

    for (const field of REQUIRED_FIELDS) {
      if (p[field] === undefined || p[field] === null || p[field] === '') {
        errors.push(`${where}: missing required field "${field}"`);
      }
    }

    if (p.id) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) errors.push(`${where}: id must be kebab-case`);
      if (seenIds.has(p.id)) errors.push(`${where}: duplicate id`);
      seenIds.add(p.id);
    }

    if (p.repo_url && !/^https:\/\/github\.com\//.test(p.repo_url)) {
      errors.push(`${where}: repo_url must be a github.com URL`);
    }
    if (p.status && !VALID_STATUS.includes(p.status)) {
      errors.push(`${where}: status "${p.status}" not one of ${VALID_STATUS.join(', ')}`);
    }
    if (p.evidence_level && !VALID_EVIDENCE.includes(p.evidence_level)) {
      errors.push(`${where}: evidence_level "${p.evidence_level}" not one of ${VALID_EVIDENCE.join(', ')}`);
    }
    if (p.last_updated && isNaN(Date.parse(p.last_updated))) {
      errors.push(`${where}: last_updated is not a valid date`);
    }
    if (p.tech_stack !== undefined && !Array.isArray(p.tech_stack)) {
      errors.push(`${where}: tech_stack must be an array`);
    }
    for (const field of ['summary', 'problem_solved', 'how_i_solved_it']) {
      const val = p[field];
      if (typeof val === 'string') {
        if (countSentences(val) > 2) errors.push(`${where}: "${field}" exceeds the 2-sentence limit`);
        if (val.includes('`')) errors.push(`${where}: "${field}" contains a stray backtick`);
      }
    }
  });

  return { ok: errors.length === 0, errors };
}
