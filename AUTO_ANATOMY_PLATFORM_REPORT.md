# Auto Anatomy Platform Report

Scope: platform work only. No source-model decomposition was run in this phase. Existing Ford GT40 and Audi geometry/configuration were preserved; the browser regression used the prepared GT40 runtime asset.

## Phase status

| Phase | Status | Evidence / remaining work |
|---|---|---|
| 1. Architecture audit | IMPLEMENTED | Reused Django/DRF, React/Vite, Three.js, existing `CarPart`, shop `SparePart`/compatibility, JWT auth, and the single viewer. |
| 2. Profiles and garage | IMPLEMENTED | Profile, language preference, owned garage vehicles, favorites/recently viewed, ownership-scoped APIs, media validation, migration `accounts.0003`. Covered by Django tests. |
| 3. Store and search | PARTIAL | Store, product detail, compatibility filters and truthful DB search implemented. Exa web search is opt-in via `EXA_API_KEY`; no key was configured, so real external results were unavailable and not tested. |
| 4. AI and multilingual | PARTIAL | Server-only Google Gemini service, contextual request schema, safe action allowlist, rate limit, and stored conversation history implemented. No Gemini key was configured; live model responses were not tested. RU/TG/EN selector and dictionaries exist, but translation coverage is incomplete across the whole UI. |
| 5. Admin and analytics | PARTIAL | Custom admin dashboard, resource sections, staff-gated APIs, real DB counts, recent records, import status and empty states implemented. Popularity is based on recorded recently viewed data; broader event analytics and authenticated staff browser walkthrough remain outstanding. |
| 6. Celery and Redis | PARTIAL | Celery configuration, task dispatch and Redis settings/docs added. A Redis service and installed Celery runtime were unavailable in this environment; worker execution and real queue state transitions were not verified. |
| 7. Automated 3D import | PARTIAL | Reusable Blender inventory/island/export/GLB validation pipeline, import-job state model, upload/review/publish endpoints and UI added. Blender integration test passed on a generated synthetic `.blend`, including hidden-object inventory and loose-island export. Live queued processing is blocked on Redis/Celery availability; classification requires administrator review and does not cut connected surfaces. |
| 8. Product automation | IMPLEMENTED | Staff-only, idempotent draft product generation links products to existing car/component compatibility without fabricating brand, price, SKU, or OEM data. Covered by Django tests. |
| 9. Cinematic pages | IMPLEMENTED | Data-driven story configuration and component-aware sections use the existing `/cars/:id` viewer. Browser QA loaded the GT40 page with its existing 63 components. |
| 10. Gesture control | PARTIAL | Explicit camera enable/stop UI, local browser-side hand tracking, confidence/cooldown controls and the shared explode state are implemented. Physical camera permission, CDN model loading and real hand tracking were not exercised in browser QA. |
| 11. AI/viewer/store/garage integration | PARTIAL | Context plumbing and frontend-validated actions cover component focus/selection, store filtering, garage context and explode percentage. End-to-end execution depends on an unconfigured live AI provider. |
| 12. Full QA | PARTIAL | Full Django and frontend suites, production build and desktop/mobile browser smoke passed. Live AI/search providers, Redis worker, authenticated admin workflows, real camera gestures, and complete translation coverage remain unverified. |

## Verification

- Django: `manage.py test --settings=config.test_settings` — **29/29 passed**, system check clean.
- Migrations: `makemigrations --check --dry-run --settings=config.test_settings` — **no changes detected**.
- Frontend: `node --test tests/*.test.mjs` — **13/13 passed**.
- Production build: `npm.cmd run build` — **passed**. Vite reports a 706 kB viewer chunk and warns about chunks above 500 kB; build is successful, but code splitting can be improved.
- Browser smoke: desktop Home/Store/Profile/admin access gate/GT40 plus mobile GT40/Profile passed against an isolated temporary SQLite QA database and the prepared GT40 artifact. GT40 viewer reported **63 components**, **0 unassigned meshes**, and exact explode `0 → 75 → 0` transform round-trip. Camera stayed off. Two `401` responses for unauthenticated recently-viewed writes were expected; no browser console exceptions were recorded.
- Browser screenshots and machine-readable run report: `car-concept-3d-dashboard/qa/platform-browser/`.

## Configuration and operational limits

- Set `GEMINI_API_KEY` (and optional `GEMINI_MODEL`) to enable live AI answers; set `EXA_API_KEY` to enable external web search. Secrets remain server-side. Neither provider was configured for this run.
- Install the updated Python requirements and run Redis plus a Celery worker to execute long-running imports. The application reports an unavailable queue instead of pretending a job started.
- Camera gestures require browser camera permission and the optional hand-tracking model download. Video is processed in the browser and is not sent to the backend.
- Product prices, stock, manufacturer/part numbers and vehicle specifications remain absent unless administrators enter verified values.
- The imported-model workflow is a safe baseline with administrator review, not guaranteed automatic semantic recognition: it separates disconnected loose islands only and records connected/fused geometry for review.
- Existing workspace changes and generated vehicle artifacts were retained. No other source model was processed; no reset, clean, push, or deployment was run.

## Runtime re-audit — 2026-09-28 (authoritative update)

The earlier verification block above reflects a previous environment snapshot. This re-audit is current and supersedes its test totals and provider/configuration notes.

- PostgreSQL dev schema was behind migrations at first. Applied the outstanding account, car-import/cinematic, and draft-product migrations without dropping data. `showmigrations` now shows every migration applied; `makemigrations --check --dry-run` reports no changes; `manage.py check` is clean.
- Started the current Django server at `http://127.0.0.1:8000/` and Vite at `http://127.0.0.1:4174/`. An older Django process on 8000 had served stale code and was replaced. The API now uses the Vite same-origin proxy instead of a stale hardcoded 8001 origin.
- Removed anonymous recently-viewed writes that produced 401s on public vehicle and product pages. Corrected the Car 5 preview path to its real JPEG; no 3D data was modified.
- Full tests: Django 43/43, frontend 14/14. Production build passed. Vite still warns about the existing 706 kB Three.js chunk. `git diff --check` found no whitespace errors; Git emitted only line-ending normalization notices.
- Live provider state: Exa component-context search passed through Django; Gemini remained unavailable at its minimal live request gate (503), and two bounded alternate-model probes timed out (504). This is not an AI PASS.
- PostgreSQL and the public routes work. Redis was not available locally (6379 refused; no Redis service, Docker, or WSL installation), so a Celery worker/task could not be proven. Authenticated garage/admin flows were not exercised in a real browser session; the API and UI remained in logged-out states and the test suite covers their guarded behavior.
- UI translation runtime smoke exercised Home, Cars, and Store in RU/TG/EN with translated nav/page headings and no missing-key markers. Coverage is still incomplete: some home controls, profile/auth labels, vehicle story text and database-provided descriptions remain English. RU/TG/EN overall are therefore PARTIAL, not PASS.
- Viewer regression: Audi R8 loaded with 74 configured/backend components. GT40 loaded with 63 configured/selectable components, with exact 0→25→50→75→100→75→50→25→0 transform round-trip. The database still contains 12 legacy GT40 CarPart IDs in addition to the current 63; these old rows were preserved and are filtered out of the current viewer/AI component context.
- Details and route-level evidence are in `AUTO_ANATOMY_RUNTIME_QA_REPORT.md`; provider evidence is in `GEMINI_EXA_INTEGRATION_REPORT.md`.
