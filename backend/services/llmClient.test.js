import assert from 'node:assert/strict';
import test from 'node:test';

import { z } from 'zod';

import { classifyProviderError, generateJson } from './llmClient.js';

const schema = {
  type: 'object',
  properties: { title: { type: 'string' } },
  required: ['title'],
};
const responseSchema = z.object({ title: z.string() });
const options = (generateContent, extra = {}) => ({
  apiKey: 'test-key-never-log-this',
  prompt: 'private teacher prompt that must never be logged',
  schema,
  responseSchema,
  clientFactory: () => ({ models: { generateContent } }),
  ...extra,
});

test('Gemini JSON diagnostics keep provider and local failures distinct', async (t) => {
  await t.test(
    'invalid API key provider error preserves safe cause metadata',
    async () => {
      const providerError = Object.assign(
        new Error('API key test-key-never-log-this rejected'),
        { status: 401, code: 'UNAUTHENTICATED' }
      );
      await assert.rejects(
        () =>
          generateJson(
            options(async () => {
              throw providerError;
            })
          ),
        (error) =>
          error.code === 'AI_AUTH_ERROR' &&
          error.cause === providerError &&
          error.providerStatus === 401
      );
    }
  );
  await t.test('invalid model is rejected before SDK request', async () => {
    await assert.rejects(
      () => generateJson(options(async () => ({}), { model: 'wrong-model' })),
      { code: 'INVALID_MODEL' }
    );
  });
  await t.test(
    'provider reports unsupported JSON schema separately',
    async () => {
      await assert.rejects(
        () =>
          generateJson(
            options(async () => {
              throw Object.assign(
                new Error('responseJsonSchema is unsupported'),
                { status: 400 }
              );
            })
          ),
        { code: 'AI_SCHEMA_ERROR' }
      );
    }
  );
  await t.test(
    'rate limit and network errors are classified correctly',
    async () => {
      assert.equal(
        classifyProviderError(
          Object.assign(new Error('too many requests'), { status: 429 })
        ),
        'RATE_LIMIT_EXCEEDED'
      );
      await assert.rejects(
        () =>
          generateJson(
            options(async () => {
              throw new Error('fetch failed: ENOTFOUND');
            })
          ),
        { code: 'AI_NETWORK_ERROR' }
      );
    }
  );
  await t.test('request timeout is distinct', async () => {
    await assert.rejects(
      () =>
        generateJson(options(() => new Promise(() => {}), { timeoutMs: 1 })),
      { code: 'AI_TIMEOUT' }
    );
  });
  await t.test(
    'empty, malformed, and schema-mismatched responses are local failures',
    async () => {
      await assert.rejects(
        () => generateJson(options(async () => ({ text: '' }))),
        { code: 'EMPTY_MODEL_RESPONSE' }
      );
      await assert.rejects(
        () => generateJson(options(async () => ({ text: '{bad' }))),
        { code: 'INVALID_JSON_RESPONSE' }
      );
      await assert.rejects(
        () => generateJson(options(async () => ({ text: '{"other":true}' }))),
        { code: 'RESPONSE_SCHEMA_MISMATCH' }
      );
    }
  );
  await t.test('successful mocked SDK JSON response is validated', async () => {
    assert.deepEqual(
      await generateJson(options(async () => ({ text: '{"title":"Lesson"}' }))),
      { title: 'Lesson' }
    );
  });
});

test('diagnostic code does not include sensitive request payload fields', async () => {
  const source = await import('node:fs/promises').then((fs) =>
    fs.readFile(new URL('./llmClient.js', import.meta.url), 'utf8')
  );
  assert.match(
    source,
    /Never add prompts, responses, keys, headers, URLs, or raw errors/
  );
  assert.doesNotMatch(
    source,
    /console\.error\([^\n]*(prompt|apiKey|text|error\.message)/
  );
});
