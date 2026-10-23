import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';
export function sourcesForStep(
  sources,
  step,
  maxChars = appConfig.lesson.maxSourceContextCharacters
) {
  if (!step || !Array.isArray(step.sourceIds)) {
    throw new ApiError(
      422,
      'INVALID_PLAN_SOURCES',
      'The lesson plan sources are invalid.'
    );
  }
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
  return found.flatMap((source) => {
    const remaining = maxChars - used;
    if (remaining <= 0) {
      return [];
    }
    const text = source.text.slice(0, remaining);
    used += text.length;
    return text ? [{ ...source, text }] : [];
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
  const known = new Set();
  const validSources =
    Array.isArray(sources) &&
    sources.every((source) => {
      if (
        !source ||
        typeof source.id !== 'string' ||
        !source.id.trim() ||
        typeof source.text !== 'string' ||
        !source.text.trim() ||
        known.has(source.id)
      ) {
        return false;
      }
      known.add(source.id);
      return true;
    });
  if (
    !validSources ||
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== 'string' || !id.trim() || !known.has(id))
  ) {
    throw new ApiError(
      422,
      'INVALID_SOURCE_REFERENCE',
      'The model returned an unknown source reference.'
    );
  }
  return [...new Set(ids)];
}
