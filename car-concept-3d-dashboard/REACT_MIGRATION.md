# Auto Anatomy — React / Soft Studio

The active entry is `index.html` → `src/entry.jsx` → `src/App.jsx`.
The previous `src/main.js`, laboratory, model configs and `CarConcept.glb`
remain as migration references; they are not imported by the new public UI.
The Audi adapter, registry, GLB and all 74 semantic IDs are preserved.

## Run

Start the existing Django project on port 8000 with its normal `.env` settings.
In this frontend directory run `npm.cmd install`, then `npm.cmd run dev`.
Open http://127.0.0.1:4174. Vite proxies `/api` to Django, avoiding development
CORS differences. For a separate production API set `VITE_API_URL` before
building, or supply `window.__AUTO_ANATOMY_CONFIG__.apiUrl` before the entry.
Production hosting must rewrite application routes to `index.html` and proxy
`/api` to Django when using same-origin configuration.

Run `python manage.py migrate` for the added `Car.is_active` field (default true).
The migration has been applied locally. No catalog content was replaced.

## Routes

- `/`, `/cars`, `/cars/:carId`, `/cars/:carId/components/:componentId`
- `/parts`, `/parts/:productId`, `/about`
- `/admin`, `/admin/:resource`

Only Audi has a prepared interactive exhibit. Other actual API vehicles remain
listed, with an honest unavailable-exhibit state. Audi URLs pointing at the old
local asset endpoint resolve to the preserved current asset. Custom GLB URLs
use the existing adapter; they must implement the same semantic node contract.

## Admin and data contract

`/admin` uses the existing email/password JWT login, refresh and profile API.
All `/api/manage/` endpoints require `IsAdminUser` (`is_staff`); hiding a React
route is not the permission boundary. No production user was created or promoted.
Use an existing staff account, or explicitly provision one with Django's normal
`createsuperuser` workflow. Do not use the isolated QA account in production.

Cars, components, specifications, products, images, compatibility and related
brands/models/categories have CRUD forms. Deletes require confirmation.
Vehicle titles/manufacturers are their existing CarModel/CarBrand relations.
Product manufacturer is PartBrand. SparePart has no price or product-link field,
so those fields are deliberately absent. Product component association is
SparePart.car_part; vehicle fitment is PartCompatibility. The UI never infers fitment.

## Checks and evidence

`npm.cmd test` checks the semantic/mesh counts and story invariants.
`npm.cmd run build` builds the production app and copies the unchanged GLB.
From the project root: `python manage.py test --settings=config.test_settings --noinput`
uses an isolated SQLite test database, not the production PostgreSQL catalog.

CDP QA scripts in `scripts/react-browser-qa.mjs` and `scripts/admin-browser-qa.mjs`
expect an existing browser on port 9222. Admin QA requires an isolated catalog
copy served on 8001 plus a temporary staff token in `AUTO_ANATOMY_QA_TOKEN`.
Screenshots/reports are in `qa/react-light`; real Stitch exports in `qa/stitch-light`.
QA staff exists only in a temporary SQLite copy of actual catalog records.

The QA browser uses Microsoft Basic Render Driver, not a representative GPU.
Its software-rendering timings must not be reported as production FPS.
External preview URLs from the existing catalog were blocked by that browser;
the UI provides fallback states instead of fabricated images.

No commit or push was performed. Existing unrelated worktree changes are retained.
