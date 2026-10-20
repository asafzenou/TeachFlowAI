import { createRequire } from 'node:module';

import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';

const require = createRequire(import.meta.url);
const SUPPORTED = new Set(['text/plain', 'application/pdf']);

function chunksFor(text, page) {
  const normalized = text.replace(/\r/g, '').trim();
  const chunks = [];
  const { chunkSizeCharacters, chunkOverlapCharacters } = appConfig.document;
  for (
    let index = 0;
    index < normalized.length;
    index += chunkSizeCharacters - chunkOverlapCharacters
  ) {
    const chunk = normalized.slice(index, index + chunkSizeCharacters).trim();
    if (chunk) {
      chunks.push({ text: chunk, page });
    }
  }
  return chunks;
}
export async function processDocument(file) {
  if (!file) {
    throw new ApiError(400, 'MISSING_FILE', 'Please upload a PDF or TXT file.');
  }
  if (file.size > appConfig.document.maxFileBytes) {
    throw new ApiError(
      413,
      'FILE_TOO_LARGE',
      'The file must be 4 MB or smaller.'
    );
  }
  const ext = file.originalname?.split('.').pop()?.toLowerCase();
  if (!SUPPORTED.has(file.mimetype) && !['txt', 'pdf'].includes(ext)) {
    throw new ApiError(
      415,
      'UNSUPPORTED_FILE',
      'Please upload a supported PDF or TXT file.'
    );
  }
  let pages;
  if (ext === 'pdf' || file.mimetype === 'application/pdf') {
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      pages = result.pages?.map((page, i) => ({
        text: page.text,
        page: i + 1,
      })) || [{ text: result.text, page: 1 }];
    } catch {
      throw new ApiError(
        422,
        'PDF_EXTRACTION_FAILED',
        'This PDF could not be read. Image-only/scanned PDFs need OCR.'
      );
    }
  } else {
    pages = [{ text: file.buffer.toString('utf8'), page: 1 }];
  }
  const raw = pages
    .map(({ text }) => text)
    .join('')
    .trim();
  if (!raw) {
    throw new ApiError(
      422,
      'EMPTY_DOCUMENT',
      'The document has no extractable text. Scanned PDFs need OCR.'
    );
  }
  const sources = pages
    .flatMap(({ text, page }) => chunksFor(text, page))
    .filter(({ text }) => text.length > 0)
    .map((chunk, index) => ({ id: `chunk_${index + 1}`, ...chunk }));
  return {
    sources,
    coverage: `All extractable text was chunked. Files are limited to ${appConfig.document.maxFileBytes} bytes.`,
  };
}
