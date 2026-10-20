import { z } from 'zod';

import { tutorTurn } from '../agents/tutorAgent.js';
import { appConfig, environment } from '../config/index.js';
import { ApiError, sendError } from '../errors.js';
import { publicProgress } from '../lesson/lessonState.js';
import {
  validateClientState,
  applyEvaluation,
} from '../lesson/progressManager.js';
import { sourcesForStep } from '../services/sourceRetriever.js';
const Request = z
  .object({
    lessonId: z.string().uuid(),
    message: z
      .string()
      .max(appConfig.input.maxStudentMessageCharacters)
      .optional(),
    start: z.boolean().optional(),
    lessonState: z.unknown(),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(['student', 'tutor']),
          content: z.string().max(appConfig.input.maxStudentMessageCharacters),
        })
      )
      .max(appConfig.input.maxConversationMessages)
      .default([]),
    apiKey: z.string().trim().min(1).optional(),
    model: z.string().optional(),
  })
  .superRefine((v, c) => {
    if (!v.start && !v.message?.trim()) {
      c.addIssue({ code: 'custom', message: 'message is required' });
    }
  });
function event(res, name, data) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}
export async function chatLesson(req, res) {
  let cancelled = false;
  req.on('close', () => {
    cancelled = true;
  });
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
    const state = validateClientState(input.lessonState);
    if (state.lessonId !== input.lessonId) {
      throw new ApiError(
        400,
        'INVALID_LESSON_STATE',
        'The lesson identifier does not match the state.'
      );
    }
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();
    const sources = sourcesForStep(
      state.sources,
      state.plan.steps[state.currentStep]
    );
    const result = await tutorTurn({
      state,
      message: input.message,
      history: input.conversationHistory,
      apiKey,
      model: input.model,
      sources,
      start: input.start,
    });
    if (cancelled) {
      return res.end();
    }
    for (const text of result.message.match(/.{1,180}/gs) || []) {
      event(res, 'delta', { text });
    }
    event(res, 'sources', { sourceIds: result.sourceIds });
    const updated = applyEvaluation(state, result);
    event(res, 'progress', {
      progress: publicProgress(updated),
      lessonState: updated,
    });
    event(res, 'done', {});
    res.end();
  } catch (error) {
    if (res.headersSent) {
      event(res, 'error', {
        error: {
          code: error.code || 'GENERATION_FAILED',
          message: 'Unable to generate a tutor response.',
        },
      });
      res.end();
    } else {
      sendError(res, error);
    }
  }
}
