import { consumeSse } from '../utils/sseParser.js';
import { fetchJson, responseError } from './apiClient.js';
export async function createLesson({ file, teacherPrompt, apiKey, signal }) {
  const form = new FormData();
  form.append('file', file);
  form.append('teacherPrompt', teacherPrompt);
  if (apiKey.trim()) {
    form.append('apiKey', apiKey.trim());
  }
  return fetchJson('/api/lesson/create', {
    method: 'POST',
    body: form,
    signal,
  });
}
export async function chatLesson({ body, signal, onEvent }) {
  const response = await fetch('/api/lesson/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw await responseError(response);
  }
  if (!response.body) {
    throw new Error('The tutor response did not include a stream.');
  }
  await consumeSse(response.body, onEvent);
}
