import { appConfig } from './config/index.js';
import { ApiError } from './errors.js';

export function jsonByteLength(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function assertLessonResponseSize(value) {
  if (jsonByteLength(value) > appConfig.input.maxLessonResponseBytes) {
    throw new ApiError(
      413,
      'LESSON_RESPONSE_TOO_LARGE',
      'This lesson is too large to safely return in one serverless response.'
    );
  }
}
