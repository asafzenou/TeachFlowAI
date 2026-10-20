import { randomUUID } from 'node:crypto';
export function createLessonState({ teacherPrompt, plan, sources }) {
  return {
    lessonId: randomUUID(),
    teacherPrompt,
    plan,
    sources,
    currentStep: 0,
    completedSteps: [],
    status: 'not_started',
  };
}
export function publicProgress(state) {
  return {
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    status: state.status,
  };
}
