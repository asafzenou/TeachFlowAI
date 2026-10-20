import { GoogleGenAI } from '@google/genai';

import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';
const MODEL = /^gemini-[a-z0-9.-]+$/;
export async function generateJson({
  apiKey,
  prompt,
  schema,
  model = appConfig.ai.defaultModel,
}) {
  if (!apiKey?.trim()) {
    throw new ApiError(401, 'MISSING_API_KEY', 'A Gemini API key is required.');
  }
  if (!MODEL.test(model)) {
    throw new ApiError(400, 'INVALID_MODEL', 'Invalid Gemini model selection.');
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const request = ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        maxOutputTokens: appConfig.ai.maxOutputTokens,
      },
    });
    const response = await Promise.race([
      request,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new ApiError(
                504,
                'AI_TIMEOUT',
                'Gemini took too long to respond.'
              )
            ),
          appConfig.ai.timeoutMs
        )
      ),
    ]);
    return JSON.parse(response.text);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = String(error.message || '');
    if (/api.?key|auth|401|403/i.test(message)) {
      throw new ApiError(401, 'AI_AUTH_ERROR', 'Gemini rejected the API key.');
    }
    if (/rate|429/i.test(message)) {
      throw new ApiError(
        429,
        'AI_RATE_LIMIT',
        'Gemini is temporarily rate limited.'
      );
    }
    throw new ApiError(
      502,
      'AI_PROVIDER_ERROR',
      'Gemini could not complete the request.'
    );
  }
}
