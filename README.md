# TeachFlowAI

TeachFlowAI turns a PDF or TXT document into a grounded, interactive AI lesson. Teachers provide natural-language teaching instructions; students then learn through a source-aware tutor that advances only from backend-validated understanding.

## Run locally

Requires Node.js 24+ and npm 11+.

1. Install dependencies: `npm install`
2. Optionally copy `.env.example` to `.env` and set `GEMINI_API_KEY` for a local backend fallback. Do not use `VITE_` variables for keys.
3. Start the React client and Express API: `npm run dev`
4. Open `http://localhost:5173`

You can instead enter a Gemini key in the in-app settings. It remains in browser memory only and is submitted directly to the existing backend on lesson requests.

## Commands

- `npm run dev` — Vite client and local Express API
- `npm test` — backend tests
- `node --test src/**/*.test.js` — frontend utility tests
- `npm run check` — formatting and lint checks
- `npm run build` — production Vite build

## Backend contract

The frontend uses `POST /api/lesson/create` for multipart uploads and `POST /api/lesson/chat` for POST-based SSE tutoring. The server accepts PDF/TXT files up to 4 MB, and supports text-extractable PDFs only. Full backend contracts are in [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md); frontend implementation details and diagrams are in [src/FRONTEND_ARCHITECTURE.md](src/FRONTEND_ARCHITECTURE.md).
