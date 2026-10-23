import 'dotenv/config';
import { z } from 'zod';

import appConfigData from '../../config/app.config.json' with { type: 'json' };

const AppConfigSchema = z
  .object({
    ai: z.object({
      provider: z.literal('gemini'),
      defaultModel: z.string().regex(/^gemini-[a-z0-9.-]+$/),
      timeoutMs: z.number().int().min(1000).max(120000),
      maxOutputTokens: z.number().int().min(1).max(8192),
    }),
    document: z
      .object({
        maxFileBytes: z
          .number()
          .int()
          .positive()
          .max(2 * 1024 * 1024),
        maxExtractedTextBytes: z
          .number()
          .int()
          .positive()
          .max(2 * 1024 * 1024),
        chunkSizeCharacters: z.number().int().min(200).max(10000),
        chunkOverlapCharacters: z.number().int().min(0).max(5000),
      })
      .refine(
        (value) => value.chunkOverlapCharacters < value.chunkSizeCharacters,
        'Chunk overlap must be smaller than chunk size.'
      ),
    lesson: z.object({
      maxSteps: z.number().int().min(1).max(20),
      maxSourceContextCharacters: z.number().int().min(500).max(30000),
    }),
    input: z.object({
      maxTeacherPromptCharacters: z.number().int().min(1).max(10000),
      maxStudentMessageCharacters: z.number().int().min(1).max(10000),
      maxConversationMessages: z.number().int().min(1).max(100),
      maxJsonBodyBytes: z.string().regex(/^\d+(kb|mb)$/i),
      maxLessonResponseBytes: z
        .number()
        .int()
        .positive()
        .max(3 * 1024 * 1024),
    }),
  })
  .strict();
const EnvironmentSchema = z.object({
  backendPort: z.coerce.number().int().min(1).max(65535).default(3001),
  geminiApiKey: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional()
  ),
});
export const validateAppConfig = (value) => AppConfigSchema.parse(value);
export const readEnvironment = (value = process.env) =>
  EnvironmentSchema.parse({
    backendPort: value.BACKEND_PORT,
    geminiApiKey: value.GEMINI_API_KEY,
  });
// This module is initialized once for each local process or serverless instance.
export const appConfig = Object.freeze(validateAppConfig(appConfigData));
export const environment = Object.freeze(readEnvironment());
