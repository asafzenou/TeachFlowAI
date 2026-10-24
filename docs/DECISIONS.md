# Engineering Decisions — TeachFlowAI

This document explains the main choices I made while building TeachFlowAI, why I made them, their trade-offs, what I intentionally left out, and how I evaluated the result.

## 1. Understanding the problem

My goal was to build a system that **teaches a student step by step**, rather than simply summarizing an uploaded file. I believe each learning step should build on the previous one, so the system needs to check whether the student understands the current topic before moving forward.

At the same time, I wanted to balance teaching quality and personalization against LLM calls, token usage, response time, and implementation complexity. These considerations guided the architecture.

## 2. Technology stack, AI provider, and deployment

I used the stack required by the assignment: **React, Vite, Tailwind CSS, JavaScript, and Node.js**, with Express for the backend. I chose **Vercel** for deployment and **Gemini** as the AI provider because it offers models with free-tier access.

Since this is a proof of concept (POC), I prioritized a simple, low-cost setup over extra infrastructure. Vercel's request-size and execution constraints, along with model quotas, latency, and context/token budgets, influenced several decisions below. I used Vercel Functions with in-memory PDF/TXT processing rather than adding a database or separate processing service.

**Trade-off:** The app is straightforward to deploy, but serverless payload, memory, execution-time, and streaming constraints require careful handling. Free-model availability and limits can also change.

For implementation details, see [Backend Architecture](./BACKEND_ARCHITECTURE.md) and [Frontend Architecture](./FRONTEND_ARCHITECTURE.md).

## 3. Agentic flow and learning progression

I chose a **small, orchestrated agentic workflow**, with the main focus on checking the student's understanding. The goal is not only to explain material but also to decide whether the student needs another explanation or can move to the next step.

The workflow has three separate AI responsibilities:

1. **Lesson Planner** — Runs **once at lesson creation**. It uses the teacher's instructions and selected document passages to build a structured lesson plan with objectives, steps, and source references.
2. **Tutor Evaluator** — Runs when the student answers. It evaluates understanding (`correct`, `partial`, `incorrect`, or `unclear`) and returns a structured recommendation for what should happen next, including whether to advance.
3. **Tutor Generator** — Produces the actual student-facing teaching response, using the validated evaluation, current objective, relevant document passages, and conversation context.

The Generator starts the lesson. After that, the repeating loop is **student answer → Evaluator → deterministic validation → Generator response**. The Planner does **not** rebuild the lesson on every turn. A correct answer can advance the lesson only when the application-side rules allow it; otherwise, the tutor stays on the current step and can give a hint or ask a follow-up question. The progress update is committed only after the response finishes successfully.

I separated these responsibilities so each model call gets a focused task and relevant context instead of having one prompt handle everything. This can make decisions easier to validate and help control repeated context, although **separate calls do not automatically reduce total token usage**. In fact, evaluation plus generation adds latency and tokens per student turn. I accepted that cost because checking understanding is central to the product.

I also considered adding another **LLM-as-a-Judge** after generation to review the tutor's answer. I did not add it in this POC: it would mean another model call, more latency, and more complexity. The existing Evaluator acts as an **understanding judge for the student's response**, not an output-quality judge for the Generator. Instead, I used deterministic validation for structured outputs and progress transitions.

The Planner uses structured JSON generation, and the application validates its lesson plan and source references before using them. If the provider returns invalid output, the app should fail safely instead of trusting it.

See [Agentic Flow Architecture](./AGENTIC_FLOW_ARCHITECTURE.md) for the full flow and component responsibilities.

## 4. Document processing and chunking

A key challenge was supporting uploaded teaching materials without sending the entire document to the model on every turn.

I support **TXT files and PDFs with extractable text**. I split extracted text into **chunks of up to 1,800 characters with 200 characters of overlap**. The overlap helps preserve some context when text is split between chunks. Each chunk has a stable source ID and, for PDFs, page information so the UI can show where the tutor's material came from.

I chose a simple fixed-size approach rather than semantic chunking. It is easy to implement and does not require embeddings or another service. The drawback is that chunk boundaries may split a sentence or concept, and extracted PDF reading order is not always perfect.

### Choosing the context for each model call

The lesson planner does not receive unlimited document text. For a broader initial view, the backend selects chunks from the **beginning, middle, and end** of the document, then fills remaining space in order, up to **16,000 source characters**.

During teaching, the backend retrieves chunks linked to the **current lesson step by source ID**, with a limit of **8,000 source characters**. This keeps each tutor turn more focused, reduces repeated input, and supports inspectable source passages.

I deliberately did **not** add a vector database or semantic retrieval. For a single-upload POC, source-ID-based retrieval was simpler, cheaper, and easier to debug. The trade-off is that retrieval depends on the coverage and source links chosen by the Planner. Relevant material outside those references may be missed, especially in long documents. References are at chunk/page level, not exact character spans.

## 5. Lesson length and application state

I let the teacher choose **Auto** or a lesson length of **3–8 steps**. This gives the teacher some control while keeping the lesson structure bounded. More steps can create a longer conversation and more model usage; fewer steps may force the Planner to group several topics together. Model cost is not directly proportional to the number of steps, because student interaction length also matters.

I store the lesson plan, source passages, current step, and progress as **structured application state separate from chat history**. I did not want progress to depend only on what the LLM remembers or says in a message.

For the POC, this state is held on the client and sent to the backend with each request. This avoids a database and keeps the backend stateless. The backend validates the state and transitions, but **client-held state is not signed or tamper-proof** and should not be used as an authoritative educational record. Sessions are also not persisted across devices or after browser state is lost.

See [Backend Architecture](./BACKEND_ARCHITECTURE.md) for the API and progress management, and [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) for client state ownership.

## 6. Streaming, cancellation, and errors

I used **Server-Sent Events (SSE)** to display the tutor's response progressively. The chat exposes a **Stop** control using browser request cancellation, and the backend handles disconnection/cancellation. Progress and the updated lesson state are sent only after successful response completion; an interrupted response should not advance the student. Cancellation does not guarantee that the AI provider has incurred zero cost.

Because the app depends on an external model, I added bounded requests, timeouts, safe provider-error handling, and validation of structured model outputs using **Zod**. I also validate uploaded files, user inputs, source IDs, and lesson-state changes. I prefer a clear error message or safe failure over applying a malformed AI decision.

## 7. Security and API keys

Reviewers can paste their own **Gemini API key** into the settings UI. The key is kept temporarily in browser memory rather than being saved to a database or `localStorage`. It is sent to the backend for the relevant requests and is not intentionally stored or logged. An optional server-side environment key can also be configured.

Because the key travels between the browser and the backend, I chose an **HTTPS-hosted deployment** to protect data **in transit**. HTTPS does not mean the key is encrypted while it is being processed in browser or server memory.

I also treat uploaded document content as **untrusted input** and frame it accordingly in model prompts to reduce the risk of prompt injection. These are basic safeguards, not a claim of complete protection: a production service would need stronger server-side controls such as rate limiting, state integrity protection, and more security testing.

## 8. Upload-size decision

I intentionally limited uploads to **2 MiB (2,097,152 bytes)**. The Vercel request-payload limit I designed around was approximately **4 MB**, so I wanted room for multipart-form overhead and other request data rather than using the full limit for the file itself.

**Trade-off:** Some larger documents are rejected even when they contain useful material. For this POC, I prioritized reliable serverless requests over large-file support. Actual hosting limits and behavior still need to be checked on the deployed app.

## 9. Frontend and learning experience

I kept the frontend focused on the learning flow: the student can see the chat, the current lesson step, overall progress, and source passages separately. The interface includes loading, error, and empty states, responsive layouts for mobile, and support for right-to-left text such as Hebrew.

I spent more effort on the teaching workflow and backend contracts than on advanced UI features, since this is an AI Engineer assignment. The UI still needs to make the lesson state and source evidence understandable to the student.

See [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) for the component tree, state flow, API integration, and responsive design.

## 10. What I intentionally did not build

- **OCR for scanned PDFs:** It would add dependencies, cost, processing time, and a separate quality problem. Text-only scans therefore remain unsupported.
- **Database, accounts, and cross-device session persistence:** Not necessary for a short-lived, single-user POC. Client-side state is simpler, with the integrity and persistence limitations described above.
- **Vector database / embeddings:** Source-ID retrieval was sufficient as a first approach for a single document, but has weaker recall on long or varied content.
- **A second judge to assess generated tutor responses:** I prioritized the student-understanding Evaluator and kept model calls bounded. A post-generation quality judge could be evaluated later.
- **Full layout reconstruction for tables, formulas, diagrams, and mixed-language documents:** These require more specialized extraction and validation than the current text-based pipeline.

## 11. Known weaknesses

1. **Long-document coverage:** The bounded planning context can miss important parts of long files; source-ID retrieval can then miss related evidence.
2. **Extraction quality:** Scanned PDFs without selectable text are unsupported; tables, formulas, diagrams, and complex RTL/mixed-script layouts may be extracted incorrectly.
3. **Citation precision:** Sources are linked to chunks/pages rather than exact text spans, so references still require inspection.
4. **State integrity and persistence:** Client-held state is validated but not signed; there is no durable session history or cross-device recovery.
5. **Model and hosting dependence:** Gemini quotas, invalid structured outputs, response latency, free-tier availability, and Vercel request/runtime limits can affect the user experience.
6. **Cost and speed:** A separate Evaluator and Generator improves control but requires additional model work per turn. A longer lesson may also mean more student turns.
7. **End-to-end confidence:** Automated tests do not by themselves prove that the live deployment, provider streaming, citations, and teaching quality work correctly together. These must be checked separately.

## 12. How I evaluated the system

I used two complementary kinds of evidence:

**Automated tests:** The repository includes tests for document-processing boundaries, invalid API keys, the lesson-length contract, wrong/partial/correct evaluation transitions, completion behavior, Gemini response handling, and SSE parsing/cancellation. See the test locations and commands in the [README](../README.md). These tests check technical behavior, not the overall quality of teaching.

**Manual teaching scenarios:** I prepared five scenarios based on a Hebrew water-cycle educational PDF. Each tests a different requirement:

| Scenario | What I want to verify |
| --- | --- |
| E1 — Incorrect answer | The tutor recognizes a misconception, gives guidance rather than the full answer, and does not advance too early. |
| E2 — Prior knowledge | The tutor adapts to a student who already knows part of the material without skipping unverified objectives. |
| E3 — Out-of-document question | The tutor does not invent facts, source pages, or references that the file does not support. |
| E4 — Teacher instructions | The tutor follows grade level, Hebrew/RTL, and Socratic teaching instructions instead of dumping answers. |
| E5 — Lesson progress and sources | The UI and lesson state remain consistent; the full lesson, citations, streaming, and Stop need verification. |

The [Evaluation document](./EVALUATION.md) contains the prompt, expected behavior, observations, screenshots, and a scenario-by-scenario status summary. It records **PASS/PARTIAL** observations for individual interactions, but these **do not yet demonstrate a fully verified, reproducible end-to-end run** of the current deployed version. In particular, completing every lesson step and checking streaming/Stop and source navigation still require explicit confirmation.

**Before submission:** Run and record the actual test commands and outputs, verify the public deployment in a private window, complete the outstanding manual checks, and make sure the README contains the real live URL.
