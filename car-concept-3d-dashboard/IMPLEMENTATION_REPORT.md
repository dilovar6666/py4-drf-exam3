# AUTO ANATOMY — React / Soft Studio implementation report

## 1. Stitch MCP actually used

Actual calls: `list_projects`, `create_design_system`, `update_design_system`,
`generate_screen_from_text`, `get_project`, `list_screens`, `get_screen`.
The proxy/list-projects call succeeded. A desktop catalog generation timed out
after 300 seconds; it is not counted as a successfully generated screen.

## 2. Stitch project, screens and design system

Existing project: `11598268576844772023`.
New light system: `assets/3348313050824750321`, **Auto Anatomy / Soft Studio**.

- Homepage/About: `6e11594a79c24c8b89f0a9b7c7a12e6e`
- Interactive vehicle/component information: `4b8d9e4d4e7b4f048a18a18250635c19`
- Admin/forms: `8b5b92a3c19c4f39bca48184873e4275`
- Mobile discovery/catalogs: `175fa793432e473aaca91cc0b758a5a7`

Real exported images are in `qa/stitch-light`, with a design manifest.
Stitch supplied pill navigation, rounded paper surfaces, restrained hierarchy,
technical labels, a viewport-attached component sheet, catalog and admin patterns.
Invented scan counts, curator identities, unsupported specifications, OEM
verification and guessed compatibility were discarded. Its dark automotive
photography was replaced by the actual silver GLB in a light environment.

Implemented tokens: #F7F7F5 background, #FFFFFF surface, #F0F1EF secondary surface,
#151515 text, #6E706D secondary text, #E2E3DF borders.
Hanken Grotesk is the main face; JetBrains Mono is reserved for technical labels.
Rounded panels use 24–28px; inputs use restrained corners; buttons/navigation
use pill geometry. Spacing uses readable 12/16/24/32/40px increments and responsive
editorial margins. Motion uses short opacity/translate states and eased camera
transitions. No neon, dark Obsidian theme or decorative particle effects.

## 3. React migration

React 19, React Router 7 and Vite 7 replace the active plain-JS entry.
`index.html` is now only an entry document. Pages, UI, API utilities, admin
and imperative Three.js modules are separate. Three.js was not replaced with
React Three Fiber. Scene startup/disposal lives behind a React effect and a
lazy import. The previous working main/lab files were retained, not deleted.

## 4. Final route structure

| Route | Page |
| --- | --- |
| / | Home / real Audi preview |
| /cars | Actual API vehicle catalog |
| /cars/:carId | Vehicle experience; Audi is the prepared 3D exhibit |
| /cars/:carId/components/:componentId | Component deep link and recorded products |
| /parts | Actual API product catalog / supported filters |
| /parts/:productId | Product metadata / backend compatibility |
| /about | Project introduction |
| /admin | Staff-only custom management overview |
| /admin/:resource | CRUD lists and forms for actual resources |

Other cars are not assigned fabricated 3D models. Their component links still
show actual descriptions/specifications/compatibility without pretending to have
a prepared interactive exhibit.

## 5. Reusable components

Navbar, Button, SearchInput, FormField, StateView, Pagination, Modal,
ConfirmDialog, VehicleCard, PartCard, PreviewImage, ThreeScene, LoadingScreen,
ComponentTooltip, ComponentInfo, AdminLayout, AdminTable and RecordForm.

## 6. Existing Three.js preserved / changed

Preserved: `modelAdapter.js`, `componentRegistry.js`, `models/audiR8.js`,
the 74 IDs, semantic GLB hierarchy, normalization, adapter explosion transforms
and geometry-based Raycaster mapping. Blender/preparation code was not rewritten.
The legacy CarConcept asset/config are retained.

Added: lifecycle-owned `three/vehicleScene.js`, camera/story choreography,
light studio lighting/environment, local material highlighting/context attenuation,
touch-friendly scrolling and cleanup of scene resources/listeners/ScrollTrigger.
One canvas is active at a time. Dormant scenes do not render continuously.

Stages: Design → Performance → Braking → Engineering → Anatomy → Exploded.
Explode endpoints are 0, 0, 0, .18, .6, 1, with smooth interpolation.
Camera position/target/framing, subtle root translation/yaw and text composition
are choreographed independently. This is not a direct scroll=explode mapping.

## 7. Audi R8 regression

Audi loads; assembled and full exploded states work. Actual pointer hover/click,
camera focus, OrbitControls drag, deep linking and mobile tap passed.
All 74 components are focusable. No missing, lost or unassigned source meshes.
Explode reversal and repeated-progress determinism have maximum transform error 0.

The source and built GLB have identical SHA-256:
`8B8DACE56173866F22F473D30B05450D6D2871562297F96C89CC9AD590448A44`.

## 8. Semantic component regression

74 IDs / 152 source meshes are intact. The API returns 74 Audi CarPart records;
all scene IDs match a backend record. No IDs were renamed, merged or removed.
Hover reveals one name, not 74 labels. A keyboard-accessible component index is
available on demand rather than as a permanent sidebar.

## 9. Django/API changes

Small DRF staff-only CRUD router at `/api/manage/`, with overview/search/filtering.
One migration adds `Car.is_active` (default true); applied locally.
Public car list/detail excludes inactive cars. Profile exposes read-only
`is_staff`; compatibility product filtering retains the existing API contract.
Actual catalog content and CarPart/Product relations were not overwritten.

## 10. Admin features

Cars, activation, models/titles, manufacturers, components, categories,
technical specifications, products, product images and recorded compatibility.
Create/edit/delete forms, search, vehicle filtering, server validation messages,
save states and explicit delete confirmation are implemented.
Vehicle titles/manufacturers use CarModel/CarBrand. Products use SparePart/PartBrand.
There is no price or product-link field in SparePart, so those were not invented.
Product-to-component association remains SparePart.car_part; vehicle fitment
remains PartCompatibility. UI does not infer compatibility.

## 11. Authentication / permissions

Existing email/password SimpleJWT login/refresh and profile API.
Every management endpoint requires DRF IsAdminUser, not merely a hidden UI route.
Anonymous requests are denied (401); nonstaff requests are denied (403).
At the original migration QA stage, no live staff account was created or promoted.
The later live final QA found the existing active staff `dio`; its credentials
were not changed. See section 18 for the authorized temporary account and live CRUD.

The original migration admin screenshots used an isolated SQLite copy of actual catalog records with a
temporary QA staff account only in that copy. Live user/catalog mutations from
that original admin browser QA: 0. The later final QA exercised actual PostgreSQL
through real browser forms and cleaned every temporary record afterward.
The existing live JWT secret triggers a short-key warning; it was not changed.

## 12. Responsive implementation

Desktop cinematic canvas, tablet layout, mobile 3D/tap interaction and lower
component sheet. Vertical touch story scrolling is enabled alongside horizontal
orbit. Tables scroll inside their surface on mobile; forms remain scrollable.
Focus states, readable contrast, native modal focus/Escape handling and an optional
component index support basic keyboard access. Reduced-motion keeps a calm camera
while retaining component exploration and disassembly.

## 13. Visual QA and performance

The application was actually run in the browser, including the production build.
Public browser regression, isolated admin QA and additional states QA passed.
Captured loading, home, catalogs, assembled car, camera close-ups, partial/full
explode, actual hover/click, component information, product, admin lists/forms,
delete confirmation, tablet, mobile, empty and not-found states.

No critical JS exceptions or failed API/model requests in the main regression.
External image requests from existing catalog preview URLs were blocked by the
QA browser (`ERR_NETWORK_ACCESS_DENIED`); fallback states avoid fabricated imagery.
The intentional missing-product test receives an expected 404.

The browser uses Microsoft Basic Render Driver. Its software render timings are
not representative production FPS; no GPU FPS guarantee or measured absence of
hardware regression is claimed. Adaptive DPR/shadows and demand-based rendering
are retained. The 3D module is lazy-loaded. The substantial Three.js chunk still
produces Vite's >500kB advisory, not a build failure.

Simplification removed persistent lab/sidebar UI, all-label annotations, fabricated
fitment/metrics, duplicate selection text and unnecessary selection hints.
No numeric claim that exactly 20% was removed is made.

## 14. Screenshot paths

All implementation screenshots are in `qa/react-light`:

- [about.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/about.png)
- [admin-cars-edit.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-cars-edit.png)
- [admin-cars-form.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-cars-form.png)
- [admin-cars.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-cars.png)
- [admin-compatibility-edit.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-compatibility-edit.png)
- [admin-compatibility-form.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-compatibility-form.png)
- [admin-compatibility.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-compatibility.png)
- [admin-components-edit.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-components-edit.png)
- [admin-components-form.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-components-form.png)
- [admin-components.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-components.png)
- [admin-delete-confirmation.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-delete-confirmation.png)
- [admin-login.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-login.png)
- [admin-overview.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-overview.png)
- [admin-products-edit.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-products-edit.png)
- [admin-products-form.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-products-form.png)
- [admin-products.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/admin-products.png)
- [audi-assembled.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/audi-assembled.png)
- [brake-close-up.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/brake-close-up.png)
- [cars.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/cars.png)
- [catalog-component.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/catalog-component.png)
- [component-deep-link.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/component-deep-link.png)
- [component-hover.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/component-hover.png)
- [component-selected.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/component-selected.png)
- [empty-parts.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/empty-parts.png)
- [engine-close-up.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/engine-close-up.png)
- [full-explode.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/full-explode.png)
- [home.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/home.png)
- [loading-vehicle.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/loading-vehicle.png)
- [mobile-admin-components.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-admin-components.png)
- [mobile-admin-form.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-admin-form.png)
- [mobile-admin-login.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-admin-login.png)
- [mobile-admin-overview.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-admin-overview.png)
- [mobile-audi.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-audi.png)
- [mobile-cars.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-cars.png)
- [mobile-component.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-component.png)
- [mobile-home.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-home.png)
- [mobile-parts.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-parts.png)
- [mobile-reduced-motion.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-reduced-motion.png)
- [mobile-tap.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/mobile-tap.png)
- [not-found-product.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/not-found-product.png)
- [partial-explode.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/partial-explode.png)
- [parts.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/parts.png)
- [product.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/product.png)
- [tablet-audi.png](C:/Users/Dio/Desktop/py4-exam3/car-concept-3d-dashboard/qa/react-light/tablet-audi.png)

Stitch exports: [home](qa/stitch-light/home.png), [vehicle](qa/stitch-light/vehicle.png),
[admin](qa/stitch-light/admin.png), [mobile](qa/stitch-light/mobile.png).

Evidence: [public regression](qa/react-light/report.json),
[admin QA](qa/react-light/admin-report.json), [states QA](qa/react-light/states-report.json).

## 15. Tests / build

- Frontend node tests: 4 passed.
- Django test suite: 15 passed; system check: 0 issues.
- Migration consistency check: no changes detected.
- Production build: passed.
- Production-browser regression: passed.
- Public and admin browser reports: no critical JS errors.
- Git whitespace check: passed (only Windows LF/CRLF notices).

## 16. Files created / modified for this migration

Frontend entry/build: package.json, package-lock.json, vite.config.js, index.html,
public/favicon.svg, src/entry.jsx, src/App.jsx, src/styles/light.css, src/api.js,
src/performanceQuality.js (software-driver hint), README.md, REACT_MIGRATION.md,
IMPLEMENTATION_REPORT.md.

New pages: HomePage.jsx, CarsPage.jsx, VehiclePage.jsx, PartsPage.jsx,
ProductPage.jsx, AboutPage.jsx.
New UI: components/Navbar.jsx, UI.jsx, CatalogCards.jsx, ThreeScene.jsx,
ComponentInfo.jsx.
New admin: AdminLayout.jsx, AdminOverview.jsx, AdminResource.jsx, RecordForm.jsx,
schema.js.
New utilities: hooks/useApi.js, api/catalog.js, three/story.js,
three/vehicleScene.js, three/modelUrl.js.
Tests/evidence: tests/story.test.mjs, scripts/react-browser-qa.mjs,
scripts/admin-browser-qa.mjs, scripts/states-browser-qa.mjs, qa/react-light,
qa/stitch-light.

Backend: accounts/serializers.py, cars/models.py, cars/views.py,
cars/migrations/0002_car_is_active.py, cars/test_management.py,
config/management_api.py, config/urls.py, config/test_settings.py,
config/qa_settings.py, shop/views.py.

The worktree already contained other changes, prepared Audi assets, audit files
and tooling. They were preserved and are not represented as newly authored
migration work.

The frontend .gitignore was also updated for generated/development files.

## 17. Git / review

Worktree remains dirty with modified and untracked files, ready for your review.
No staging, commit or push was performed. Existing unrelated changes remain.

Run instructions and deployment route fallback are in REACT_MIGRATION.md.
Development: http://127.0.0.1:4174. Production preview: http://127.0.0.1:4175.

## 18. Final real-world QA — 2026-09-27

Final outcome: **PASS in the tested local/browser-emulated scope**, with the
environment/hardware limitations explicitly recorded below.

This is a new verification against the actual running application and local
PostgreSQL data, not the earlier isolated SQLite admin session. Django was
running on 8000, React development on 4174, and the freshly built production
preview on 4175. No redesign or production implementation rewrite was made.

### Browser method and scope

The native computer-use browser was unavailable (`Browser is not available: edge`).
Fallback: the actual local Edge browser via CDP, with browser mouse/keyboard/touch
input, screenshots, runtime exceptions, console messages and network responses.
This was automated real-browser interaction, not a human/manual GUI session.
Mobile checks used 390 × 844 device/touch emulation, not a physical handset.

All required routes loaded with actual API data on development and production:
`/`, `/cars`, `/cars/4`, `/cars/4/components/front_left_brake_disc`, `/parts`,
`/parts/1`, `/about`, `/admin`. Actual navigation links, component deep links,
React Router transitions and browser Back/Forward also passed. Leaving the
vehicle page released its canvas and scene controller.

### Live login and admin CRUD

Existing active staff `dio` was preserved without password reset. With explicit
permission, a separate random-password, non-superuser staff account
`aa_qa_20260927_e4ce29f7` was created temporarily. Credentials were reported in
conversation only; no password/token was hardcoded or saved in this report.
The React email/password login form succeeded using the normal JWT flow;
no access token was injected to bypass login. Logout succeeded.

Actual browser form submissions and successful API responses verified:

- Cars: create, edit, deactivate, public-list exclusion, reactivate, delete.
- CarPart: create, edit and delete; actual category/car/component_id fields.
- Products: create, edit and delete; actual brand/category/component/SKU fields.
- Compatibility: create, change from one temporary car to another, inspect and delete.
- Delete confirmation: modal shown; cancellation preserved the record;
  subsequent confirmation deleted it. All destructive targets were guarded
  by the temporary marker/known QA IDs.
- Mobile admin table remained horizontally scrollable inside its surface,
  with no document overflow.

Temporary IDs: cars 5 and 6, CarPart 115, product 12, compatibility 12.
All were deleted through the admin UI. Temporary staff ID 6 was subsequently
deleted by an exact ID/username/email match. Existing staff ID 5 remained active.

All 13 catalog tables were compared before/after using ordered records and a
canonical SHA-256 digest. Both snapshots matched:
`674d6f364ba5d3aad158ebba7ab6c0e9d79bb55f47f3f508827c84dc9d60b582`.
Final counts: 4 cars, 101 CarPart, 11 products, 11 compatibility records.
Thus existing Audi/demo data was preserved, not merely visually assumed intact.

### Audi and component regression

Audi loads assembled. Model audit: 74 semantic IDs, 152 source/current meshes,
zero missing nodes, lost meshes or unassigned meshes. All 74 IDs have backend
CarPart matches. Every component was selected through its actual index button;
each rendered the correct backend name and component_id with no info API error.
All 74 were focusable. Actual geometry Raycaster hover/click selected `door_left`;
actual emulated touch selected `front_left_tire`. Orbit mouse drag changed camera.
Deep-link component information and compatible-product empty state worked.

Design, engine/rear, brake/wheel, partial and full explode poses were inspected.
All 74 components move under explode. Repeating 0.371 produced identical
transforms; reversing to 0 restored all positions exactly (maximum error 0).
An additional scroll-only test, without calling setStoryProgress or
setExplodeProgress, reached 100% by scrolling to the end and returned to 0% by
scrolling to the beginning. Reassembled transforms exactly matched the initial
state; screenshots are `components/native-scroll-full-explode.png` and
`components/native-scroll-reassembled.png` beneath the final QA directory.
Only one canvas was active. The original GLB is unchanged:
`8B8DACE56173866F22F473D30B05450D6D2871562297F96C89CC9AD590448A44`.

### Visual and console review

Screenshots were inspected for the homepage, catalog, assembled Audi, engine,
brakes, partial/full explode, hover, component information/deep link, parts,
product, about, live admin overview/forms and mobile public/admin views.
No empty application routes, broken layout, document horizontal overflow,
unreadable overlaps, tiny vehicle viewer or inconsistent major surface corners
were found. Catalog cards and functional admin surfaces were retained; no
subjective redesign was performed. Missing external previews show their existing
explicit fallback instead of broken image icons or invented replacement data.

Reports contain no uncaught application exceptions or HTTP error statuses for
internal API/assets. The 74-component and live admin checks additionally capture
console.error and recorded zero. No critical React or Three.js errors occurred.

Warnings/limitations retained, not concealed:

- Nine external catalog-image requests per public regression run were blocked
  by this environment (`net::ERR_NETWORK_ACCESS_DENIED`); previews fall back.
- Edge uses Microsoft Basic Render Driver/software WebGL. Measured approximately
  506 ms CPU render time in one run cannot establish real GPU/mobile FPS.
  Hardware performance and physical-device QA remain unverified.
- Vite warns about the approximately 704 KB Three.js chunk (>500 KB); production
  build succeeds. React Router dependency `use client` notices are nonfatal.
- Existing development JWT secret has a short-key warning; it was not changed.
- Git emits Windows LF/CRLF conversion notices, not whitespace test failures.

### Tests, build and legacy-entry audit

Re-run in this final QA session: frontend tests 4/4 passed; Django tests 15/15
passed with `config.test_settings` and zero system-check issues; production build
passed. The current production preview passed the full public/3D/mobile browser
regression again. `git diff --check` passed.

`index.html` loads only `/src/entry.jsx`; entry mounts React/BrowserRouter and
imports `src/styles/light.css`. Runtime resource inspection found no obsolete
`main.js`, `labSystem.js` or root `styles.css` loaded. Useful legacy Three.js
modules/adapters remain intact; no files were deleted speculatively.

### Evidence and worktree

- [Development public/3D/mobile report](qa/final-real-world/public/report.json)
  and 21 screenshots in `qa/final-real-world/public/`.
- [Live admin CRUD report](qa/final-real-world/admin/report.json)
  and 16 screenshots in `qa/final-real-world/admin/` (forms, confirmation,
  login, mobile and post-cleanup overview).
- [All 74 component UI selections and SPA navigation](qa/final-real-world/components/report.json)
  with component-selection screenshots in `qa/final-real-world/components/`.
- [Current production browser report](qa/final-real-world/production/report.json)
  and 21 screenshots in `qa/final-real-world/production/`.
- [Live data integrity and account cleanup](qa/final-real-world/data-integrity.json).

Added repeatable QA scripts: `scripts/real-world-admin-qa.mjs` (credentials from
process environment only) and `scripts/final-component-qa.mjs`. Updated this
report. No application redesign/fix was necessary during this final QA pass.
All temporary catalog data and the temporary account were removed. No critical
issues remain in the tested scope; the environment limitations above remain.
Worktree is dirty with existing migration/preparation changes and new QA evidence.
Nothing was staged, committed or pushed.

## Multi-car integration follow-up — 2026-09-27

The subsequent source-model integration adds Ford GT40 (car 7, 34 real semantic
assemblies) and modified Mercedes-Benz 300 SL / Robin V8 / OZ (car 8, 28), without
copying the Audi mapping or replacing its viewer. Original source files and Audi
GLB are preserved. There are 62 new educational CarParts, no new Products or
ProductCompatibility records, and no schema changes. Earlier QA counts above
refer to the pre-integration catalog.

See [MULTI_CAR_INTEGRATION_REPORT.md](MULTI_CAR_INTEGRATION_REPORT.md) for source
audits, all component IDs, reproducible preparation/import steps, file changes,
limitations and final screenshots. Frontend tests 7/7, Django tests 17/17 and
production build pass. Final development browser QA selects all 136 components
across the three cars; native scroll/reverse, hover/click, focus, OrbitControls,
deep links and emulated mobile tap pass with zero browser/API/internal-asset errors.
A concrete rounded mobile panel scrolling/rendering issue was fixed by moving
scrolling to an inner container, not by changing the 3D camera or materials.
No commit, push or deployment was performed.
