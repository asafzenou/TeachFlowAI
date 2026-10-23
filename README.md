# TeachFlowAI

TeachFlowAI turns a PDF or TXT document into a grounded, interactive AI lesson. Teachers provide teaching instructions; a source-aware tutor guides the student and advances only after validated understanding.

## Stack and architecture

React 19, Vite, Tailwind, Node/Express-compatible Vercel Functions, Gemini (`@google/genai`), SSE, Zod, and in-memory document processing.

- `frontend/` — React lesson workspace and SSE client.
- `api/` — Vercel function entry points.
- `backend/agents/` — lesson planner and tutor orchestration.
- `backend/services/` — Gemini, document extraction, and source retrieval.
- `backend/lesson/` — explicit lesson/progress state and transition validation.

Tutor prose uses Gemini's native `generateContentStream`, so text arrives incrementally. Evaluation/progress are produced separately as validated JSON; progress is sent only after the text stream completes. Browser cancellation closes the SSE request, aborts the provider stream, and prevents progress updates.

Documents are chunked with page references. Planning receives a bounded representative context (first/middle/last, then sequential fill); each tutoring turn receives only the relevant planned sources within a context budget.

## Local setup

Requires Node.js 24+ and npm 11+.

1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` for the local backend fallback.
2. Run `npm.cmd install` (PowerShell may require `.cmd` because of execution policy).
3. Run `npm.cmd run dev`, then open `http://localhost:5173`.

The in-app key setting is browser-memory only and is sent to the existing backend per request. Never put a key in `VITE_` variables, source control, logs, or browser persistence.

## Logging

Backend logging is enabled by default. `npm.cmd run dev` emits newline-delimited JSON records with a timestamp, request ID, operation, stage, response status, and duration. It records request lifecycle, PDF parsing/chunking, planning, Gemini calls, JSON validation, tutor streaming, progress, and safe error classifications. It never records API keys, credentials, document content, prompts, response text, or individual stream tokens. Set `LOG_LEVEL=debug` only when additional safe diagnostics are needed.

## Commands

- `npm.cmd test` — unit tests.
- `npm.cmd run check` — formatting and lint checks.
- `npm.cmd run build` — production frontend build.

## API and deployment

`POST /api/lesson/create` accepts a multipart PDF/TXT upload (maximum 4 MB). `POST /api/lesson/chat` is a POST-based SSE response. Text-extractable PDFs are supported; scanned/image-only PDFs return an OCR guidance error.

Local interactive API documentation is available at `http://localhost:3001/docs`; its OpenAPI document is at `http://localhost:3001/openapi.json`. On Vercel, use `/api/docs` and `/api/openapi.json`.

Deploy to Vercel with `GEMINI_API_KEY` set in Project Settings when the server supplies a key. The configured serverless duration is 60 seconds. Uploads are parsed in memory, no temporary files are created, and no deployment has been claimed as tested here. Verify a real-key streamed response after deployment, since streaming behavior can depend on the chosen Vercel runtime/plan.

## Known limitations

- No OCR for scanned PDFs.
- Lesson state is client-held for this MVP; there is no cross-device persistence.
- Provider cancellation stops the local request, but usage already accepted by Gemini may still be charged.
