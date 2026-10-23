export class ApiError extends Error {
  constructor(status, code, message, options = {}) {
    super(message, { cause: options.cause });
    this.status = status;
    this.code = code;
    if (options.providerStatus) {
      this.providerStatus = options.providerStatus;
    }
    if (options.providerCode) {
      this.providerCode = options.providerCode;
    }
    if (options.stage) {
      this.stage = options.stage;
    }
  }
}
export function sendError(res, error, req) {
  if (error?.name === 'ZodError') {
    logger.warn('request-validation', {
      requestId: req?.requestId,
      stage: 'REQUEST_VALIDATION',
      errorCode: 'INVALID_REQUEST',
      rootCause: 'INVALID_REQUEST',
    });
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'The request is invalid.',
        requestId: req?.requestId,
      },
    });
  }
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  const level = status >= 500 ? 'error' : 'warn';
  logger[level]('request-error', {
    requestId: req?.requestId,
    stage: error?.stage || 'REQUEST_HANDLING',
    status,
    errorCode: code,
    rootCause: error?.providerCode || code,
    providerStatus: error?.providerStatus,
    providerCode: error?.providerCode,
  });
  res.status(status).json({
    error: {
      code,
      message:
        error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred.',
      requestId: req?.requestId,
    },
  });
}
import { logger } from './logger.js';
