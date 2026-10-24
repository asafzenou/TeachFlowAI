# TeachFlowAI — Teach Me This File

A source-grounded AI tutor that turns a teacher-uploaded document and teaching instructions into a guided, interactive lesson. The tutor teaches **one concept at a time**, checks understanding, adapts its response, and tracks lesson progress separately from the chat transcript.

> **Live app:** ADD_VERCEL_URL_HERE  
> **Repository:** ADD_PUBLIC_GITHUB_URL_HERE

## What you can do

1. Upload a text-based **PDF** or **TXT** document (up to **2 MB**, with up to **1 MiB** of extracted text).
2. Supply a teacher prompt describing audience, language, style, and goals.
3. Choose **Auto (3–8 steps)** or a specific lesson length (**3–8 steps**).
4. Start a lesson, answer the tutor's questions, and view step-by-step progress.
5. Inspect cited source passages behind tutor messages, receive streamed responses, and stop a response in progress.

The app is designed to teach from the uploaded file, not simply summarize it. It supports Hebrew content, subject to the PDF's extractable text and layout quality.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, Vite, Tailwind CSS, JavaScript | Setup, chat, streaming UI, lesson progress and settings |
| HTTP API | Node.js, Express, Vercel Functions | Upload validation, lesson creation, chat SSE endpoints |
| Lesson planner | Gemini with structured output + Zod validation | Generate bounded, source-aware lesson plan |
| Tutor | Gemini structured evaluation + native streamed text | Assess student response, teach, and conditionally advance |
| Lesson state | Client-held structured state, backend validated | Persist plan and progress during the browser session |
| Documents | In-memory PDF/TXT extraction and page-aware chunks | Bounded source context and citations |

Key folders: `frontend/src/components/`, `frontend/src/hooks/`, `backend/agents/`, `backend/lesson/`, `backend/services/`, `backend/routes/`, and `api/`.

**Teaching flow:** upload → extract and chunk → create validated lesson plan → stream tutor messages → evaluate student answer → update progress only when appropriate. Evaluation and streamed prose are distinct model operations; the app does not use a separate LLM-as-a-Judge service.

## Run locally

**Prerequisites:** Node.js **24+**, npm **11+**, and a Gemini API key.

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. The backend starts at **http://localhost:3001**. Enter your API key in the app's Settings panel. Alternatively, copy `.env.example` to `.env` and set `GEMINI_API_KEY` as a **server-only** local fallback. Do not use a `VITE_` prefix for secrets.

On PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks the npm PowerShell shim.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and the local backend |
| `npm test` | Run automated Node tests |
| `npm run check` | Formatting and lint checks |
| `npm run build` | Build the frontend |

Local API documentation: **http://localhost:3001/docs** (OpenAPI JSON: `/openapi.json`).

## Deploy on Vercel

Deploy the **repository root** to Vercel. The Vite build emits `dist/`; the `api/` directory provides Vercel Function entry points. The repo includes `vercel.json` configuration. If you want a server-side fallback key, set `GEMINI_API_KEY` **only in Vercel server-side environment variables**. Reviewers can instead enter their own key in Settings.

Before submitting, verify **the actual deployed URL** in a private browser session: upload a PDF, create a lesson with a reviewer-provided key, stream a reply, stop a reply, inspect a citation, and confirm progress. **Do not consider deployment verified until this has been tested.**

## API key handling

The key is kept in ephemeral React state and sent to the backend per request. Application code is intended not to persist or log the key. Use **HTTPS** for the live app; TLS protects transport but the receiving server can read the key to call Gemini. Do not commit `.env` or post keys in issues, logs, screenshots, or examples.

## Limits and known tradeoffs

- **No OCR**: scanned/image-only PDFs need text extraction before upload.
- PDF tables, formulas, complex layouts, and some RTL extraction may be imperfect.
- The planner samples bounded source context; large documents can omit important details from the generated plan.
- No database, accounts, cross-device sync, or authoritative server-side progress history. Client-held state is validated but not cryptographically signed.
- Gemini model availability, quotas, and response behavior depend on the reviewer's API key and provider.
- Aborting a stream does not guarantee that already accepted provider usage is free.
- Function size/time limits and streaming must be confirmed on the actual hosting plan.

## Tests and evidence

Automated tests are in `backend/backend.test.js`, `backend/services/llmClient.test.js`, `frontend/src/hooks/useChatStream.test.js`, and `frontend/src/utils/sseParser.test.js`. These cover validation, document processing, progress transitions, planner contracts, safe errors, and SSE parsing with mocks. **Automated correctness is not a substitute for a live pedagogical evaluation.**

See **[EVALUATION.md](./EVALUATION.md)** for the five behavioral scenarios, expected outcomes, observed excerpts from an earlier tutor interaction, and a live-run checklist. See **[DECISIONS.md](./DECISIONS.md)** for rationale, deliberate exclusions, limitations, and next steps.

## Submission checklist

- [ ] Replace both URL placeholders above with the **public GitHub repository** and **live app URL**.
- [ ] Test the deployed app in an incognito/private window with the reviewer's key workflow.
- [ ] Run `npm test`, `npm run check`, and `npm run build`; record actual results.
- [ ] Complete and date the live test record in `EVALUATION.md`.
- [ ] Verify no secrets are committed and include meaningful Git commits.
