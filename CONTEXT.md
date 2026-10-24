# TeachFlowAI — Project Context and Handoff to Codex

_Last updated: 2026-10-23. This document summarizes a ChatGPT discussion. Treat implementation claims as reported until independently verified against the current repository._

## 1. Goal and assignment

Build **TeachFlowAI**, a web app where a teacher uploads a file and enters teaching instructions. The app generates an interactive lesson chat that **teaches** a student, rather than simply summarizing or repeating the uploaded file.

The original assignment (`AI-Engineer-Home-Assignment.pdf`) specifies:
- Frontend: **React, Vite, Tailwind CSS, JavaScript**; backend: **Node.js**.
- File upload + teacher prompt; interactive student chat with **streaming** and **Stop** functionality.
- Visible lesson progress, e.g. “step 3 of 7”.
- Ability to inspect the source passage behind a tutor message.
- Loading, empty, and error states; mobile usability.
- Clear separation of **AI logic**, **lesson state**, and **UI**. Lesson plan and progress must exist in app state, independently of the chat transcript.
- Be robust to unfamiliar school documents, including RTL languages, scans, formulas, tables, and large/odd files. Supporting every case is not mandatory, but failures should be handled deliberately.
- Reviewers bring **their own API key**, entered in a settings field; send it with each request; **never store or log it**. A host environment key is optional.
- Deliver a public GitHub repository, working live URL, `README.md`, and `DECISIONS.md` (decisions and tradeoffs, known limitations, what to do with four more hours, and approximately five pedagogical test scenarios). Meaningful commit history matters.
- Evaluation emphasizes decision quality, maintainability, architecture, UX/UI, and **pedagogy**. The assignment explicitly favors a smaller polished product over a larger broken one.

## 2. Repository and environment

- GitHub: https://github.com/asafzenou/TeachFlowAI/tree/polish-production-readiness
- Local workspace: `C:\github\TeachFlowAI`
- Windows PowerShell / VS Code.
- Intended deployment: **Vercel**, subject to validation of Node serverless routing, streaming, payload and duration limits.
- Provider: **Google Gemini API via `@google/genai`**, using Google AI Studio **Free Tier** (user's Google project was visibly marked Free tier).
- Model seen in a previously reviewed configuration: `gemini-2.5-flash`; **verify the current actual configuration**, do not assume.
- App settings accept a Gemini API key for the current browser session. User confirmed the Google AI Studio project has Free Tier, but **this does not prove live Gemini calls work**.
- One `npm run dev` from repository root starts both Vite and Node via `concurrently`. Observed frontend `http://localhost:5173` and backend `http://localhost:3001`. Running it twice makes Vite move to port 5174 and may cause port conflicts; run only one instance.
- An empty `GEMINI_API_KEY=` in `.env` is not necessarily a problem because the user-provided key should be sent with API requests. After reload, the key may need to be reentered.

## 3. Architecture and engineering choices

Discussion favored a lean staged / agentic architecture rather than complex orchestration:
1. Parse uploaded document and extract source chunks.
2. `lessonPlanner` creates a structured lesson plan from bounded context.
3. `tutorAgent` teaches one concept at a time, asks questions, gives hints for mistakes, handles partial answers, and updates student progress conditionally.
4. Store lesson plan and progress separately from the chat history.
5. Keep source grounding traceable to document passages.

Do **not** add LangGraph, a vector database, database persistence, extra agents or an LLM-as-a-Judge by default. Any such addition needs a concrete benefit and explicit tradeoff analysis (latency, quota, correctness, maintainability). Education quality and reliable UX matter most.

## 4. Changes reported by Codex (not independently audited)

Codex reported completing a production-hardening pass:
- Native Gemini streaming replaces artificial SSE chunking.
- Streamed tutor text is separated from schema-validated evaluation/progress.
- Browser → backend → Gemini cancellation propagation, with no progress updates after abort.
- Bounded representative planning context for long documents.
- Stronger lesson state validation and transition consistency.
- Better tutor prompts for hints, partial understanding, source grounding, single-concept teaching, and language/style adherence.
- `DECISIONS.md` added and README expanded.
- Reported passes: `npm.cmd run check`, `npm.cmd test` (12 passing at the time), and `npm.cmd run build`.
- Codex could not commit because `.git/index.lock` could not be created due to read-only `.git` access in its workspace. The unrelated untracked ZIP was left alone.

These are *Codex's reports*, not a substitute for reviewing the latest branch or doing live integration tests.

## 5. Current blocking bug: lesson creation fails

A test was prepared using a two-page PDF about the water cycle (`TeachFlowAI_Water_Cycle_Evaluation.pdf`) and a teacher prompt instructing the tutor to teach a 12-year-old in Hebrew, Socratically, one concept at a time, with hints and citations.

When the user clicks **Create lesson**:
- Browser Network tab showed request `create` returning **HTTP 502**, sometimes within tens of milliseconds.
- Frontend displays **“Gemini could not complete the request.”**
- In a separate attempt after page refresh, frontend showed **“A Gemini API key is required.”** That is a distinct missing-key case: reenter the key in app Settings after a refresh.
- Both Vite and backend were observed starting successfully, e.g. `TeachFlowAI API listening on http://localhost:3001`.
- **Root cause of the 502 is NOT known yet.** Possibilities discussed (not confirmed) include unsupported model, incompatible JSON schema/request, API quota, provider authentication, SDK errors or local JSON parsing. Do not declare any as root cause without evidence.

A version of `backend/services/llmClient.js` shown in chat used `GoogleGenAI`, `ai.models.generateContent` with `responseMimeType: 'application/json'` and `responseJsonSchema`, followed by `JSON.parse(response.text)`; generic error handling converted many errors to `ApiError(502, 'AI_PROVIDER_ERROR', 'Gemini could not complete the request.')`. Codex subsequently modified this file, so inspect the current implementation.

## 6. Logging/diagnostics investigation

 Actual search results of backend code showed:
- `backend/config/index.js` has `geminiDiagnostics` parsed from `GEMINI_DIAGNOSTICS`.
- `backend/services/llmClient.js`: `diagnosticsEnabled()` checks `process.env.NODE_ENV !== 'production' && environment.geminiDiagnostics`.
- `llmClient.js` contains diagnostic stages including `API_KEY_VALIDATION`, `MODEL_SELECTION`, `SCHEMA_CONFIGURATION`, `SDK_INIT`, `REQUEST_CONFIGURATION`, `API_REQUEST`, `RESPONSE_TEXT_EXTRACTION`, `JSON_PARSING`, `RESPONSE_SCHEMA_VALIDATION`, `PROVIDER_ERROR`, `STREAM_INIT`, `STREAM_CANCELLATION`.
- `backend/routes/createLesson.js` and `backend/routes/chatLesson.js` import `logGeminiDiagnostic`.
- `backend/services/llmClient.test.js` has tests for distinct error categories and secret-safe logging.

Commands tried in PowerShell before `npm run dev`:
```powershell
$env:NODE_ENV="development"
$env:GEMINI_DIAGNOSTICS="true"
npm run dev
```
Despite this, screenshots of the terminal showed only startup output; **it was not conclusively established that a new failing lesson creation request occurred while those terminal logs were observed**, or whether diagnostics were correctly loaded. Need test with a request ID and clear reproduction. Verify config parsing, environment inheritance, active process, proxy and route execution.

User preference subsequently clarified: **basic backend application logging should always be on by default**, without special flags; only verbose internal DEBUG logs should require an opt-in. Desired logging:
- Request/response status, correlation ID, duration and relevant stage names.
- PDF parsing, chunking, lesson planning, Gemini SDK request, sanitized provider error category/status, JSON parsing/schema validation, tutor streaming, progress updates and cancellation.
- INFO/WARN/ERROR always available (including concise safe errors in production); DEBUG optional.
- Never log API keys, authorization headers, raw document text, teacher prompts, full AI responses or per-token stream content. No secrets in source control.

A **short prompt** was provided to Codex to implement centralized always-on structured logging and investigate the 502. **The conversation contains no verified result yet from Codex executing that final logging prompt.** Do not assume it has been implemented.

## 7. How to run and diagnose

From repository root in a single PowerShell terminal:
```powershell
cd C:\github\TeachFlowAI
npm run dev
```
Open `http://localhost:5173`, enter Gemini API key through app Settings, upload a small PDF, enter teacher prompt and click **Create lesson**. Keep that backend terminal open. In browser DevTools check **Network → create → Response**, and associate the failure with backend logs/correlation ID. Inspect/confirm actual command scripts and middleware in repository before changing them.

If baseline logging has *not* been implemented, separately check diagnostics with:
```powershell
$env:NODE_ENV="development"
$env:GEMINI_DIAGNOSTICS="true"
npm run dev
```
Stop any previous `npm run dev` process (`Ctrl+C`) before starting another. Verify flag parsing against the actual code.

Do not post API keys or raw request headers in ChatGPT; sanitize any logs first.

## 8. Evaluation once lesson creation works

Use the previously created water-cycle PDF and this teacher instruction:

> Teach the uploaded document to a 12-year-old student in Hebrew only. Use a Socratic teaching style. Create a lesson of 4–6 short steps, teaching one concept at a time. After each explanation, ask exactly one question and wait for the student's answer. Do not advance until the student demonstrates understanding. If the student answers incorrectly, offer a hint instead of revealing the answer. If the answer is partially correct, acknowledge what is correct and ask about the missing part. Use examples from everyday life. Ground factual claims in the uploaded PDF and provide source references. Keep each response under 100 Hebrew words.

Test scenarios (adapt messages to what tutor actually asks):
1. **Native streaming:** first lesson response appears incrementally as generated, rather than only after full model completion.
2. **Incorrect answer:** student says “Water disappears when it evaporates.” Tutor corrects with a hint and does not advance.
3. **Partial answer:** student says the sun warms the water; tutor recognizes the correct part and asks what happens to water.
4. **Correct answer:** student says liquid water becomes water vapor in air and does not disappear; tutor acknowledges comprehension and advances appropriately.
5. **Grounding:** ask how many milliliters tray C lost; the prepared PDF test expectation was **39 mL (100 − 61)**, with a source reference to page 2. Verify the test fixture before relying on this expected value.
6. **Out-of-source fact:** ask exact altitude of cloud formation; tutor should say this is not specified in source rather than invent a citation.
7. **Stop/abort:** stop during generation; no late completion and no progress mutation.
8. **Hebrew/RTL:** correct language, UI direction, and teacher instruction adherence.
9. **Long/unexpected documents, invalid input, rate limit:** graceful handling.

Record **observed** outcomes, not imagined ones, in `DECISIONS.md`.

## 9. Priorities for next Codex session

1. **Inspect the latest branch** before assuming fixes reported earlier are present.
2. Confirm whether always-on application logger was implemented; if not, implement it minimally with safe categorized backend errors and request IDs.
3. Reproduce `POST .../create` 502, capture the actual failing stage/provider status safely, and **fix only verified root cause(s)**. If no live key available, document the exact local steps for the user to capture safe evidence; do not claim a live fix.
4. Verify Google Gemini Free Tier model availability without adding billing or storing keys. The user provides the key through Settings; don't hardcode it.
5. Rerun `npm run check`, `npm test`, `npm run build` and add regression tests as appropriate.
6. Once lesson creation works, manually test real streaming/Stop, grounded tutoring, progress gating, Hebrew/RTL and citation behavior using the sample PDF.
7. Confirm Vercel live deployment using a private-browser test, and finish README/DECISIONS with honest limitations and tests.
8. Make small commits if permissions allow; otherwise report the blocker.

## 10. What to report back

Give a concise summary of:
- Files actually inspected/modified.
- Which hypotheses were confirmed versus merely suspected.
- Actual test/build outcomes and whether a real Gemini call was performed.
- Exact reproducible steps and **sanitized** request ID, failure stage, error category and provider HTTP status.
- A short **Hebrew Windows PowerShell runbook** for starting the app, triggering a request and locating logs.
- A compact section named **COPY TO CHATGPT** with only safe debugging metadata.

**Guiding principle:** Make a reliable, pedagogically strong, explainable MVP; do not enlarge the architecture merely for appearances.
