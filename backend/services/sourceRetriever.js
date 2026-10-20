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
