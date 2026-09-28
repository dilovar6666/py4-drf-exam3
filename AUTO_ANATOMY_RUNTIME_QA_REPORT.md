# Auto Anatomy Runtime QA Report

Date: 2026-09-28

## Runtime URLs

- Frontend: http://127.0.0.1:4174/
- Backend: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:4174/admin
- Store: http://127.0.0.1:4174/store
- Profile: http://127.0.0.1:4174/profile
- Cars: http://127.0.0.1:4174/cars

Both dev servers were left running. Django uses the Vite `/api` proxy, which forwards to port 8000. The prior backend listener was stale and returned 404s for endpoints added later; it was stopped and replaced by the current workspace server. The obsolete API origin hardcoded in runtime config was corrected to same-origin routing.

## Database and service startup

- PostgreSQL dev database: connected. Account, car import/cinematic metadata, and product draft migrations were applied without deleting existing data. `showmigrations` showed all migrations applied; `makemigrations --check --dry-run` reported no changes; `manage.py check` had no issues.
- Django: running on 127.0.0.1:8000.
- React/Vite: running on 127.0.0.1:4174.
- Redis: unavailable. `127.0.0.1:6379` refused connections; Redis, Docker, and WSL were not available as local launch options.
- Celery: configuration exists, but no worker/task can be verified without a broker. No Celery task was falsely marked successful.
- Gemini and Exa backend credentials are present and usable (Exa live request succeeded; Gemini reached Google's service). Secret values were never printed.

## Runtime errors found and corrected

1. The frontend pointed at an outdated backend origin (`8001`), causing API 404s. Runtime config now uses same-origin `/api` with the Vite proxy to the active Django server.
2. Anonymous users generated recently-viewed POSTs on vehicle and product pages, causing 401 responses. The calls are now made only for authenticated sessions.
3. Car 5's database preview URL used `.png` while the real asset is `.jpg`. Corrected the existing preview URL and prepared-vehicle mapping so the image resolves to the real JPEG. A direct image request returned `200 image/jpeg` after the fix.
4. Gemini error classes were too generic for upstream outages/timeouts. Backend provider errors now distinguish timeout, rate/quota, invalid credentials, model/access errors, 5xx, invalid request/schema, and malformed structured response. The React assistant maps these codes to localized messages.
5. The Gemini mock test expected a constructor without the newly added timeout option. Updated its assertion to verify both the backend key and bounded SDK timeout; the full suite then passed.

## Browser runtime QA

Automated isolated Edge/CDP QA exercised `/`, `/cars`, `/cars/4` (Audi R8), `/cars/7` (Ford GT40), `/store`, `/profile`, and `/admin`, plus a 390px mobile viewport and GT40 touch input. No JavaScript exceptions, console errors, failed requests, or 4xx/5xx responses were recorded on these route runs. Mobile Cars width was 404px with no horizontal overflow.

- Audi R8 GLB loaded; viewer reported 74 components and the backend exposed 74 matching CarParts.
- Ford GT40 GLB loaded; viewer reported 63 configured components. All 63 current IDs exist in the database and passed focus checks. The browser Raycaster hovered and selected `body_shell`; mobile touch selected `body_shell`.
- GT40 explode round-trip tested `0 → 25 → 50 → 75 → 100 → 75 → 50 → 25 → 0`; final transforms exactly matched the initial transform snapshot.
- Mouse drag changed the GT40 camera state through OrbitControls; Raycaster hover/selection and the mobile tap path selected the same semantic component.
- Public local search through Django returned the GT40 `engine` CarPart. One Exa component-context request returned real titles, HTTPS URLs, domains, and snippets.
- RU/TG/EN browser smoke exercised Home, Cars, and Store. Navigation and the translated page headings were correct; no translation-missing markers appeared. Translation coverage elsewhere remains incomplete (see limitations).
- Runtime script and screenshots: `car-concept-3d-dashboard/qa/runtime-audit/`. Language smoke script: `car-concept-3d-dashboard/scripts/runtime-language-qa.mjs`.

## Gemini live diagnosis

The minimum live SDK prompt (“Reply with exactly: AUTO_ANATOMY_GEMINI_OK”) was sent with no context, tools, or structured schema. The configured `gemini-3.8-flash` request returned Google HTTP 503 due temporary high demand/server availability. One bounded request each to `gemini-3.7-flash` and `gemini-3.5-flash-lite` timed out with HTTP 504. No repeated retries were made. Per the staged test requirement, live language, structured action, and Django AI endpoint checks were not advanced past this failed minimum gate. Gemini is not PASS; provider failure is shown honestly in `GEMINI_EXA_INTEGRATION_REPORT.md`.

## Authentication, profile, store, admin, gestures

- Profile and admin routes render their logged-out screens. No existing staff credentials were supplied, so authenticated staff dashboard sections and user garage photo/edit/delete flows were not exercised through the browser. Guarded API and feature behavior has automated Django coverage, but route availability does not count as a full runtime PASS.
- Store search and filters rendered. Current data has no published compatible product for GT40 engine, so there was no real product detail to open for that component. Product compatibility remains database-driven.
- Camera gesture UI was not physically tested with a webcam; actual hand tracking and permission prompts remain unverified. Camera is off by default; browser QA did not grant camera access.
- Celery real task is blocked by absent Redis.

## Remaining limitations

- Gemini upstream returned 503/504; live AI answers and actions remain unavailable until Google serves a successful request.
- Redis/Celery worker and task state were not verifiable on this machine.
- Profile/garage/authenticated admin workflows and webcam gestures need a permitted logged-in session/camera for full browser verification.
- Localization is partial. Home, Cars, Store, and navigation headings were exercised in RU/TG/EN, but some controls, profile/auth copy, vehicle story UI and database-supplied descriptions remain in English.
- The GT40 database contains the current 63 component IDs plus 12 preserved legacy IDs (`wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, `seat_left`, `seat_right`, `engine`, `radiator`, `exhaust`, `headlights`, `taillights`, `rear_grille`). The viewer and AI use the current 63 mapping; legacy records were preserved rather than deleted.
- Three development seed cars still point to `example.com` GLBs. They are not valid prepared exhibits and were not included in Audi/GT40 geometry work.
- Production build passes with Vite's existing warning that `vehicleScene` is a 706 kB chunk.

## Final status

| Check | Result |
|---|---|
| Frontend running | PASS — `http://127.0.0.1:4174/` |
| Backend running | PASS — `http://127.0.0.1:8000/` |
| PostgreSQL and migrations | PASS |
| Redis | PARTIAL — unavailable locally |
| Celery worker | PARTIAL — no broker |
| Celery real task | PARTIAL — not run |
| Gemini live text | FAIL — 503; alternate bounded models 504 |
| Gemini RU / TG / EN live | FAIL — staged gate not passed |
| Gemini structured action live | FAIL — staged gate not passed |
| Gemini through Django API | FAIL — staged gate not passed |
| Exa live component search | PASS |
| Local search | PASS |
| Auth / Profile / Garage | PARTIAL — tests pass; private browser flows not exercised |
| Store | PARTIAL — search passes; no product for selected component |
| Admin | PARTIAL — logged-out gate tested, staff dashboard not opened |
| Audi viewer | PASS — 74 components |
| GT40 viewer | PASS — 63 configured components |
| GT40 Raycaster / mobile tap | PASS — hover, selection, touch selection exercised |
| GT40 explode round-trip | PASS — exact transforms |
| Physical webcam gestures | PARTIAL — not physically tested |
| RU / TG / EN UI | PARTIAL — key public screens passed, full copy coverage incomplete |
| Django tests | PASS — 43/43 |
| Frontend tests | PASS — 14/14 |
| Production build | PASS — existing large-chunk warning |
