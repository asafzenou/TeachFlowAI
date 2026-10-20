import express from 'express';
import multer from 'multer';

import { appConfig } from './config/index.js';
import { sendError } from './errors.js';
import { chatLesson } from './routes/chatLesson.js';
import { createLesson } from './routes/createLesson.js';
import { health } from './routes/health.js';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: appConfig.document.maxFileBytes, files: 1 },
});
export function createApp() {
  const app = express();
  app.get('/api/health', health);
  app.post('/api/lesson/create', upload.single('file'), createLesson);
  app.post(
    '/api/lesson/chat',
    express.json({ limit: appConfig.input.maxJsonBodyBytes }),
    chatLesson
  );
  app.use((error, _req, res, _next) => {
    if (
      error instanceof multer.MulterError &&
      error.code === 'LIMIT_FILE_SIZE'
    ) {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'The file must be 4 MB or smaller.',
        },
      });
    }
    return sendError(res, error);
  });
  return app;
}
