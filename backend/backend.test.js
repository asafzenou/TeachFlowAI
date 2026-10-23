import assert from 'node:assert/strict';
import test from 'node:test';

import request from 'supertest';

import { lessonPlanJsonSchema } from './agents/lessonPlanner.js';
import { createApp } from './app.js';
import {
  appConfig,
  readEnvironment,
  validateAppConfig,
} from './config/index.js';
import {
  applyEvaluation,
  validateClientState,
} from './lesson/progressManager.js';
import { processDocument } from './services/documentProcessor.js';
import {
  sourcesForPlanning,
  validateSourceIds,
} from './services/sourceRetriever.js';

const state = {
  lessonId: '00000000-0000-4000-8000-000000000000',
  teacherPrompt: 'Teach it',
  plan: {
    steps: [
      { id: 'one', objective: 'One', sourceIds: ['chunk_1'] },
      { id: 'two', objective: 'Two', sourceIds: ['chunk_2'] },
    ],
  },
  sources: [
    { id: 'chunk_1', text: 'one', page: 1 },
    { id: 'chunk_2', text: 'two', page: 1 },
  ],
  currentStep: 0,
  completedSteps: [],
  status: 'not_started',
};
test('health endpoint works', async () => {
  const res = await request(createApp()).get('/api/health');
  assert.deepEqual(res.body, { status: 'ok', service: 'TeachFlowAI' });
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/i);
});
test('OpenAPI document and local Swagger UI are available', async () => {
  const app = createApp();
  const specification = await request(app).get('/openapi.json');
  assert.equal(specification.status, 200);
  assert.equal(specification.body.openapi, '3.1.0');
  assert.ok(specification.body.paths['/api/lesson/create']);
  const docs = await request(app).get('/docs/');
  assert.equal(docs.status, 200);
  assert.match(docs.headers['content-type'], /text\/html/);
});
test('application configuration is valid and environment defaults are safe', () => {
  assert.equal(appConfig.ai.defaultModel, 'gemini-3.5-flash-lite');
  assert.equal(readEnvironment({}).backendPort, 3001);
  assert.equal(readEnvironment({ GEMINI_API_KEY: '' }).geminiApiKey, undefined);
  assert.throws(() =>
    validateAppConfig({
      ...appConfig,
      ai: { ...appConfig.ai, defaultModel: 'not-a-gemini-model' },
    })
  );
  assert.throws(() => readEnvironment({ BACKEND_PORT: '0' }));
});
test('missing API key is a safe client error', async () => {
  const res = await request(createApp()).post('/api/lesson/chat').send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'MISSING_API_KEY');
  assert.match(res.body.error.requestId, /^[0-9a-f-]{36}$/i);
});
test('lesson creation returns a correlatable error without an API key', async () => {
  const res = await request(createApp()).post('/api/lesson/create');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'MISSING_API_KEY');
  assert.match(res.body.error.requestId, /^[0-9a-f-]{36}$/i);
});
test('TXT and Hebrew survive processing', async () => {
  const output = await processDocument({
    originalname: 'lesson.txt',
    mimetype: 'text/plain',
    size: 18,
    buffer: Buffer.from('שלום עולם and text'),
  });
  assert.match(output.sources[0].text, /שלום עולם/);
});
test('unsupported file is rejected', async () => {
  await assert.rejects(
    () =>
      processDocument({
        originalname: 'a.docx',
        mimetype: 'application/vnd.word',
        size: 2,
        buffer: Buffer.from('x'),
      }),
    { code: 'UNSUPPORTED_FILE' }
  );
});
test('empty document is rejected', async () => {
  await assert.rejects(
    () =>
      processDocument({
        originalname: 'a.txt',
        mimetype: 'text/plain',
        size: 2,
        buffer: Buffer.from('  '),
      }),
    { code: 'EMPTY_DOCUMENT' }
  );
});
test('incorrect or malformed evaluation does not advance', () => {
  const unchanged = applyEvaluation(state, {
    understanding: 'incorrect',
    action: 'advance',
    shouldAdvance: true,
  });
  assert.equal(unchanged.currentStep, 0);
});
test('correct response advances exactly one step', () => {
  const next = applyEvaluation(state, {
    understanding: 'correct',
    action: 'advance',
    shouldAdvance: true,
  });
  assert.equal(next.currentStep, 1);
  assert.deepEqual(next.completedSteps, [0]);
});
test('partial understanding does not advance lesson progress', () => {
  const next = applyEvaluation(state, {
    understanding: 'partial',
    action: 'ask_followup',
    shouldAdvance: false,
  });
  assert.equal(next.currentStep, 0);
  assert.deepEqual(next.completedSteps, []);
});
test('planning context is bounded while retaining page-aware source records', () => {
  const sources = Array.from({ length: 20 }, (_, index) => ({
    id: `chunk_${index + 1}`,
    page: index + 1,
    text: 'source '.repeat(500),
  }));
  const selected = sourcesForPlanning(sources, 3000);
  assert.ok(
    selected.reduce((total, source) => total + source.text.length, 0) <= 3000
  );
  assert.equal(selected[0].id, 'chunk_1');
  assert.ok(selected.every((source) => Number.isInteger(source.page)));
});
test('planning schema restricts model citations to supplied source IDs', () => {
  const schema = lessonPlanJsonSchema(['chunk_1', 'chunk_2']);
  assert.deepEqual(schema.properties.steps.items.properties.sourceIds, {
    type: 'array',
    minItems: 1,
    items: { type: 'string', enum: ['chunk_1', 'chunk_2'] },
  });
});
test('invalid source IDs and progress are rejected', () => {
  assert.throws(() => validateSourceIds(['invented'], state.sources), {
    code: 'INVALID_SOURCE_REFERENCE',
  });
  assert.throws(() => validateClientState({ ...state, currentStep: 10 }), {
    code: 'INVALID_LESSON_STATE',
  });
  assert.throws(
    () => validateClientState({ ...state, completedSteps: undefined }),
    { code: 'INVALID_LESSON_STATE' }
  );
});
