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
    !Array.isArray(state.plan?.steps) ||
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
  return state;
}
