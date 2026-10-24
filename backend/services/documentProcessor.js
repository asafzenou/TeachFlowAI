import { createRequire } from 'node:module';

import { appConfig } from '../config/index.js';
import { ApiError } from '../errors.js';
import { logStage } from '../logger.js';

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
export async function processDocument(
  file,
  context = { operation: 'document-processing' }
) {
  if (!file) {
    throw new ApiError(400, 'MISSING_FILE', 'Please upload a PDF or TXT file.');
  }
  if (file.size > appConfig.document.maxFileBytes) {
    throw new ApiError(
      413,
      'FILE_TOO_LARGE',
      'The file must be 2 MB or smaller.'
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
    let parser;
    try {
      logStage(context, 'PDF_PARSING_STARTED');
      // Initialize the PDF worker for serverless environments.
      require('pdf-parse/worker');
      const { PDFParse } = require('pdf-parse');
      parser = new PDFParse({
        data: file.buffer,
      });
      const result = await parser.getText();
      pages = result.pages?.map((page, index) => ({
        text: page.text || '',
        page: index + 1,
      })) || [
        {
          text: result.text || '',
          page: 1,
        },
      ];
      logStage(context, 'PDF_PARSING_COMPLETED', {
        pageCount: pages.length,
      });
    } catch (cause) {
      // Log the original error for production diagnostics.
      // Do not log document content or API keys.
      console.error('[PDF_PARSING_FAILED]', {
        name: cause?.name,
        message: cause?.message,
        stack: cause?.stack,
        nestedCause: cause?.cause?.message,
        nodeVersion: process.version,
        platform: process.platform,
      });

      logStage(context, 'PDF_PARSING_FAILED', {
        rootCause: 'PDF_EXTRACTION_FAILED',
      });

      throw new ApiError(
        422,
        'PDF_EXTRACTION_FAILED',
        'This PDF could not be read. Image-only/scanned PDFs need OCR.',
        { cause, stage: 'PDF_PARSING' }
      );
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (cleanupError) {
          console.error('[PDF_CLEANUP_FAILED]', {
            name: cleanupError?.name,
            message: cleanupError?.message,
          });
        }
      }
    }
  } else {
    pages = [
      {
        text: file.buffer.toString('utf8'),
        page: 1,
      },
    ];
  }

  const raw = pages
    .map(({ text }) => text || '')
    .join('\n')
    .trim();

  if (!raw) {
    throw new ApiError(
      422,
      'EMPTY_DOCUMENT',
      'The document has no extractable text. Scanned PDFs need OCR.'
    );
  }

  if (
    Buffer.byteLength(raw, 'utf8') >
    appConfig.document.maxExtractedTextBytes
  ) {
    throw new ApiError(
      413,
      'EXTRACTED_TEXT_TOO_LARGE',
      'The document contains too much extractable text for an in-browser lesson.'
    );
  }

  const sources = pages
    .flatMap(({ text, page }) => chunksFor(text || '', page))
    .filter(({ text }) => text.length > 0)
    .map((chunk, index) => ({
      id: `chunk_${index + 1}`,
      ...chunk,
    }));

  logStage(context, 'DOCUMENT_CHUNKING_COMPLETED', {
    pageCount: pages.length,
    sourceCount: sources.length,
  });

  return {
    sources,
    coverage: `All extractable text was chunked. Files are limited to ${appConfig.document.maxFileBytes} bytes.`,
  };
}

