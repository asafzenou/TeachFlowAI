import { ApiError } from '../errors.js';
export function applyEvaluation(state, evaluation) {
  const next = structuredClone(state);
  if (next.status === 'completed') {
    return next;
  }
  if (
    evaluation.shouldAdvance &&
    evaluation.action === 'advance' &&
    evaluation.understanding === 'correct'
  ) {
    if (!next.completedSteps.includes(next.currentStep)) {
      next.completedSteps.push(next.currentStep);
    }
    if (next.currentStep >= next.plan.steps.length - 1) {
      next.status = 'completed';
    } else {
      next.currentStep += 1;
      next.status = 'in_progress';
    }
  } else if (next.status === 'not_started') {
    next.status = 'in_progress';
  }
  return next;
}
export function validateClientState(state) {
  if (
    !state ||
    typeof state.lessonId !== 'string' ||
    !Array.isArray(state.sources) ||
    !Array.isArray(state.plan?.steps) ||
    !Array.isArray(state.completedSteps) ||
    state.currentStep < 0 ||
    state.currentStep >= state.plan.steps.length ||
    !['not_started', 'in_progress', 'completed'].includes(state.status)
  ) {
    throw new ApiError(
      400,
      'INVALID_LESSON_STATE',
      'The lesson state is invalid.'
    );
  }
  if (
    state.completedSteps.some(
      (step) =>
        !Number.isInteger(step) || step < 0 || step >= state.plan.steps.length
    )
  ) {
    throw new ApiError(
      400,
      'INVALID_LESSON_STATE',
      'The lesson progress is invalid.'
    );
  }
  const completed = new Set(state.completedSteps);
  if (
    completed.size !== state.completedSteps.length ||
    state.completedSteps.some(
      (step) =>
        step > state.currentStep ||
        (step === state.currentStep && state.status !== 'completed')
    ) ||
    (state.status === 'completed' &&
      state.completedSteps.length !== state.plan.steps.length)
  ) {
    throw new ApiError(
      400,
      'INVALID_LESSON_STATE',
      'The lesson progress is inconsistent.'
    );
  }
  const ids = new Set(state.sources.map((source) => source?.id));
  if (
    ids.size !== state.sources.length ||
    state.plan.steps.some(
      (step) =>
        typeof step?.id !== 'string' ||
        !Array.isArray(step.sourceIds) ||
        step.sourceIds.length === 0 ||
        step.sourceIds.some((id) => !ids.has(id))
    )
  ) {
    throw new ApiError(
      400,
      'INVALID_LESSON_STATE',
      'The lesson sources are invalid.'
    );
  }
  return state;
}
