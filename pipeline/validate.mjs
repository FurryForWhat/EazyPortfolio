const REQUIRED_ENTRY_FIELDS = [
  'id', 'title', 'summary', 'repo_url', 'tech_stack',
  'problem_solved', 'how_i_solved_it', 'status',
  'last_updated', 'evidence_level',
];

const VALID_STATUSES = ['in_progress', 'completed', 'archived'];
const VALID_EVIDENCE_LEVELS = ['commit_history', 'readme_only'];

export function validateEntry(entry) {
  const errors = [];

  for (const field of REQUIRED_ENTRY_FIELDS) {
    if (!(field in entry) || entry[field] === null || entry[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (entry.id && typeof entry.id !== 'string') {
    errors.push('"id" must be a string');
  }

  if (entry.tech_stack && !Array.isArray(entry.tech_stack)) {
    errors.push('"tech_stack" must be an array');
  } else if (Array.isArray(entry.tech_stack)) {
    for (const t of entry.tech_stack) {
      if (typeof t !== 'string') {
        errors.push('Each "tech_stack" element must be a string');
        break;
      }
    }
  }

  if (entry.status && !VALID_STATUSES.includes(entry.status)) {
    errors.push(`Invalid status: "${entry.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (entry.evidence_level && !VALID_EVIDENCE_LEVELS.includes(entry.evidence_level)) {
    errors.push(`Invalid evidence_level: "${entry.evidence_level}". Must be one of: ${VALID_EVIDENCE_LEVELS.join(', ')}`);
  }

  if (entry.demo_url !== undefined && entry.demo_url !== null && typeof entry.demo_url !== 'string') {
    errors.push('"demo_url" must be a string or null');
  }

  return { ok: errors.length === 0, errors };
}

export function validateProjectsData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['Root data must be an object'] };
  }

  if (!Array.isArray(data.projects)) {
    errors.push('Missing or invalid "projects" array at root level');
    return { ok: false, errors };
  }

  for (let i = 0; i < data.projects.length; i++) {
    const entry = data.projects[i];
    const prefix = `projects[${i}]`;
    const result = validateEntry(entry);
    for (const e of result.errors) {
      errors.push(`${prefix}: ${e}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
