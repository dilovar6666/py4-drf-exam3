# Auto Anatomy — UX, auth, gesture and voice runtime QA

Date: 2026-09-28. Scope: existing UI and APIs only. No 3D geometry, source model or universal viewer code was changed.

## Running services

| Service | URL | Runtime observation |
| --- | --- | --- |
| Vite frontend | http://127.0.0.1:4174/ | HTTP 200; Home, Info, auth, catalog, store, profile and AI routes opened in isolated Edge |
| Django backend | http://127.0.0.1:8000/ | Catalog and store APIs return HTTP 401 to guests; voice endpoint returns HTTP 401 to guests |
| Admin | http://127.0.0.1:4174/admin | Staff-only route |
| Store | http://127.0.0.1:4174/store | Login required |
| Profile | http://127.0.0.1:4174/profile | Login required |
| Cars | http://127.0.0.1:4174/cars | Login required |
| AI | http://127.0.0.1:4174/ai | Login required |
| Info | http://127.0.0.1:4174/about | Public |

## Fixed

- **Camera shutdown root cause:** `GestureControl` rendered its video element only after `enabled` or `streamRef.current` became truthy. After `getUserMedia()`, the ref changed without a render. The code called `videoRef.current.srcObject` while `videoRef.current` was null; the catch block immediately stopped the stream. The video now remains mounted throughout permission, startup, model loading, hidden preview and ready states.
- Camera lifecycle now uses explicit OFF, REQUESTING_PERMISSION, STARTING, LOADING_MODEL, READY, ERROR and STOPPING states. Stream/landmarker/animation resources are released on Stop, route unmount, revoked stream or unrecoverable tracking error. Ordinary re-renders and guide/preview state changes do not release them.
- Compact guide, replayable help button, opt-out of automatic guide, camera preview toggle, Camera ON/OFF indicator and live hands/gesture/confidence/action HUD were added. The guide lists only implemented pinch/focus, hand move/orbit and two-hand spread/close actions.
- The two-hand gesture updates the **existing** viewer explode progress. A fixed anchor while two hands are tracked prevents feedback from viewer state from resetting the gesture. Time-based smoothing compensates for low frame rates; near-target snapping allows an exact 0% return.
- Guest Cars, Store, Profile, Garage, Parts and AI routes redirect to Login with a preserved destination. A login returns to that destination. Guest navigation omits private links; authenticated navigation includes Cars, Store, AI and Profile. Staff access remains separate. Django's default DRF permission is now authenticated; catalog, component, cinematic and shop/search APIs no longer expose guest data.
- The existing `/about` page is the Info page. Home has a Learn more button; clicking it navigated to `/about` in Edge. A shared public layout provides Header and Footer. Mobile navigation uses a menu button.
- Voice uses server-side Gemini TTS for stored assistant responses only, with a 2,500-character plain-text limit and owned conversation lookup. Client-created assistant messages are disabled to prevent arbitrary TTS requests. Listen/Stop and optional auto-play (OFF by default) use a blob response; audio is stopped and its object URL released on navigation.
- Google returned HTTP 400 with the exact cause: installed `google-genai 1.75.0` used the retired legacy Interactions schema. The dependency was changed to `google-genai>=2.0,<3` and the dev environment upgraded to 2.25.0. The live TTS requests then returned WAV audio.

## Browser and API evidence

- Isolated Edge guest check: Home, Info, Login and Register loaded with Header/Footer. `/cars`, `/store`, `/profile`, `/profile/garage/1`, `/ai` and `/admin` redirected to `/login` with the original route preserved. Guest navigation exposed only Home, Info, Login and Register.
- Temporary normal user: Cars, Store, Profile and AI loaded with the authenticated navigation. `/admin` showed staff-only denial. Temporary staff user loaded the custom admin. The temporary users and tokens were removed after QA.
- Real browser login from a requested `/store` returned to `/store`; Logout made `/store` redirect to Login again.
- Mobile Edge at 390 × 844: menu opened, footer existed, document width remained 390 px. Screenshots were reviewed locally during QA; temporary captures were removed during cleanup.
- Virtual camera stream plus mocked hand landmarks in the real car page: READY with a live track; guide open/close and preview hide kept the track live; Stop and SPA navigation ended the track. No browser exceptions. At 1440 × 900, two-hand spread moved the existing explode slider from 0 to 72%; closing returned it to 0%.
- Live Google TTS: Tajik 57,904 bytes WAV, Russian 67,504 bytes WAV, English 59,824 bytes WAV. A real authenticated Django `POST /api/ai/voice/` returned HTTP 200, `audio/wav`, 125,104 bytes; unauthenticated returned 401.
- Browser voice control with a seeded assistant answer: auto-play was OFF, Listen reached the Stop state, Stop returned to Listen, a second Listen was invoked, and route change removed the assistant/audio instance. The answer was seeded for this UI test; this does **not** prove live Gemini text generation.
- The configured live Gemini text model still returned HTTP 503 `UNAVAILABLE` on one minimal request after the SDK update. This remains a provider-side text request failure. It is not presented as a successful AI response.

## Status

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Camera lifecycle bug | PASS | Null-video cause removed and virtual-stream browser test reaches READY |
| Camera remains active | PASS | Track live after re-render, guide changes and preview hide |
| Camera stop cleanup | PASS | Track ended on Stop and navigation |
| Gesture guide | PASS | Rendered automatically and reopened manually |
| Live gesture feedback | PASS | HUD rendered during tracking; mocked landmarks drove actions |
| Gesture explode integration | PASS | Same viewer slider 0→72→0 in browser |
| Physical gesture test | PARTIAL | No physical webcam or human hand tracking available in automation |
| Guest Cars / Store / Profile / AI protection | PASS | Browser redirects and backend 401 |
| Admin protection | PASS | Normal user denied; staff dashboard loaded |
| Info page / Home button navigation | PASS | Button click landed on `/about` |
| Global Header / Footer | PASS | Shared layout seen on public routes |
| Mobile navigation | PASS | 390 px menu opened without horizontal overflow |
| Gemini text | FAIL | One live minimal request returned Google HTTP 503 |
| Voice infrastructure | PASS | Real Django WAV response and browser playback state |
| Russian voice | PASS | Live RU text-to-WAV request succeeded; pronunciation was not manually assessed |
| Tajik voice | PARTIAL | Google documents Tajik single-speaker support and live TG text-to-WAV succeeded; pronunciation/language fidelity was not reviewed by a Tajik speaker |
| English voice | PASS | Live EN text-to-WAV request succeeded and browser playback state was observed |
| Voice Stop | PASS | Browser Listen→Stop→Listen control transition |
| RU / TG / EN new UI | PASS | New keys tested in 17 frontend tests; Info headings changed correctly in Edge |
| Django tests | 48/48 | Full `manage.py test` |
| Frontend tests | 17/17 | Full `npm test` |
| Production build | PASS | `npm run build` |
| Django check / migrations check | PASS | No issues; no model changes detected |

Google TTS documentation: https://ai.google.dev/gemini-api/docs/speech-generation

## PARTIAL

- Physical camera permission flow and real hand recognition were not checked with a hardware camera. The browser lifecycle was checked with a virtual MediaStream and deterministic landmarks.
- A Tajik speaker has not evaluated pronunciation. A WAV response alone does not establish language quality.
- The existing immersive vehicle page contains older English copy outside this task's new-string coverage. The new Header, Footer, Info, auth, gesture and voice strings have RU/TG/EN entries.

## NOT FIXED

- Live Gemini **text** remains unavailable with HTTP 503 for the configured model. The voice UI test used a seeded answer to isolate playback; it did not conceal that text failure.
