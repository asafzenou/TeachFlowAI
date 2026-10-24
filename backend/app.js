import express from 'express';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';

import { appConfig } from './config/index.js';
import { sendError } from './errors.js';
import { logger } from './logger.js';
import { openApiDocument } from './openapi.js';
import { chatLesson } from './routes/chatLesson.js';
import { createLesson } from './routes/createLesson.js';
import { health } from './routes/health.js';
const upload = multer({
  storage: multer.memoryStorage(),
  // Keep the complete multipart payload well below Vercel's 4.5 MB limit.
  limits: {
    fileSize: appConfig.document.maxFileBytes,
    fieldSize: 16 * 1024,
    files: 1,
    fields: 4,
    parts: 5,
  },
});
export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    const startedAt = performance.now();
    req.requestId = crypto.randomUUID();
    res.set('X-Request-ID', req.requestId);
    logger.info('http-request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      stage: 'REQUEST_RECEIVED',
    });
    res.on('finish', () =>
      logger.info('http-request', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        stage: 'RESPONSE_SENT',
      })
    );
    next();
  });
  app.get(['/openapi.json', '/api/openapi.json'], (_req, res) =>
    res.json(openApiDocument)
  );
  app.use(
    ['/docs', '/api/docs'],
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'TeachFlowAI API Docs',
    })
  );
  app.get('/api/health', health);
  app.post('/api/lesson/create', upload.single('file'), createLesson);
  app.post(
    '/api/lesson/chat',
    express.json({ limit: appConfig.input.maxJsonBodyBytes }),
    chatLesson
  );
  app.use((error, req, res, _next) => {
    if (error instanceof multer.MulterError) {
      logger.warn('http-request', {
        requestId: req.requestId,
        stage: 'UPLOAD_VALIDATION',
        errorCode:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'FILE_TOO_LARGE'
            : 'REQUEST_TOO_LARGE',
        rootCause: error.code,
      });
      return res.status(413).json({
        error: {
          code:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'FILE_TOO_LARGE'
              : 'REQUEST_TOO_LARGE',
          message:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'The file must be 2 MB or smaller.'
              : 'The upload request is too large.',
          requestId: req.requestId,
        },
      });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'The chat request is too large.',
          requestId: req.requestId,
        },
      });
    }
    return sendError(res, error, req);
  });
  return app;
}
