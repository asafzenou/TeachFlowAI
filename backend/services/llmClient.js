import { GoogleGenAI } from '@google/genai';

import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';
import { logger } from '../logger.js';

const MODEL = /^gemini-[a-z0-9.-]+$/;
const createClient = (apiKey) => new GoogleGenAI({ apiKey });
// Logs only metadata. Never add prompts, responses, keys, headers, URLs, or raw errors.
function diagnostic(context, stage, metadata = {}) {
  logger.info(context.operation, {
    requestId: context.requestId,
    stage,
    model: context.model,
    schemaId: context.schemaId,
    ...metadata,
  });
}
function contextFor({ requestId, operation, model, schemaId }) {
  return {
    requestId: requestId || 'unscoped',
    operation: operation || 'gemini-request',
    model,
    schemaId,
  };
}
function providerDetails(error) {
  const body = error?.error || error?.response?.error;
  const status = Number(error?.status || error?.statusCode || body?.code);
  const possibleCode = String(
    error?.code || body?.status || body?.code || ''
  ).slice(0, 80);
  return {
    status: Number.isInteger(status) ? status : undefined,
    providerCode: /^[A-Za-z0-9_.-]+$/.test(possibleCode)
      ? possibleCode
      : undefined,
    // Message is fallback classification input only; it is never logged.
    message: String(error?.message || body?.message || '').slice(0, 300),
  };
}
export function classifyProviderError(error) {
  const { status, providerCode, message } = providerDetails(error);
  const evidence = `${providerCode} ${message}`.toLowerCase();
  if (status === 429) {
    return evidence.includes('quota')
      ? 'QUOTA_EXCEEDED'
      : 'RATE_LIMIT_EXCEEDED';
  }
  if (
    status === 401 ||
    status === 403 ||
    /api.?key|authentication|unauthenticated/.test(evidence)
  ) {
    return 'INVALID_API_KEY';
  }
  if (status === 404 && /model|not found/.test(evidence)) {
    return 'MODEL_NOT_FOUND';
  }
  if (/model.*(support|available)|unsupported.*model/.test(evidence)) {
    return 'MODEL_NOT_SUPPORTED';
  }
  if (/schema|responsejsonschema|response.?mime/.test(evidence)) {
    return 'INVALID_JSON_SCHEMA';
  }
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return 'REQUEST_TIMEOUT';
  }
  if (/econn|enotfound|network|fetch failed|socket|dns/.test(evidence)) {
    return 'NETWORK_ERROR';
  }
  if (status === 400) {
    return 'INVALID_REQUEST';
  }
  return 'UNKNOWN_PROVIDER_ERROR';
}
function errorFor(classification, error, stage) {
  const { status, providerCode } = providerDetails(error);
  const definitions = {
    INVALID_API_KEY: [401, 'AI_AUTH_ERROR', 'Gemini rejected the API key.'],
    MODEL_NOT_FOUND: [
      400,
      'INVALID_MODEL',
      'The selected Gemini model is unavailable.',
    ],
    MODEL_NOT_SUPPORTED: [
      400,
      'INVALID_MODEL',
      'The selected Gemini model is not supported.',
    ],
    INVALID_JSON_SCHEMA: [
      400,
      'AI_SCHEMA_ERROR',
      'Gemini rejected the response schema.',
    ],
    INVALID_REQUEST: [400, 'AI_REQUEST_ERROR', 'Gemini rejected the request.'],
    RATE_LIMIT_EXCEEDED: [
      429,
      'AI_RATE_LIMIT',
      'Gemini is temporarily rate limited.',
    ],
    QUOTA_EXCEEDED: [
      429,
      'AI_RATE_LIMIT',
      'Gemini quota is currently unavailable.',
    ],
    NETWORK_ERROR: [
      502,
      'AI_NETWORK_ERROR',
      'Gemini could not complete the request.',
    ],
    REQUEST_TIMEOUT: [504, 'AI_TIMEOUT', 'Gemini took too long to respond.'],
    UNKNOWN_PROVIDER_ERROR: [
      502,
      'AI_UPSTREAM_ERROR',
      'Gemini could not complete the request.',
    ],
  };
  const [httpStatus, code, message] = definitions[classification];
  return new ApiError(httpStatus, code, message, {
    cause: error,
    providerStatus: status,
    providerCode,
    stage,
  });
}
function schemaConfigurationIsValid(schema) {
  return Boolean(
    schema &&
    typeof schema === 'object' &&
    !Array.isArray(schema) &&
    (!schema.properties || typeof schema.properties === 'object') &&
    (!schema.required ||
      (Array.isArray(schema.required) &&
        schema.required.every((value) => typeof value === 'string')))
  );
}
function validateResponse(responseSchema, value) {
  if (!responseSchema) {
    return value;
  }
  const result = responseSchema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 8).map((issue) => ({
      path:
        issue.path
          .map((part) => (typeof part === 'number' ? '[]' : part))
          .join('.') || 'root',
      code: issue.code,
    }));
    throw new ApiError(
      502,
      'RESPONSE_SCHEMA_MISMATCH',
      'Gemini returned an invalid lesson response.',
      {
        stage: 'RESPONSE_SCHEMA_VALIDATION',
        diagnostic: { issueCount: result.error.issues.length, issues },
      }
    );
  }
  return result.data;
}

export async function generateJson({
  apiKey,
  prompt,
  schema,
  model = appConfig.ai.defaultModel,
  requestId,
  operation,
  schemaId,
  responseSchema,
  clientFactory = createClient,
  timeoutMs = appConfig.ai.timeoutMs,
  signal,
}) {
  const context = contextFor({ requestId, operation, model, schemaId });
  if (signal?.aborted) {
    const error = new Error('The request was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
  if (!apiKey?.trim()) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'A Gemini API key is required.',
      { stage: 'API_KEY_VALIDATION' }
    );
  }
  diagnostic(context, 'MODEL_SELECTION', { valid: MODEL.test(model) });
  if (!MODEL.test(model)) {
    throw new ApiError(
      400,
      'INVALID_MODEL',
      'Invalid Gemini model selection.',
      { stage: 'MODEL_SELECTION' }
    );
  }
  const schemaValid = schemaConfigurationIsValid(schema);
  diagnostic(context, 'JSON_SCHEMA_CONFIGURATION', { valid: schemaValid });
  if (!schemaValid) {
    throw new ApiError(
      400,
      'INVALID_JSON_SCHEMA',
      'Invalid Gemini response schema.',
      { stage: 'JSON_SCHEMA_CONFIGURATION' }
    );
  }
  let ai;
  try {
    ai = clientFactory(apiKey);
    diagnostic(context, 'SDK_INIT', { outcome: 'success' });
  } catch (error) {
    diagnostic(context, 'SDK_INIT', { outcome: 'failed' });
    throw errorFor(classifyProviderError(error), error, 'SDK_INIT');
  }
  const controller = new AbortController();
  const requestSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  const startedAt = Date.now();
  let timer;
  let removeCancellationListener = () => {};
  try {
    const config = {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      maxOutputTokens: appConfig.ai.maxOutputTokens,
      abortSignal: requestSignal,
    };
    diagnostic(context, 'REQUEST_CONFIGURATION', { outcome: 'success' });
    diagnostic(context, 'GEMINI_REQUEST_STARTED');
    const request = ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new ApiError(504, 'AI_TIMEOUT', 'Gemini took too long to respond.', {
            stage: 'REQUEST_TIMEOUT',
          })
        );
      }, timeoutMs);
    });
    const cancelled = signal
      ? new Promise((_, reject) => {
          const rejectForCancellation = () => {
            const error = new Error('The request was cancelled.');
            error.name = 'AbortError';
            reject(error);
          };
          if (signal.aborted) {
            rejectForCancellation();
            return;
          }
          signal.addEventListener('abort', rejectForCancellation, {
            once: true,
          });
          removeCancellationListener = () =>
            signal.removeEventListener('abort', rejectForCancellation);
        })
      : null;
    const response = await Promise.race(
      [request, timeout, cancelled].filter(Boolean)
    );
    clearTimeout(timer);
    removeCancellationListener();
    diagnostic(context, 'GEMINI_REQUEST_COMPLETED', {
      elapsedMs: Date.now() - startedAt,
    });
    const text = response?.text;
    diagnostic(
      context,
      typeof text === 'string'
        ? 'RESPONSE_TEXT_RECEIVED'
        : 'RESPONSE_TEXT_MISSING'
    );
    if (typeof text !== 'string' || !text.trim()) {
      throw new ApiError(
        502,
        'EMPTY_MODEL_RESPONSE',
        'Gemini returned an empty response.',
        { stage: 'RESPONSE_TEXT_EXTRACTION' }
      );
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
      diagnostic(context, 'JSON_VALIDATION_COMPLETED');
    } catch (error) {
      diagnostic(context, 'JSON_VALIDATION_FAILED', {
        rootCause: 'INVALID_JSON_RESPONSE',
      });
      throw new ApiError(
        502,
        'INVALID_JSON_RESPONSE',
        'Gemini returned malformed JSON.',
        { cause: error, stage: 'JSON_PARSING' }
      );
    }
    try {
      const validated = validateResponse(responseSchema, parsed);
      diagnostic(context, 'RESPONSE_SCHEMA_VALIDATION_COMPLETED');
      return validated;
    } catch (error) {
      diagnostic(context, 'RESPONSE_SCHEMA_VALIDATION_FAILED', {
        rootCause: 'RESPONSE_SCHEMA_MISMATCH',
      });
      throw error;
    }
  } catch (error) {
    clearTimeout(timer);
    removeCancellationListener();
    if (signal?.aborted) {
      diagnostic(context, 'GEMINI_REQUEST_CANCELLED', { source: 'client' });
      throw error;
    }
    if (error instanceof ApiError) {
      logger.error(context.operation, {
        requestId: context.requestId,
        stage: error.stage || 'GEMINI_REQUEST',
        errorCode: error.code,
        rootCause: error.code,
        classification: error.code,
        elapsedMs: Date.now() - startedAt,
        ...(environmentIsDevelopment() && error.diagnostic
          ? { diagnostic: error.diagnostic }
          : {}),
      });
      throw error;
    }
    const classification = classifyProviderError(error);
    const details = providerDetails(error);
    logger.error(context.operation, {
      requestId: context.requestId,
      stage: 'GEMINI_PROVIDER_ERROR',
      errorCode: 'AI_PROVIDER_ERROR',
      rootCause: classification,
      classification,
      providerStatus: details.status,
      providerCode: details.providerCode || undefined,
      elapsedMs: Date.now() - startedAt,
    });
    throw errorFor(classification, error, 'API_REQUEST');
  }
}

function environmentIsDevelopment() {
  return process.env.NODE_ENV !== 'production';
}

export async function* generateTextStream({
  apiKey,
  prompt,
  model = appConfig.ai.defaultModel,
  signal,
  requestId,
  operation = 'lesson-chat',
  clientFactory = createClient,
}) {
  const context = contextFor({ requestId, operation, model });
  if (!apiKey?.trim()) {
    throw new ApiError(
      401,
      'MISSING_API_KEY',
      'A Gemini API key is required.',
      { stage: 'API_KEY_VALIDATION' }
    );
  }
  if (!MODEL.test(model)) {
    throw new ApiError(
      400,
      'INVALID_MODEL',
      'Invalid Gemini model selection.',
      { stage: 'MODEL_SELECTION' }
    );
  }
  const timeout = AbortSignal.timeout(appConfig.ai.timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const startedAt = Date.now();
  try {
    const ai = clientFactory(apiKey);
    diagnostic(context, 'SDK_INIT', { outcome: 'success' });
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        maxOutputTokens: appConfig.ai.maxOutputTokens,
        abortSignal: requestSignal,
      },
    });
    diagnostic(context, 'TUTOR_STREAM_PROVIDER_CONNECTED');
    for await (const chunk of stream) {
      if (requestSignal.aborted) {
        diagnostic(context, 'TUTOR_STREAM_CANCELLED', {
          source: signal?.aborted ? 'client' : 'timeout',
        });
        break;
      }
      if (chunk.text) {
        yield chunk.text;
      }
    }
    if (timeout.aborted && !signal?.aborted) {
      throw new ApiError(
        504,
        'AI_TIMEOUT',
        'Gemini took too long to respond.',
        { stage: 'REQUEST_TIMEOUT' }
      );
    }
    diagnostic(context, 'TUTOR_STREAM_COMPLETED', {
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (signal?.aborted) {
      diagnostic(context, 'TUTOR_STREAM_CANCELLED', { source: 'client' });
      return;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    const classification = timeout.aborted
      ? 'REQUEST_TIMEOUT'
      : classifyProviderError(error);
    logger.error(context.operation, {
      requestId: context.requestId,
      stage: 'TUTOR_STREAM_PROVIDER_ERROR',
      errorCode: 'AI_PROVIDER_ERROR',
      rootCause: classification,
      classification,
      providerStatus: providerDetails(error).status,
      elapsedMs: Date.now() - startedAt,
    });
    throw errorFor(classification, error, 'STREAM_INIT');
  }
}
