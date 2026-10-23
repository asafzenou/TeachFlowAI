# Decisions

## Architecture

- **Two-phase tutor turn:** constrained JSON evaluation decides understanding and advance eligibility; a separate Gemini native stream produces student-facing prose. This avoids treating partial JSON as lesson state. The tradeoff is one additional model request per turn for stronger correctness.
- **No database or vector store:** upload text, sources, plan, and progress stay in the request/client lesson state. This keeps the MVP serverless-compatible and avoids retaining documents or API keys.
- **Bounded retrieval:** chunks retain page numbers. Planning gets a representative context budget; teaching gets only planned chunks within its own budget. This is simple but may miss an important detail in a very long upload.
- **Cancellation:** browser abort closes SSE; the server aborts the Gemini stream and withholds sources/progress after cancellation. Gemini may still charge for work already accepted.
- **No LLM judge agent:** structured evaluation inside the tutor architecture provides the needed correct/partial/incorrect/unclear classification without another model call solely for judging.

## Exclusions and next four hours

OCR, accounts, persistence, semantic/vector retrieval, and character-level citation anchors are intentionally excluded. Next: dependency-injected Gemini route tests, browser abort tests, OCR behind a feature flag, and retrieval evaluation against labelled long-document examples.

## Pedagogical evaluation scenarios

| Scenario | Expected behavior | Observed/tested result |
| --- | --- | --- |
| Wrong answer | Hint and focused follow-up; no advance | State test passes; tutor prompt requires this. |
| Correct understanding | Affirm and advance one step | Automated state test passes. |
| Partial answer | Explain missing concept; no advance | Automated non-advance test passes; prompt requires this. |
| Hebrew/RTL/style | Follow teacher language and style | Instruction is passed through; real-key manual check remains. |
| Unsupported/empty upload | Reject safely with a useful error | Automated upload tests pass. |
| Cancel stream | Preserve progress and omit new progress event | Code guards this; real-key/manual check remains. |

No live Gemini call or deployed Vercel environment was tested for this document.
