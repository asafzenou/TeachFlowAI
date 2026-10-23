import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';
export function sourcesForStep(
  sources,
  step,
  maxChars = appConfig.lesson.maxSourceContextCharacters
) {
  const ids = new Set(step.sourceIds);
  const found = sources.filter((source) => ids.has(source.id));
  if (found.length !== ids.size) {
    throw new ApiError(
      422,
      'INVALID_PLAN_SOURCES',
      'The lesson plan referenced an unknown source.'
    );
  }
  let used = 0;
  return found.filter((source) => {
    used += source.text.length;
    return used <= maxChars;
  });
}

// Representative, deterministic planning context keeps large uploads within a
// predictable provider budget without adding infrastructure.
export function sourcesForPlanning(
  sources,
  maxChars = appConfig.lesson.maxSourceContextCharacters * 2
) {
  if (sources.length === 0) {
    return [];
  }
  const selected = [];
  let used = 0;
  const add = (source) => {
    if (selected.some((item) => item.id === source.id) || used >= maxChars) {
      return;
    }
    const remaining = maxChars - used;
    if (remaining < 200) {
      return;
    }
    selected.push({ ...source, text: source.text.slice(0, remaining) });
    used += Math.min(source.text.length, remaining);
  };
  // Include beginning, middle, and end, then fill remaining room in order.
  [sources[0], sources[Math.floor(sources.length / 2)], sources.at(-1)].forEach(
    add
  );
  for (const source of sources) {
    add(source);
  }
  return selected;
}
export function validateSourceIds(ids, sources) {
  const known = new Set(sources.map(({ id }) => id));
  if (!Array.isArray(ids) || ids.some((id) => !known.has(id))) {
    throw new ApiError(
      422,
      'INVALID_SOURCE_REFERENCE',
      'The model returned an unknown source reference.'
    );
  }
  return [...new Set(ids)];
}
