export class ApiClientError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}
export async function responseError(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return new ApiClientError(
    body?.error?.message || 'Something went wrong. Please try again.',
    body?.error?.code || 'REQUEST_FAILED',
    response.status
  );
}
export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw await responseError(response);
  }
  return response.json();
}
