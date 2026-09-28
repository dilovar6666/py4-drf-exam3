# Audi R8 preparation status

The Audi source has been analysed, but it is **not yet safe to activate in the
frontend**. `src/models/index.js` intentionally continues to select
`currentCarModelConfig`, so `CarConcept.glb` remains the fallback.

## Actual source files

```text
audi-r8/Audi R8 OBJ.obj
audi-r8/Aydi R8 OBJ.mtl
audi-r8/Contact information.txt
```

The expected `Audi R8 textures/` directory is not present. The material file
name really is `Aydi R8 OBJ.mtl`.

## Static source audit

```text
OBJ size:              29,142,463 bytes
vertices:              168,981
referenced vertices:   168,969
faces:                 170,104
triangles:             323,045
named groups:          153
connected islands:     608
MTL declarations:      126
unique MTL names:      58
OBJ mtllib directives: 0
OBJ usemtl directives: 0
MTL texture references: 0
```

`Line01` is a 512-triangle presentation/background object with a bounding box
far larger than the car. The preparation script excludes it. The remaining
152 named groups contain 322,533 triangles and are mapped to logical
components without splitting all 608 loose islands.

## Blocking source defect

The OBJ contains UV coordinates and an MTL exists, but the OBJ never links the
MTL and never assigns a material to any face. The MTL also has no texture map
references, and no texture directory was supplied. Blender therefore cannot
reconstruct the verified original appearance from these files.

Do not use `--allow-unassigned-materials` for a production model. That option
exists only for a deliberately material-less preview.

Obtain or re-export an OBJ package containing:

- an `mtllib Aydi R8 OBJ.mtl` directive;
- valid `usemtl` assignments for the faces;
- every image referenced by the MTL, preferably under
  `audi-r8/Audi R8 textures/`.

## Blender commands

Blender CLI is not installed on the machine used for this audit. After Blender
is available, run these commands from `car-concept-3d-dashboard`.

First create the reviewable work file and JSON report without exporting a GLB:

```powershell
blender --background --python tools/prepare_audi_r8.py -- --analysis-only
```

Review:

```text
audi-r8/work/Audi_R8_AutoAnatomy.blend
audi-r8/work/audi-r8-blender-report.json
```

After repairing the source package and visually checking bodywork, glazing,
wheels, interior, lights, engine, orientation and materials, export:

```powershell
blender --background --python tools/prepare_audi_r8.py -- --export
```

The production export target is:

```text
assets/models/AudiR8.glb
```

The script refuses production export when the OBJ lacks material assignments,
when Blender imports no material slots, or when referenced images are missing.
It validates that the exported file exists and has a GLB header.

## Activation gate

Only after the exported GLB passes `scripts/audit-glb.mjs` and browser QA,
change `src/models/index.js` to export `audiR8ModelConfig`. Then verify loading,
materials, camera, controls, hover, click, every `componentId`, explode motion,
console output and the `AudiR8.glb` network response. Backend Audi seed data and
`model_url` must be added only after that successful model test.
