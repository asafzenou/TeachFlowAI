import { createApp } from './app.js';
import { environment } from './config/index.js';
createApp().listen(environment.backendPort, () =>
  console.log(
    `TeachFlowAI API listening on http://localhost:${environment.backendPort}`
  )
);
