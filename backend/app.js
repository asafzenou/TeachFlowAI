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
  limits: { fileSize: appConfig.document.maxFileBytes, files: 1 },
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
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      logger.warn('http-request', {
        requestId: req.requestId,
        stage: 'UPLOAD_VALIDATION',
        errorCode: 'FILE_TOO_LARGE',
        rootCause: 'FILE_SIZE_LIMIT',
      });
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'The file must be 4 MB or smaller.',
        },
      });
    }
    return sendError(res, error, req);
  });
  return app;
}
