const DEBUG_ENABLED = /^debug$/i.test(process.env.LOG_LEVEL || '');

function write(level, operation, fields = {}) {
  if (level === 'DEBUG' && !DEBUG_ENABLED) {
    return;
  }
  // Callers must pass only operational metadata: never request payloads, keys,
  // credentials, document text, prompts, response text, headers, URLs, or raw errors.
  console[level === 'ERROR' ? 'error' : 'log'](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      operation,
      ...fields,
    })
  );
}

export const logger = Object.freeze({
  info: (operation, fields) => write('INFO', operation, fields),
  warn: (operation, fields) => write('WARN', operation, fields),
  error: (operation, fields) => write('ERROR', operation, fields),
  debug: (operation, fields) => write('DEBUG', operation, fields),
});

export function logStage(context, stage, fields = {}) {
  logger.info(context.operation, {
    requestId: context.requestId,
    stage,
    ...fields,
  });
}

export function logFailure(context, error, fields = {}) {
  logger.error(context.operation, {
    requestId: context.requestId,
    stage: error?.stage || fields.stage || 'UNHANDLED_ERROR',
    errorCode: error?.code || 'INTERNAL_ERROR',
    rootCause: fields.rootCause || error?.code || 'UNEXPECTED_ERROR',
    providerStatus: error?.providerStatus,
    providerCode: error?.providerCode,
    ...fields,
  });
}
