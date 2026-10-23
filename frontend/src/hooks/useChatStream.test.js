import assert from 'node:assert/strict';
import test from 'node:test';

import { historyForApi } from './useChatStream.js';

test('interrupted tutor text is excluded from future LLM history', () => {
  assert.deepEqual(
    historyForApi([
      { role: 'student', content: 'My answer' },
      { role: 'tutor', content: 'Complete response', complete: true },
      {
        role: 'tutor',
        content: 'Partial response',
        complete: true,
        interrupted: true,
      },
      { role: 'tutor', content: 'Still streaming', complete: false },
    ]),
    [
      { role: 'student', content: 'My answer' },
      { role: 'tutor', content: 'Complete response' },
    ]
  );
});
