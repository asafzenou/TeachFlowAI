import { z } from 'zod';

import { planLesson } from '../agents/lessonPlanner.js';
import { appConfig, environment } from '../config/index.js';
import { ApiError, sendError } from '../errors.js';
import { createLessonState, publicProgress } from '../lesson/lessonState.js';
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
  try {
    const apiKey = req.body?.apiKey?.trim() || environment.geminiApiKey;
    if (!apiKey) {
      throw new ApiError(
        401,
        'MISSING_API_KEY',
        'A Gemini API key is required.'
      );
    }
    const input = Request.parse(req.body);
    const { sources, coverage } = await processDocument(req.file);
    const plan = await planLesson({ ...input, apiKey, sources });
    const state = createLessonState({
      teacherPrompt: input.teacherPrompt,
      plan,
      sources,
    });
    res.status(201).json({
      lessonId: state.lessonId,
      plan,
      sources,
      progress: publicProgress(state),
      lessonState: state,
      coverage,
    });
  } catch (error) {
    sendError(res, error);
  }
}
