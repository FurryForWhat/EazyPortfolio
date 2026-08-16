import fs from 'node:fs';
import { validateProjectsData } from './validate.mjs';

export function mergeProject(existingData, newEntry) {
  const data = existingData && Array.isArray(existingData.projects)
    ? existingData
    : { last_synced: null, projects: [] };

  const idx = data.projects.findIndex((p) => p.id === newEntry.id);
  if (idx >= 0) {
    data.projects[idx] = newEntry;
  } else {
    data.projects.push(newEntry);
  }
  data.last_synced = new Date().toISOString();
  return data;
}

/**
 * Merges, validates against the shared schema, and only writes to disk if
 * valid. Throws with the full error list otherwise — mirrors the guarantee
 * the PreToolUse hook gives inside Claude Code, but as a normal function
 * call now that there's no Claude Code session to hook into.
 */
export function publish(projectsJsonPath, existingData, newEntry) {
  const merged = mergeProject(existingData, newEntry);
  const { ok, errors } = validateProjectsData(merged);
  if (!ok) {
    throw new Error('projects.json failed validation, not writing:\n' + errors.map((e) => `- ${e}`).join('\n'));
  }
  fs.writeFileSync(projectsJsonPath, JSON.stringify(merged, null, 2));
  return merged;
}
