import { z } from 'zod';

import { planLesson } from '../agents/lessonPlanner.js';
import { appConfig, environment } from '../config/index.js';
import { ApiError, sendError } from '../errors.js';
import { createLessonState } from '../lesson/lessonState.js';
import { logStage } from '../logger.js';
import { assertLessonResponseSize } from '../responseSize.js';
import { processDocument } from '../services/documentProcessor.js';
const Request = z.object({
  teacherPrompt: z
    .string()
    .trim()
    .min(1)
    .max(appConfig.input.maxTeacherPromptCharacters),
  apiKey: z.string().trim().min(1).optional(),
  model: z.string().optional(),
});
export async function createLesson(req, res) {
  const requestId = req.requestId;
  const context = { requestId, operation: 'lesson-create' };
  try {
    const apiKey = req.body?.apiKey?.trim() || environment.geminiApiKey;
    if (!apiKey) {
      throw new ApiError(
        401,
        'MISSING_API_KEY',
        'A Gemini API key is required.',
        { stage: 'API_KEY_VALIDATION' }
      );
    }
    const input = Request.parse(req.body);
    logStage(context, 'DOCUMENT_PROCESSING_STARTED');
    const { sources, coverage } = await processDocument(req.file, context);
    logStage(context, 'DOCUMENT_PROCESSING_COMPLETED', {
      sourceCount: sources.length,
    });
    logStage(context, 'LESSON_PLANNING_STARTED');
    const plan = await planLesson({ ...input, apiKey, sources, requestId });
    logStage(context, 'LESSON_PLANNING_COMPLETED', {
      stepCount: plan.steps.length,
    });
    const state = createLessonState({
      teacherPrompt: input.teacherPrompt,
      plan,
      sources,
    });
    const response = {
      lessonId: state.lessonId,
      lessonState: state,
      coverage,
    };
    assertLessonResponseSize(response);
    res.status(201).json(response);
  } catch (error) {
    sendError(res, error, req);
  }
}
