# Recovery audit — 2026-09-27

## RECOVERY

### State found after the interrupted session

- The worktree already contained extensive tracked edits and generated, untracked model/QA artifacts. Those were preserved; no reset, clean, checkout, push, or deployment was performed.
- The older integration report and implementation report documented Audi R8, Ford GT40 (34 components), and modified Mercedes-Benz 300 SL (28 components) as integrated. Their three GLBs existed and validated, so their prepared exports were retained.
- `qa/six-car` already contained source analyses, per-car review configurations, geometry review renders, and preparation reports for car1–car6. The newer review configs had counts 52/40/24/37/29/27. However, the registered `vehicles.json` still listed only the earlier two additions. At discovery, car2 and car4–car6 had `runtime_exported: false` and `bytes: null`; their named GLB output files did not exist. These were the unfinished artifacts. The older car1/3 runtime GLBs were valid, so they were not overwritten with the unregistered review variants.
- The first incomplete end-to-end stage was runtime GLB preparation/integration for car2, followed by car4, car5, and car6. Their existing source analyses and reviewed component configs were reused. Original files under `source_models/` were not modified.
- The four missing GLBs were exported from those review configs. Their geometry mappings were then added to the existing catalog/viewer/Django flow. Texture dimensions were reduced to 1024 px for VAZ 2105, Generic Hatchback, and Mercedes 560 SEL; geometry, component IDs, and transforms stayed intact. QA renders were reused as local previews.

### Recovered status by required stage

Status values are the requested classifications: **DONE**, **PARTIAL**, **BROKEN**, and **NOT STARTED**. Partial entries name a source limitation below; no required stage remains broken or not started.

| Vehicle | SOURCE | ANALYSIS | GEOMETRY DECOMPOSITION | SECOND DECOMPOSITION PASS | SEMANTIC COMPONENTS | COMPONENT MAPPING | FINAL GLB | EXPLODE | REVERSE EXPLODE | THREE.JS | REACT | DJANGO | VISUAL QA | TESTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Audi R8 | DONE | DONE | DONE | DONE | DONE | DONE (74) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car1 — Ford GT40 | DONE | DONE | DONE | DONE | DONE | DONE (34) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car2 — VAZ 2105 | DONE | DONE | DONE | DONE | DONE | DONE (40) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car3 — Mercedes-Benz 300 SL | DONE | DONE | DONE | DONE | DONE | DONE (28) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car4 — Generic Hatchback | DONE | DONE | DONE | DONE | DONE | DONE (37) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car5 — identity unconfirmed | PARTIAL | DONE | DONE | DONE | PARTIAL | DONE (29) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |
| car6 — Mercedes-Benz 560 SEL | DONE | DONE | DONE | PARTIAL | DONE | DONE (27) | DONE | DONE | DONE | DONE | DONE | DONE | DONE | DONE |

### Evidence from recovery and final QA

- Final catalog: Audi R8 plus six source vehicles; 269 mapped semantic components total (74 + 34 + 28 + 40 + 37 + 29 + 27). Each GLB was parsed as GLB 2.0, checked for its configured component groups and descendant meshes, and audited for geometry, buffers, materials, and node transforms. No mapped component is missing geometry.
- Final GLB sizes: Audi R8 8.50 MB; GT40 4.29 MB; 300 SL 18.45 MB; VAZ 2105 49.65 MB; Generic Hatchback 32.18 MB; Car 5 2.70 MB; Mercedes 560 SEL 15.17 MB. The reduced GLBs retain 40/37/27 semantic groups respectively.
- Frontend tests: 11/11 PASS. Django tests: 17/17 PASS; system checks report no issues. Production build: PASS. Build warnings are the existing React Router directive warning and large Three.js chunk warning.
- Local Django import is complete and idempotent. GT40 and 300 SL reuse their existing records; VAZ, Generic Hatchback, Car 5, and 560 SEL were added as cars 13–16 in this database. The import created no Product or ProductCompatibility records.
- Browser QA: `qa/six-car/browser/report.json` records all 269 per-component selections, actual Raycaster hover/click, deep links, OrbitControls, mobile taps, and all seven models with zero JS exceptions, console errors, HTTP errors, or failed requests. The exact explode sequence `0 → 25 → 50 → 75 → 100 → 75 → 50 → 25 → 0` was checked against live transforms for all seven cars in `qa/six-car/browser/explode-report.json`; interpolation error and reverse drift were 0 for every vehicle.
- Audi regression retained the validated 74-component / 152-mesh mapping and passed load, mapping audit, hover, selection, focus/deep link, explode/reverse, and routes. No Audi GLB or config replacement was made.
- Browser evidence is from headless Edge/CDP with emulated mobile dimensions, not a physical handset. Source renders and per-car preparation/review evidence remain under `qa/six-car/`.

### Remaining limitations

- Car 5 comes from a garage-scene source whose exact vehicle identity is not established. It is published as “Car 5 (identity unconfirmed)”; undocumented specifications and compatibility are not inferred.
- Mercedes 560 SEL has a fused body/chassis source mesh. Its second pass found no safe source-supported split, so that stage is PARTIAL and the fused assembly remains one component. The Mercedes 300 SL and GT40 also retain some fused source assemblies; they were reviewed and not arbitrarily cut.
- VAZ 2105 (49.65 MB) and Generic Hatchback (32.18 MB) remain the largest runtime files after safe 1024 px texture reduction. Actual hardware frame rates were not established by the software-rendered browser environment.
- Car 5’s emulated mobile tap was verified on its visible body shell. All 29 component selections passed through the index/Raycaster path; an individual mobile tap on the rear-left rim is not claimed.

---

# Auto Anatomy: multi-car integration

Date: 2026-09-27. Local development only; no commit, push, deployment or production database change.

## Source audit and preparation

Original source files are preserved. Object counts are Blender scene objects; GLB mesh counts distinguish nodes from material primitives (Three.js draw meshes). Triangle counts evaluate source modifiers. Identification comes from source names, materials, world-space bounds and actual renders, not Audi's mapping.

### CAR 1: Ford GT40 — source exhibit

- Source: `source_models/car1/GT40.blend`; BLEND, 33,442,852 bytes.
- Source objects/meshes: 172/167; triangles: 846,078.
- Source materials: 86 datablocks, 45 assigned; images: 11. Flat hierarchy, no parent links. Packed and reference images are present.
- Prepared GLB: `assets/models/FordGT40.glb`; 4,294,104 bytes (4.29 MB).
- Final mesh nodes/material primitives: 162/255; triangles: 694,180; materials: 40; embedded images/texture references: 5/7.
- Semantic components: 34. Local Django car ID: 7; routes `/cars/7`, `/cars/7/components/engine`.
- Year/precise variant: undocumented; existing year field stores 0 and public UI explicitly says “Year not documented”.

Component IDs:

```text
body_shell
wheel_fl
wheel_fr
wheel_rl
wheel_rr
windshield
side_window_left
side_window_right
rear_window
wiper
door_trim_left
door_trim_right
seat_left
seat_right
steering_wheel
pedals
gear_selector
handbrake
instrument_cluster
interior_controls
interior_ducts
interior_bracing
engine
radiator
exhaust
headlights
indicators
taillights
front_grille
rear_grille
underbody
rear_bracing
rear_mechanical_assembly
exterior_hardware
```

### CAR 2: Mercedes-Benz 300 SL — Robin V8 / OZ source exhibit

- Source: `source_models/car3/sl300-robin-v8-and-oz-wheels/source/Sl300.glb`; GLB, 33,579,336 bytes.
- Source objects/meshes: 90/52; triangles: 771,444.
- Source materials: 23 datablocks, 23 assigned; images: 22. 80 parented objects; 22 embedded images and adjacent texture files.
- Prepared GLB: `assets/models/Mercedes300SL.glb`; 18,448,060 bytes (18.45 MB).
- Final mesh nodes/material primitives: 52/52; triangles: 533,006; materials: 23; embedded images/texture references: 22/22.
- Semantic components: 28. Local Django car ID: 8; routes `/cars/8`, `/cars/8/components/engine`.
- Year/precise variant: undocumented; existing year field stores 0 and public UI explicitly says “Year not documented”. Source explicitly describes Robin V8 / OZ wheels, not a stock factory specification.

Component IDs:

```text
body_shell
exterior_trim
interior_assembly
glazing_seals
body_inserts
glazing
front_grille
instrument_cluster
chassis
interior_details
front_left_rim
front_left_tire
front_left_brake_disc
front_left_wheel_hardware
front_right_rim
front_right_tire
front_right_brake_disc
front_right_wheel_hardware
rear_left_rim
rear_left_tire
rear_left_brake_disc
rear_left_wheel_hardware
rear_right_rim
rear_right_tire
rear_right_brake_disc
rear_right_wheel_hardware
rear_mechanical_assembly
engine
```

## Architecture and transforms

One shared Three.js viewer and React route remain. `vehicles.json` contains source-specific mesh assignments and educational metadata. `vehicleCatalog.js` chooses a supported adapter by the API model URL, retaining the original Audi configuration. Unknown models never acquire Audi mappings. VehiclePage consumes this configuration for chapters, component lists and direct links. API remains the source of the public catalog and component information.

Generic Blender analyzer/preparer complements (does not replace) the Audi pipeline. Evaluated world transforms are baked into mesh vertices exactly once, parents detached, geometry centered/scaled and rotated for +Z front/+Y up in Three.js. Identity semantic parents carry stable IDs. Source modifiers are evaluated; materials/textures retained where export supports them. Moderate decimation and 2K texture limits precede Draco compression; no destructive whole-car merge. GT40 output excludes only studio ground and four palette objects. Original sources are never saved over.

Prepared physical lengths: GT40 4.4m; 300 SL 4.5m, normalized in the existing viewer. Car-specific camera stages place 300 SL engine close-up at its actual front engine, rather than Audi's rear. Existing Raycaster, selection, highlights, OrbitControls, focus and deterministic explosion are reused. Draco decoder now ships locally, avoiding an external CDN dependency. Dev and production Vite handlers expose all three supported models.

Django uses existing CarBrand, CarModel, Car, CarPart and PartCategory fields only; no migration or invented field. Idempotent management command imports 2 cars and 62 actual CarParts. Product/ProductCompatibility remain untouched (11/11 existing records). Existing catalog-record checksum remains unchanged: `674d6f364ba5d3aad158ebba7ab6c0e9d79bb55f47f3f508827c84dc9d60b582`.

## Reproducible pipeline

Run from `car-concept-3d-dashboard` (PowerShell):

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python tools/analyze_vehicle.py -- '../source_models/car1/GT40.blend' 'qa/multi-car/gt40-source.json'
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python tools/prepare_vehicle.py -- ford_gt40
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python tools/prepare_vehicle.py -- mercedes_300sl
```

From repository root, with the existing development environment loaded:

```powershell
.\.venv\Scripts\python.exe manage.py import_prepared_vehicles --dry-run
.\.venv\Scripts\python.exe manage.py import_prepared_vehicles --origin http://127.0.0.1:4174
```

For another vehicle: audit/render first; add an exhaustive source-specific definition to vehicles.json; prepare; inspect output; import; run tests and browser QA. Never fabricate missing geometry or compatibility.

## Concrete QA fix

On the headless Edge software renderer, selected GT40/300SL vanished above the mobile information panel when its outer rounded fixed element was scrollable. Reproduced with actual screenshots; moving scrolling to an inner `component-info__scroll` restored the visible vehicle and preserved scrollable information. No change to focus distances, camera algorithm, material override, floor visibility or Audi semantics was retained. Render diagnostics are read-only.

## Tests and evidence

- Frontend: 7/7 PASS, including individual exhaustive new mappings, local GLB/Draco assets, unknown-model isolation and original Audi 74 IDs / 152 meshes.
- Django: 17/17 PASS, zero system-check issues, isolated test database; new import idempotence, exact component API mappings, dry-run rollback, no product/compatibility creation.
- Production build: PASS; all three GLBs and local Draco files emitted. Existing large Three.js chunk and React Router directive warnings are non-fatal.
- Production preview browser smoke: PASS for all three cars on port 4175, including real model loading, hover/click, representative body/engine selections, component deep links, native scroll/reverse, OrbitControls and emulated mobile tap. Five representative index selections were checked here; the exhaustive 136-selection run is the development report. Evidence: `qa/multi-car/production-browser/report.json` and screenshots in the same directory. Zero exceptions, console errors, HTTP errors or failed requests.
- Actual browser: headless Edge via CDP; mouse hover/click, Orbit drag, component index selections, deep links and emulated touch. Not claimed as physical mobile or human-operated GUI testing. Final native-scroll results are in `qa/multi-car/final-browser/report.json`.
- Final development browser QA: PASS for all three cars, 136/136 component selections with matching Django information, real hover/click Raycaster targets, camera focus/deep links, Orbit drag, emulated mobile tap and no horizontal overflow. Native engine/wheel/partial/full scroll changes camera; returning to top restores exact component transforms. Both deterministic midpoint and reverse-position maximum errors are exactly 0 for every car. Exceptions, console errors, HTTP errors and failed requests: 0.
- Explode, hover, selection, camera focus, React integration and Django integration: PASS for GT40 and 300 SL. Audi load, original 74-ID / 152-source-mesh mapping, explode/reverse, hover, selection, focus and routes: PASS. Audi GLB SHA256 unchanged: `8B8DACE56173866F22F473D30B05450D6D2871562297F96C89CC9AD590448A44`.
- Assembled draw calls (including floor): Audi 298, GT40 256, 300 SL 53; one active canvas each. Software-rendered average CPU render times in this run: approximately 1726 / 1033 / 1043 ms respectively. This exceptionally slow software-GPU environment is not evidence of real-device FPS or a hardware performance guarantee.
- Geometry: Blender 5.2.2 LTS renders inspected for both prepared cars; no flyaway geometry, orientation and material appearance checked.

Screenshot locations:

- `qa/multi-car/ford_gt40/prepared-studio.png`
- `qa/multi-car/mercedes_300sl/prepared-studio.png`
- `qa/multi-car/final-browser/`: catalog, each car assembled/partial/exploded/hover/selected/deep-link, native-scroll engine/wheel/partial/full, reassembled and mobile-tap.
- `qa/multi-car/browser/focus-settled-{4,7,8}.png`: mobile focus after the panel fix. Earlier browser mobile captures predate the fix; do not use those as final QA evidence.
- Full source audits: `qa/multi-car/{gt40,sl300}-source.json`; preparation evidence: per-car preparation.json; exact metrics: assets-summary.json.

## Limits / warnings

- GT40's single body contains exterior panels, so hood/doors/fenders cannot truthfully explode independently. Wheel assemblies do not provide confidently separable brake discs/calipers. Rear hardware/winch purpose is undocumented; retained as technical assemblies. Legacy Cycles shaders are converted to supported PBR approximations. Missing source image: TexturesCom_DeepDamageMetal_1024_height.tiff; not fabricated.
- 300 SL body/chrome/glass/interior are material-combined assemblies; individual doors/hood/seats/dashboard are not invented. Wheel rim/tire/disc geometry is separate; small wheel hardware is not guessed to be a brake caliper. Rear mechanical objects' exact function is undocumented.
- 300 SL remains 18.45 MB, mostly embedded textures; further aggressive compression avoided to preserve anatomy. Hardware FPS is not established by software-rendered Edge or mobile emulation. Existing external catalog images can be network-blocked; local new previews and model assets do not depend on them.
- Some Blender material/deprecation/cache warnings are non-fatal; original files remain intact.

## Files in this integration

Created:

- tools/analyze_vehicle.py; tools/prepare_vehicle.py
- src/models/vehicles.json; src/models/vehicleCatalog.js
- assets/models/FordGT40.glb; assets/models/Mercedes300SL.glb
- public/vehicle-previews/{ford_gt40,mercedes_300sl}.png; public/draco/*
- tests/multi-car.test.mjs
- scripts/multi-car-browser-qa.mjs; scripts/multi-car-focus-qa.mjs; scripts/inspect-vehicle.mjs
- cars/management/commands/import_prepared_vehicles.py; cars/test_prepared_vehicles.py
- qa/multi-car/*; MULTI_CAR_INTEGRATION_REPORT.md

Modified:

- src/three/{vehicleScene.js,story.js,modelUrl.js}
- src/modelAdapter.js (local Draco path only for this integration)
- src/components/{ThreeScene.jsx,CatalogCards.jsx,ComponentInfo.jsx}
- src/pages/VehiclePage.jsx; src/styles/light.css; vite.config.js
- IMPLEMENTATION_REPORT.md (integration follow-up)

Existing React migration and other prior dirty-worktree changes remain untouched. Audi model/config/preparation script are preserved. Git: no commit, no push.
