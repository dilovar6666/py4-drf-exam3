# Auto Anatomy

Auto Anatomy is a cinematic, browser-based 3D encyclopedia. Its Three.js experience is model-agnostic: a small model config maps the active GLB hierarchy to stable logical component IDs used by the story, exploded view, Raycaster, camera focus and laboratory.

## Experience

1. Real GLB loading progress and cinematic reveal.
2. Scroll-controlled camera movement.
3. Reversible exploded view tied directly to scroll progress.
4. In-scene transition into a minimal automotive laboratory.
5. Seven exhibits made from complete logical component hierarchies in the source GLB.
6. Raycast hover and click selection.
7. Animated camera focus, orbit and zoom inspection.
8. Car-specific information panel, component list and explored counter.
9. Django-backed Cars, Garage, Shop, Favorites, Cart and Account panel.
10. Registration, email verification, JWT login/refresh, profile and logout flows.

## Source-model components used in the lab

- Engine: `Engine`
- Front wheel: the complete `WheelFrontL` hierarchy
- Steering assembly: `InteriorSteeringBase` plus the complete `InteriorSteeringCylinder` hierarchy
- Seat assembly: `InteriorSeatsColor1`, `InteriorSeatsColor2`, `InteriorSeatsFrame1`, `InteriorSeatsFrame2`
- Hood assembly: the complete `BodyHood` hierarchy
- Left door: the complete `BodyDoorLColor1` hierarchy
- Rear assembly: the complete `BodyRearPanelsColor1` hierarchy

The source model contains 109 runtime `THREE.Mesh` objects (97 glTF mesh resources distributed across 101 nodes), including four wheel groups, individual brake discs and pads, doors, glazing, lights, interior trim, pedals and axles. No meshes are removed during component grouping. The source does not contain separately named transmission or suspension assemblies.

## Project structure

```text
index.html              UI structure and CDN imports
styles.css              responsive visual system
src/main.js             scene, story and component-ID interactions
src/modelAdapter.js     GLB loading, normalization, validation and logical components
src/componentRegistry.js logical component lookup and Mesh-to-component resolution
src/labSystem.js        model-agnostic exhibit creation and interactions
src/labSlots.js         reusable exhibition slots
src/models/index.js     active model selection and DEBUG_MODEL flag
src/models/currentCar.js current GLB path, node mapping, explode and Lab config
src/api.js              API base URL, JWT storage/refresh and endpoint client
src/appState.js         selected Car and CarPart.component_id state
src/appPanel.js         API-backed account, vehicle and spare-part UI
src/partsData.js        backend CarPart data with local GLB fallback content
CarConcept.glb          original vehicle model
MODEL_REPLACEMENT.md    beginner-friendly model replacement guide
ATTRIBUTIONS.md         model licensing and credits
```

To connect a future GLB without rewriting the application, follow [MODEL_REPLACEMENT.md](MODEL_REPLACEMENT.md).

## Run locally

This is a native ES-module project rather than a Vite/npm application, so it has no build step or `package.json`. Copy the frontend environment example and set the Django origin:

```bash
copy .env.example .env
```

```env
AUTO_ANATOMY_API_URL=http://127.0.0.1:8000
```

Start Django from the repository root, then start the environment-aware frontend server from this directory:

```bash
node scripts/serve.mjs 4173
```

Open `http://127.0.0.1:4173`. ES modules and the GLB should not be opened directly with a `file://` URL.

For a 3D-only fallback, any static HTTP server still works because `runtime-config.js` contains a development API default:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`. Three.js, OrbitControls, GLTFLoader, Draco and GSAP/ScrollTrigger remain loaded from pinned CDN URLs.

## Controls

- Story: scroll forward or backward.
- Lab: drag/swipe to orbit and scroll/pinch to zoom.
- Desktop lab movement: `W`, `A`, `S`, `D`.
- Select: click/tap a 3D exhibit or use the component list.
- Inspection: drag to orbit around the focused component, scroll/pinch to zoom.
- Return: use **Back to Lab**, the close button or `Esc`.

## API and 3D scope

The selected vehicle, component details and spare-part data come from Django. The current `CarConcept.glb` remains a safe fallback when a selected `Car.model_url` is missing, inaccessible or a placeholder. Mesh names remain isolated inside `src/models/currentCar.js`; Django is joined only through the stable `CarPart.component_id`. The model remains subject to the credits and license documented in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
