# Teach Me This File

Teach Me This File is a source-grounded AI tutoring prototype for the AI Engineer home assignment. A teacher uploads a document, gives teaching instructions, and receives an interactive, step-based lesson rather than a one-shot summary.

website: https://teach-flow-ai-nine.vercel.app

## What it does

- Accepts text-based PDF and TXT files up to 2 MiB.
- Generates a 3–8 step lesson using the uploaded material and teacher instructions.
- Streams tutor replies, supports cancellation, and checks understanding before advancing.
- Shows lesson progress and source passages associated with each step.
- Supports a reviewer-supplied Gemini API key for the current browser session.

The app is designed for the assignment's core requirements: streaming interaction, visible progress, a lesson plan and progress state separate from chat history, source-grounded teaching, and clear separation of UI, lesson logic, and AI integration.

## Architecture and stack

| Area | Implementation |
| --- | --- |
| UI | React 19, Vite, Tailwind CSS |
| API | Express 5, deployed as Vercel Functions |
| AI | Google Gemini via `@google/genai` (configured model: `gemini-3.5-flash-lite`) |
| Validation | Zod |
| Documents | In-memory TXT/PDF extraction with page-aware source chunks |
| Streaming | Server-Sent Events (SSE) |

`frontend/` contains the React client. `backend/` contains document processing, lesson state, agent prompts, provider access, and HTTP routes. `api/` adapts the Express app for Vercel Functions. Lesson state is held by the browser for the active session and is validated on each chat request; there is no database or account system.

## Local development

Prerequisites: Node.js 24+ and npm 11+.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The local API listens on `http://localhost:3001`; API documentation is available at `http://localhost:3001/docs` and OpenAPI JSON at `http://localhost:3001/openapi.json`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Vite client and local Express API |
| `npm test` | Run Node test suites |
| `npm run check` | Run formatting and lint checks |
| `npm run build` | Create the production frontend bundle |

On PowerShell, use `npm.cmd` if the npm PowerShell shim is blocked by execution policy.

## Configuration and API keys

Copy `.env.example` to `.env` only if local overrides are needed. `.env` is ignored by Git.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Server-only local/deployment fallback key |
| `BACKEND_PORT` | No | Local API port; defaults to `3001` |
| `VITE_DEV_PORT` | No | Vite development-server port; defaults to `5173` |
| `BACKEND_PROXY_TARGET` | No | Local Vite proxy target; defaults to `http://localhost:3001` |
| `NODE_ENV` | No | Set to `development` locally to include safe diagnostic metadata in applicable API errors |
| `DEBUG_GEMINI` | No | Reserved local debugging flag; it is not currently read by the application |

For the expected reviewer flow, enter a Gemini key in **Settings**. It is held only in React memory, sent with the applicable request, and is not written to local/session storage, lesson state, or application logs. Reloading the page clears it. A server fallback key is read only from `GEMINI_API_KEY`; never use a `VITE_` prefix for a secret, because Vite exposes such values to client bundles.

Use HTTPS for deployed reviews. The backend necessarily receives a reviewer key to call Gemini, so do not enter a key on an untrusted deployment.

### Local debugging

For local debugging, add the following to `.env`:

```dotenv
NODE_ENV="development"
```

The server writes safe operational logs to the terminal (request IDs, stages, status codes, and provider classifications). It intentionally does not log API keys, prompts, document text, model responses, or raw provider errors. `NODE_ENV=development` enables safe diagnostic metadata in applicable API errors.

## Usage

1. Open Settings and enter a Gemini API key if the server has no fallback key.
2. Upload a text-based PDF or TXT document.
3. Describe audience, language, teaching style, and learning goals.
4. Select automatic lesson length or 3–8 custom steps, then create the lesson.
5. Answer the tutor's questions. Inspect source references and use Stop to cancel a response when needed.

Scanned PDFs are not OCR'd. Complex tables, formulas, diagrams, and RTL layouts can extract imperfectly. The lesson planner uses bounded source context, so very long documents may have incomplete coverage.

## Deployment

Deploy the repository root to Vercel. `vercel.json` builds the Vite client to `dist/` and maps the functions in `api/`; function duration is configured for the lesson endpoints. Set `GEMINI_API_KEY` only as a server-side Vercel environment variable when a fallback is desired. Do not put it in build-time client variables.

Before sharing a deployment, test it in a private browser with a reviewer-provided key: upload a document, create a lesson, verify streamed output and Stop, inspect a source reference, and confirm progress only advances after demonstrated understanding.

## Review notes

- [Architecture decisions and trade-offs](./docs/DECISIONS.md)
- [Manual evaluation scenarios and evidence](./docs/EVALUATION.md)
- [Backend architecture](./docs/BACKEND_ARCHITECTURE.md)
- [Frontend architecture](./docs/FRONTEND_ARCHITECTURE.md)

Known prototype constraints include no OCR, no persistent accounts/sessions, client-held (not cryptographically signed) lesson state, provider quota/model dependency, and the need to validate serverless streaming and payload limits on the target Vercel plan.
