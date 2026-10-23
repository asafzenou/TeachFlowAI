import { createApp } from './app.js';
import { environment } from './config/index.js';
import { logger } from './logger.js';
createApp().listen(environment.backendPort, () =>
  logger.info('server', {
    stage: 'SERVER_STARTED',
    port: environment.backendPort,
  })
);
