# Teach Me This File

Teach Me This File turns a PDF or TXT document into a grounded, interactive AI lesson. Teachers provide natural-language teaching instructions; students learn through a source-aware tutor that advances only after backend-validated understanding.

## Project structure

- `frontend/` — React/Vite application; browser source lives in `frontend/src/` and its Vite entry document is `frontend/index.html`.
- `api/` — Vercel Serverless Function entry points.
- `backend/agents/` — lesson planning and tutoring AI orchestration.
- `backend/services/` — Gemini, document extraction, and source retrieval.
- `backend/lesson/` — server-authoritative lesson and progress state.
- `backend/routes/` — HTTP handlers shared by local Express and Vercel Functions.
- `config/` — version-controlled, non-secret application limits and defaults.

## Run locally

Requires Node.js 24+ and npm 11+.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` for a local backend fallback. Do not use `VITE_` variables for keys.
3. Start the React client and Express API: `npm run dev`
4. Open `http://localhost:5173`

You can instead enter a Gemini key in the in-app settings. It remains in browser memory only and is submitted directly to the existing backend on lesson requests.

## Commands

- `npm run dev` — Vite client and local Express API
- `npm test` — backend tests
- `node --test frontend/src/**/*.test.js` — frontend utility tests
- `npm run check` — formatting and lint checks
- `npm run build` — production Vite build

## Backend contract

The frontend uses `POST /api/lesson/create` for multipart uploads and `POST /api/lesson/chat` for POST-based SSE tutoring. The server accepts PDF/TXT files up to 4 MB, and supports text-extractable PDFs only. Full backend contracts are in [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md); frontend implementation details and diagrams are in [frontend/src/FRONTEND_ARCHITECTURE.md](frontend/src/FRONTEND_ARCHITECTURE.md).

## Deployment

Deploy this repository to Vercel. The Vite frontend is built into `dist`, and files in `api/` are deployed as Node.js Serverless Functions. Set `GEMINI_API_KEY` in Vercel Project Settings when the server should supply the key; it is never bundled into the frontend.
