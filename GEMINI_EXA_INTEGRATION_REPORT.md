# Gemini and Exa Integration Runtime Report

Date: 2026-09-28

## Scope

Only the AI/search provider integrations and checks around their runtime behavior were addressed. No vehicle geometry was edited. Provider keys are loaded by Django from the project .env; key values were never printed. The React/Vite source contains no Gemini or Exa API key references.

## Gemini

- SDK: google-genai 1.75.0.
- Model: GEMINI_MODEL setting, currently gemini-3.8-flash; request timeout is configurable through GEMINI_TIMEOUT_MS.
- Live gate: the minimal prompt “Reply with exactly: AUTO_ANATOMY_GEMINI_OK” was sent without context, structured schema, or tools. Google returned HTTP 503, reporting temporary high demand/server unavailability.
- Two bounded diagnostics tried gemini-3.7-flash and gemini-3.5-flash-lite; both returned HTTP 504 deadline timeouts. No repeated retries were made.
- The minimal request did not pass, so live RU/TG/EN, structured-action, and full-context Django API requests were not attempted. AI live status is FAIL until a real request succeeds.
- Backend tests mock the Gemini request shape/schema, RU/TG/EN contract, action allowlist, timeout, 429/quota, invalid key, 403 access denial, 404 model, 5xx, and malformed structured response. The API returns provider codes; React maps those codes to localized error messages.

## Exa and database search

- Live component-context request: GET /api/shop/search/?q=replacement%20part&car=7&component=engine&external=1.
- The backend used Ford GT40 and its Engine assembly CarPart. Exa returned actual normalized result titles, valid HTTPS URLs, source domains, and snippets.
- Local search using q=engine, car=7, component=engine separately returned the database Engine assembly CarPart. Results remain separate as local catalog data and external web data.
- No published compatible product is recorded for that GT40 engine component, so local products were empty. No product or compatibility was fabricated.
- Search-result URLs are validated as HTTP(S); result text is rendered as text, not raw HTML.

## Result matrix

| Check | Result | Evidence |
|---|---|---|
| Gemini provider | PARTIAL | Mock integration and error mapping pass; live Google provider failed. |
| Gemini live text | FAIL | Minimal request 503; two alternative models 504. |
| Russian AI | PASS (mock only) | Response-contract test; live request gated by provider failure. |
| Tajik AI | PASS (mock only) | Response-contract test; live request gated by provider failure. |
| English AI | PASS (mock only) | Response-contract test; live request gated by provider failure. |
| Gemini structured action | PASS (mock only) | Schema/action tests; live action capability unverified. |
| Gemini through Django API | FAIL / not reached | Staged live test stopped after minimal SDK request failed. |
| Exa provider | PASS | Live component-context request returned normalized results. |
| Exa live search | PASS | Actual titles and valid URLs received through Django. |
| Local search | PASS | Live PostgreSQL search returned the selected CarPart. |
| External search | PASS | Real Exa results returned through the API. |
| Django tests | 43/43 | Full suite passed; system check clean. |
| Frontend tests | 14/14 | node --test tests/*.test.mjs. |
| Production build | PASS | Vite build succeeded; existing 706 kB Three.js chunk warning remains. |

## Provider documentation

- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [Exa Search API](https://exa.ai/docs/reference/search)
