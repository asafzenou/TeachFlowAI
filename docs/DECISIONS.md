# Engineering decisions — TeachFlowAI

This document explains what was built, why, what was deliberately excluded, known weaknesses, and what would be improved with four additional hours.

## Main decisions

| Decision | Rationale | Tradeoff |
| --- | --- | --- |
| React + Vite + Tailwind + Node.js | Matches the assignment stack; fast iteration and reusable UI | Separate frontend/backend lifecycle |
| Vercel Functions and in-memory PDF/TXT processing | Simple public deployment without a database | Payload, memory, execution duration and streaming constraints |
| Gemini with structured JSON lesson planning | Creates explicit objectives and steps which are validated before use | Invalid provider JSON/schema outputs can require safe failure/retry |
| Configurable lesson length: Auto or 3–8 | Teacher control with bounded planning complexity | Long curricula must group topics or be split across lessons |
| Separate tutor evaluation and response streaming | Progress depends on structured understanding assessment; prose can stream naturally | Extra model operation, latency and tokens per turn |
| Explicit lesson state outside chat history | Meets requirement and keeps progress deterministic | Client state is larger and must be validated on every request |
| Page-aware chunks with bounded source selection | Grounding and inspectable passages without extra infrastructure | Simple retrieval may omit relevant passages in long files |
| Browser abort + backend cancellation | Stop button has actual cancellation semantics | Provider charges might accrue even after cancellation |
| User-supplied API key, transient browser state | Reviewers can use their own key without developer credentials | Key is visible to browser session and receiving backend; HTTPS required |
| Automated validation and streaming tests | Deterministic coverage of contracts and edge cases | Live teaching quality needs separate human evaluation |

## Scope deliberately excluded

- OCR for scanned documents: adds processing cost, dependencies and quality tradeoffs.
- Database, user accounts and cross-device persistence: beyond the short MVP timeline.
- Vector database or semantic retrieval: unnecessary for a bounded, single-upload prototype; simple source chunks are easier to explain.
- Extra LLM-as-a-Judge agent: the tutor already has structured response evaluation; a separate judge would increase complexity and model calls. External evaluation can be added later.
- Full multi-language document layout reconstruction, equation parsing and rich tables.

## Known weaknesses and limitations

1. Client-held plan/progress is **validated but not signed**; it should not be treated as authoritative educational records.
2. Bounded planning context can miss facts in long PDFs. Citations are at chunk/page granularity, not exact character spans.
3. Scanned PDF pages without selectable text are unsupported. Complex RTL/mixed-script layout and formulas can extract imperfectly.
4. Model API quota, free-tier availability, JSON compliance, latency, and serverless streaming vary by environment.
5. More lesson steps may increase overall conversation/model usage, but cost is not directly proportional to the step count.
6. There is no persistent session history after browser state is lost.
7. A complete end-to-end deployment and human evaluation still need explicit verification, rather than being inferred from unit tests.

## If I had four more hours

1. Run a scripted/manual browser evaluation on the deployed Vercel app (desktop and mobile), including actual Gemini streaming, Stop, citations and recovery from errors; record results.
2. Add dependency-injected route-level integration tests for provider failures, cancellation, and malformed planner output.
3. Improve mixed RTL/LTR rendering and accessibility for long multilingual lessons; audit viewport behavior on short-height screens.
4. Add a small gold-standard document/question set for retrieval and citation correctness; improve source selection before adopting a vector database.

## How I know it works — evidence model

The project includes automated tests for document parsing boundaries, invalid API keys, lesson-length contract, wrong/partial/correct evaluation state transitions, completion, Gemini response handling, and SSE parsing/aborts. See the test files named in `README.md`.

**Pedagogical evidence** is recorded separately in [`EVALUATION.md`](./EVALUATION.md). Five targeted scenarios assess wrong answers, advanced students, grounding, explicit teacher instructions, and completed-lesson progress. Some earlier tutor text was observed in conversation, but this is **not proof** of a reproducible end-to-end live run against the current repository. The document distinguishes observed responses from planned checks and includes space for verified results.

**Before submission:** Record exact test commands and actual outputs, complete the live test record, and replace README URL placeholders. Do not claim a passed manual test until it was run.
