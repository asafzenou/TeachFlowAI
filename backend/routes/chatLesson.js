import { z } from 'zod';

import { evaluateTutorTurn, streamTutorMessage } from '../agents/tutorAgent.js';
import { appConfig, environment } from '../config/index.js';
import { ApiError, sendError } from '../errors.js';
import { publicProgress } from '../lesson/lessonState.js';
import {
  validateClientState,
  applyEvaluation,
} from '../lesson/progressManager.js';
import { logFailure, logStage } from '../logger.js';
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
  const requestId = req.requestId;
  const context = { requestId, operation: 'lesson-chat' };
  const controller = new AbortController();
  let responseFinished = false;
  res.on('finish', () => {
    responseFinished = true;
  });
  res.on('close', () => {
    if (!responseFinished) {
      controller.abort();
    }
  });
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
    logStage(context, 'PROGRESS_STATE_VALIDATION_STARTED');
    const state = validateClientState(input.lessonState);
    if (state.lessonId !== input.lessonId) {
      throw new ApiError(
        400,
        'INVALID_LESSON_STATE',
        'The lesson identifier does not match the state.'
      );
    }
    if (state.status === 'completed') {
      throw new ApiError(
        409,
        'LESSON_COMPLETED',
        'This lesson is already completed.'
      );
    }
    logStage(context, 'PROGRESS_STATE_VALIDATION_COMPLETED');
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
    logStage(context, 'TUTOR_EVALUATION_STARTED');
    const result = await evaluateTutorTurn({
      state,
      message: input.message,
      history: input.conversationHistory,
      apiKey,
      model: input.model,
      sources,
      start: input.start,
      signal: controller.signal,
      requestId,
    });
    logStage(context, 'TUTOR_EVALUATION_COMPLETED');
    if (controller.signal.aborted) {
      return res.end();
    }
    const updated = applyEvaluation(state, result);
    // Once understanding is validated, generate the reply from the same step
    // that will be reported to the client. This keeps the tutor's question,
    // source context, and progress indicator in sync.
    const responseState = result.shouldAdvance ? updated : state;
    const responseSources = sourcesForStep(
      responseState.sources,
      responseState.plan.steps[responseState.currentStep]
    );
    const stream = streamTutorMessage({
      state: responseState,
      message: input.message,
      history: input.conversationHistory,
      apiKey,
      model: input.model,
      sources: responseSources,
      start: input.start,
      evaluation: result,
      signal: controller.signal,
      requestId,
    });
    logStage(context, 'TUTOR_STREAM_STARTED');
    for await (const text of stream) {
      if (controller.signal.aborted) {
        return res.end();
      }
      event(res, 'delta', { text });
    }
    logStage(context, 'TUTOR_STREAM_COMPLETED');
    if (controller.signal.aborted) {
      return res.end();
    }
    event(res, 'sources', {
      sourceIds: result.shouldAdvance
        ? responseSources.map((source) => source.id)
        : result.sourceIds,
    });
    logStage(context, 'PROGRESS_UPDATE_COMPLETED', {
      status: updated.status,
      currentStep: updated.currentStep,
    });
    event(res, 'progress', {
      progress: publicProgress(updated),
      lessonState: updated,
    });
    event(res, 'done', {});
    res.end();
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    if (res.headersSent) {
      logFailure(context, error);
      event(res, 'error', {
        error: {
          code: error.code || 'GENERATION_FAILED',
          message: 'Unable to generate a tutor response.',
          requestId,
        },
      });
      res.end();
    } else {
      sendError(res, error, req);
    }
  }
}
