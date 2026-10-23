# Decisions

## Architecture

- **Two-phase tutor turn:** constrained JSON evaluation decides understanding and advance eligibility; a separate Gemini native stream produces student-facing prose. This avoids treating partial JSON as lesson state. The tradeoff is one additional model request per turn for stronger correctness.
- **No database or vector store:** upload text, sources, plan, and progress stay in the request/client lesson state. This keeps the MVP serverless-compatible and avoids retaining documents or API keys.
- **Bounded retrieval:** chunks retain page numbers. Planning gets a representative context budget; teaching gets only planned chunks within its own budget. This is simple but may miss an important detail in a very long upload.
- **Cancellation:** browser abort closes SSE; the server aborts the Gemini stream and withholds sources/progress after cancellation. Gemini may still charge for work already accepted.
- **No LLM judge agent:** structured evaluation inside the tutor architecture provides the needed correct/partial/incorrect/unclear classification without another model call solely for judging.

## Exclusions and next four hours

OCR, accounts, persistence, semantic/vector retrieval, and character-level citation anchors are intentionally excluded. Next: dependency-injected Gemini route tests, browser abort tests, OCR behind a feature flag, and retrieval evaluation against labelled long-document examples.

## Water-cycle evaluation record

The planned manual fixture is the two-page water-cycle PDF and Hebrew/Socratic instruction described in `CONTEXT.md`. This hardening pass did not have that fixture or a real-key session available, so it records no invented manual observations. The table distinguishes executable verification from the manual observations still required.

| Scenario | Verified observation | Manual-evaluation limitation / follow-up |
| --- | --- | --- |
| Wrong answer: “Water disappears when it evaporates.” | The tutor evaluation prompt requires `incorrect` answers not to advance; `applyEvaluation` has an automated regression test proving an incorrect result leaves the step unchanged. | Confirm a live Hebrew response gives a hint rather than the answer and leaves the visible step unchanged. |
| Partial answer: “The sun warms the water.” | The evaluator and tutor prompts require partial understanding to remain on the step; automated test confirms no progress transition. | Confirm the live tutor acknowledges warming and asks specifically about vaporization. |
| Repeated mistake and learning recovery | Repeated non-advance turns cannot mark a step complete; a later `correct`/`advance` result advances exactly one step, covered by automated state tests. | Exercise at least two wrong answers followed by the complete evaporation explanation and record the actual tutor wording. |
| Grounding: tray C loss | Only source IDs supplied for the current step can be cited, and prose is instructed to use only supplied passages. | Ask for tray C's loss and verify the fixture's claimed 39 mL calculation and page-2 citation against the uploaded PDF; the fixture was not available here. |
| 100% completion | A correct final-step evaluation sets `completed`, retains the final step index, and marks every step complete; automated test covers this transition. | Complete every generated step with the live model and confirm the UI shows 100% and no next question. |
| SSE streaming | The browser parses `delta`, `sources`, `progress`, and `done` frames; parser tests cover split frames and backend only emits progress after its text stream finishes. | Observe incremental live text on the target runtime; no Gemini/Vercel stream was exercised in this pass. |
| Stop behavior | Browser abort marks the displayed response stopped; server disconnect handling aborts the provider signal and checks it before source/progress/done events. Interrupted text is excluded from future history by an automated test. | Stop a real stream mid-response and confirm there is no late completion or progress mutation. Provider work already accepted may still be billed. |

No live Gemini call, water-cycle fixture run, browser interaction, or deployed Vercel environment was tested in this hardening pass.
