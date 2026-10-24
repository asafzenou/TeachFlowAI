import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import request from 'supertest';

import {
  lessonPlanJsonSchema,
  lessonPlanSchema,
} from './agents/lessonPlanner.js';
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
import { assertLessonResponseSize, jsonByteLength } from './responseSize.js';
import { Request } from './routes/createLesson.js';
import { processDocument } from './services/documentProcessor.js';
import {
  sourcesForPlanning,
  sourcesForStep,
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
test('chat rejects a JSON body beyond its serverless-safe limit', async () => {
  const res = await request(createApp())
    .post('/api/lesson/chat')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ padding: 'x'.repeat(3 * 1024 * 1024) }));
  assert.equal(res.status, 413);
  assert.equal(res.body.error.code, 'REQUEST_TOO_LARGE');
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
test('the documented Hebrew PDF evaluation fixture remains extractable', async () => {
  const buffer = await readFile(
    new URL('../docs/Water_Cycle_Lesson_vizman.pdf', import.meta.url)
  );
  const output = await processDocument({
    originalname: 'Water_Cycle_Lesson_vizman.pdf',
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
  });
  assert.equal(output.sources.length, 9);
  assert.match(output.sources[0].text, /צוות/);
});
test('lesson functions include the PDF worker and Linux canvas runtime files in Vercel', async () => {
  const config = JSON.parse(
    await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
  );
  assert.equal(
    config.functions['api/lesson/*.js'].includeFiles,
    'node_modules/{pdfjs-dist/legacy/build/pdf.worker.mjs,@napi-rs/canvas/**,@napi-rs/canvas-linux-x64-gnu/**}'
  );
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
test('corrupted PDFs return a safe extraction error', async () => {
  await assert.rejects(
    () =>
      processDocument({
        originalname: 'corrupted.pdf',
        mimetype: 'application/pdf',
        size: 8,
        buffer: Buffer.from('not a pdf'),
      }),
    { code: 'PDF_EXTRACTION_FAILED' }
  );
});
test('extractable document text is bounded before duplicating it into lesson state', async () => {
  await assert.rejects(
    () =>
      processDocument({
        originalname: 'large.txt',
        mimetype: 'text/plain',
        size: appConfig.document.maxExtractedTextBytes + 1,
        buffer: Buffer.alloc(appConfig.document.maxExtractedTextBytes + 1, 'a'),
      }),
    { code: 'EXTRACTED_TEXT_TOO_LARGE' }
  );
});
test('lesson creation response has an explicit serverless-safe size ceiling', () => {
  const response = { lessonState: { sources: [{ text: 'brief' }] } };
  assert.ok(jsonByteLength(response) < appConfig.input.maxLessonResponseBytes);
  assert.doesNotThrow(() => assertLessonResponseSize(response));
  assert.throws(
    () =>
      assertLessonResponseSize({
        lessonState: { sources: [{ text: 'x'.repeat(3 * 1024 * 1024) }] },
      }),
    { code: 'LESSON_RESPONSE_TOO_LARGE' }
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
test('correct final response completes the lesson without advancing past its final step', () => {
  const finalStep = {
    ...state,
    currentStep: 1,
    completedSteps: [0],
    status: 'in_progress',
  };
  const completed = applyEvaluation(finalStep, {
    understanding: 'correct',
    action: 'advance',
    shouldAdvance: true,
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.currentStep, 1);
  assert.deepEqual(completed.completedSteps, [0, 1]);
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
test('step context retains a supplied source ID when its passage is truncated', () => {
  assert.deepEqual(
    sourcesForStep([{ id: 'chunk_1', text: 'abcdef' }], state.plan.steps[0], 3),
    [{ id: 'chunk_1', text: 'abc' }]
  );
});
test('planning schema restricts model citations to supplied source IDs', () => {
  const schema = lessonPlanJsonSchema(['chunk_1', 'chunk_2']);
  assert.deepEqual(schema.properties.steps.items.properties.sourceIds, {
    type: 'array',
    minItems: 1,
    items: { type: 'string', enum: ['chunk_1', 'chunk_2'] },
  });
});
test('lesson length defaults to auto and validates custom bounds', () => {
  const legacy = Request.parse({ teacherPrompt: 'Teach this' });
  assert.deepEqual(legacy.lessonLength, { mode: 'auto', steps: null });
  assert.deepEqual(
    Request.parse({
      teacherPrompt: 'Teach this',
      lessonLength: JSON.stringify({ mode: 'custom', steps: 5 }),
    }).lessonLength,
    { mode: 'custom', steps: 5 }
  );
  for (const steps of [2, 2.5, 9, null]) {
    assert.throws(() =>
      Request.parse({
        teacherPrompt: 'Teach this',
        lessonLength: JSON.stringify({ mode: 'custom', steps }),
      })
    );
  }
});
test('planner contracts enforce auto and custom lesson lengths', () => {
  const autoSchema = lessonPlanJsonSchema(['chunk_1']);
  assert.equal(autoSchema.properties.steps.minItems, 3);
  assert.equal(autoSchema.properties.steps.maxItems, 8);
  assert.equal(autoSchema.properties.objectives.maxItems, 8);
  const makePlan = (count) => ({
    title: 'Lesson',
    language: 'English',
    objectives: ['Understand the topic'],
    steps: Array.from({ length: count }, (_, index) => ({
      id: `step_${index + 1}`,
      objective: 'Learn a focused concept',
      sourceIds: ['chunk_1'],
    })),
  });
  for (const count of [3, 5, 8]) {
    assert.doesNotThrow(() => lessonPlanSchema(count).parse(makePlan(count)));
  }
  assert.throws(() => lessonPlanSchema().parse(makePlan(9)));
  assert.throws(() => lessonPlanSchema(5).parse(makePlan(4)));
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
  assert.throws(
    () =>
      validateSourceIds(
        ['chunk_1'],
        [
          { id: 'chunk_1', text: 'x' },
          { id: 'chunk_1', text: 'y' },
        ]
      ),
    { code: 'INVALID_SOURCE_REFERENCE' }
  );
  assert.throws(
    () =>
      validateClientState({ ...state, sources: [{ id: 'chunk_1', text: '' }] }),
    { code: 'INVALID_LESSON_STATE' }
  );
});
test('completed lessons reject chat requests before generation begins', async () => {
  const completedState = {
    ...state,
    currentStep: 1,
    completedSteps: [0, 1],
    status: 'completed',
  };
  const res = await request(createApp()).post('/api/lesson/chat').send({
    lessonId: completedState.lessonId,
    lessonState: completedState,
    message: 'One more question',
    apiKey: 'test-key-never-log-this',
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'LESSON_COMPLETED');
});
