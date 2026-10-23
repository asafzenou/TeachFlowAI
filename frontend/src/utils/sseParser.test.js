import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSseFrames } from './sseParser.js';

test('parses several SSE frames and retains an incomplete frame', () => {
  const result = parseSseFrames(
    'event: delta\ndata: {"text":"Hello"}\n\nevent: sources\ndata: {"sourceIds":["chunk_1"]}\n\nevent: delta\ndata: {'
  );
  assert.deepEqual(result.frames, [
    { event: 'delta', payload: '{"text":"Hello"}' },
    { event: 'sources', payload: '{"sourceIds":["chunk_1"]}' },
  ]);
  assert.equal(result.remainder, 'event: delta\ndata: {');
});
