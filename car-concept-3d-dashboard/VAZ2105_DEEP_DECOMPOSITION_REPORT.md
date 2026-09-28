# VAZ 2105 - Deep Decomposition Report

## Source and inventory

- **Source file:** `C:\Users\Dio\Desktop\py4-exam3\source_models\car2\vaz-2105\source\2105portfolio_sketch.blend` (original opened read-only; never saved or modified)
- **Format:** Blender 5.2.2 LTS native .blend
- **Source bytes:** 69,952,136 (69.95 MB)
- **Scene:** Scene; 226 scene objects total: 208 meshes, 7 cameras, 4 lights, 7 empties.
- **Mesh datablocks:** 208; unique per object yes; linked objects/data 0; evaluated object instances 0.
- **Source geometry:** 25,552 evaluated vertices, 49,750 edges, 24,484 faces, **45,784 triangles**. 464 connected geometry islands among all meshes; 101 objects contain multiple islands.
- **Materials / slots:** 34 materials; per-object slots are listed in the source inventory JSON. No material was treated as a semantic part.
- **Textures/images:** 154 image datablocks (153 packed; 63,019,421 packed bytes), 34 collections, 12 vertex groups, 151 modifiers.
- **Collections:** 34 flat top-level collections; no nested child collections. Full membership/material/image metadata: [source-assets.json](qa/vaz2105-deep/source-assets.json).
- **Visibility:** hidden viewport objects 0; hidden render objects 0; not visible in the evaluated view layer 7. Those seven objects are reference-image empties; no hidden vehicle mesh was found.
- **Hierarchy / modifiers:** parents and children, collection memberships, flags, material slots, vertex groups, modifiers, evaluated bounds, and island detail are recorded for every object in [source-inventory.json](qa/vaz2105-deep/source-inventory.json). No linked mesh datablocks or mesh instances were found. All 151 active modifiers were applied by the preparation export on a working copy.
- **Vehicle coordinate convention verified from source geometry:** front = negative source Y, left = positive source X, top = positive Z. Inventory island-side labels were recalculated using those axes.

### Largest source meshes

Sorted by triangle count:

| Object | Triangles | BBox volume | Islands | Dimensions |
|---|---:|---:|---:|---:|
| Cube | 2415 | 35.858 | 1 | 2.789 x 6.707 x 1.917 |
| Plane.001 | 1536 | 0.126 | 2 | 1.577 x 0.195 x 0.409 |
| Cylinder.001 | 1296 | 1.039 | 2 | 2.536 x 0.640 x 0.640 |
| Cylinder.043 | 1296 | 1.039 | 2 | 2.536 x 0.640 x 0.640 |
| Plane.020 | 1252 | 0.481 | 1 | 2.244 x 0.480 x 0.446 |
| Plane.003 | 1240 | 0.213 | 2 | 1.756 x 0.256 x 0.473 |
| Cube.008 | 1115 | 17.398 | 1 | 2.654 x 6.394 x 1.025 |
| Plane.005 | 1030 | 2.039 | 6 | 0.586 x 5.707 x 0.609 |
| Cylinder | 912 | 2.758 | 2 | 2.565 x 1.037 x 1.037 |
| Cylinder.042 | 912 | 2.758 | 2 | 2.565 x 1.037 x 1.037 |

Sorted by bounding-box volume:

| Object | Triangles | BBox volume | Islands | Dimensions |
|---|---:|---:|---:|---:|
| Cube | 2415 | 35.858 | 1 | 2.789 x 6.707 x 1.917 |
| Plane.019 | 862 | 18.257 | 1 | 2.599 x 4.132 x 1.700 |
| Cube.008 | 1115 | 17.398 | 1 | 2.654 x 6.394 x 1.025 |
| Plane.046 | 108 | 3.222 | 18 | 2.519 x 6.566 x 0.195 |
| Plane.025 | 286 | 2.761 | 1 | 2.521 x 1.564 x 0.701 |
| Cylinder | 912 | 2.758 | 2 | 2.565 x 1.037 x 1.037 |
| Cylinder.042 | 912 | 2.758 | 2 | 2.565 x 1.037 x 1.037 |
| Plane.005 | 1030 | 2.039 | 6 | 0.586 x 5.707 x 0.609 |
| Plane.040 | 184 | 1.535 | 2 | 2.069 x 0.715 x 1.038 |
| Cube.077 | 512 | 1.403 | 4 | 2.076 x 1.497 x 0.451 |

## Old result and new decomposition

- **OLD COMPONENTS:** 40
- **NEW COMPONENTS:** 95
- **Net change:** +55. Newly introduced IDs: 73, grouped as UNKNOWN +9, BODY +20, INTERIOR +28, GLASS +6, LIGHTING +6, WHEELS +4; 18 old broad IDs were retired/refined (side_glazing_fl, side_glazing_fr, side_glazing_rl, side_glazing_rr, door_panel_left, door_panel_right, headlight_assemblies, taillight_assemblies, front_indicators, engine_pipework, seating, cabin_trim, vehicle_badges, other_lamp_details, front_body_supports, unclassified_geometry, front_wheel_hardware, rear_wheel_hardware). Existing IDs retained: 22. This is a net component count, not an artificial target.
- **OLD GLB:** 49,651,408 bytes (49.65 MB)
- **NEW GLB:** 6,865,804 bytes (6.87 MB)
- **Size reduction:** 42,785,604 bytes (86.2%).
- **OLD TRIANGLES:** 45,784
- **NEW TRIANGLES:** 45,784
- All 206 source vehicle mesh objects with geometry are represented; two zero-triangle meshes (Plane.017, Plane.018) were excluded. Candidate coverage audit reports 232 prepared mesh nodes, 95 groups, zero duplicate source assignments, zero missing source meshes, zero extraneous source meshes.

### Component mapping

| componentId | Category | Source object(s) | Final mesh(es) | Geometry islands | Triangles | Position | Confidence | Classification reason |
|---|---|---|---|---:|---:|---|---|---|
| `tire_fl` | WHEELS | Cylinder | Cylinder__island_0 | 1 | 456 | FRONT / LEFT / BOTTOM | HIGH | Separate concentric large-radius tyre source geometry; confirm scale in the prepared render. |
| `tire_fr` | WHEELS | Cylinder | Cylinder__island_240 | 1 | 456 | FRONT / RIGHT / BOTTOM | HIGH | Separate concentric large-radius tyre source geometry; confirm scale in the prepared render. |
| `rim_fl` | WHEELS | Cylinder.001 | Cylinder.001__island_0 | 1 | 648 | FRONT / LEFT / BOTTOM | HIGH | Separate concentric smaller-radius rim source geometry; confirm scale in the prepared render. |
| `rim_fr` | WHEELS | Cylinder.001 | Cylinder.001__island_343 | 1 | 648 | FRONT / RIGHT / BOTTOM | HIGH | Separate concentric smaller-radius rim source geometry; confirm scale in the prepared render. |
| `tire_rl` | WHEELS | Cylinder.042 | Cylinder.042__island_0 | 1 | 456 | REAR / LEFT / BOTTOM | HIGH | Separate concentric large-radius tyre source geometry; confirm scale in the prepared render. |
| `tire_rr` | WHEELS | Cylinder.042 | Cylinder.042__island_240 | 1 | 456 | REAR / RIGHT / BOTTOM | HIGH | Separate concentric large-radius tyre source geometry; confirm scale in the prepared render. |
| `rim_rl` | WHEELS | Cylinder.043 | Cylinder.043__island_0 | 1 | 648 | REAR / LEFT / BOTTOM | HIGH | Separate concentric smaller-radius rim source geometry; confirm scale in the prepared render. |
| `rim_rr` | WHEELS | Cylinder.043 | Cylinder.043__island_343 | 1 | 648 | REAR / RIGHT / BOTTOM | HIGH | Separate concentric smaller-radius rim source geometry; confirm scale in the prepared render. |
| `body_shell` | BODY | Cube | Cube | 1 | 2415 | CENTER / CENTER / BOTTOM | MEDIUM | Connected carcass mesh remains fused; no arbitrary panel cuts. |
| `underbody` | CHASSIS | Cube.008 | Cube.008 | 1 | 1115 | CENTER / CENTER / BOTTOM | MEDIUM | Source geometry mapped as underbody structural skin; exact vehicle variant specifications are undocumented. |
| `front_bumper` | BODY | Cube.026, Plane.013 | Cube.026, Plane.013 | 3 | 340 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as front lower fascia; exact vehicle variant specifications are undocumented. |
| `rear_bumper` | BODY | Cube.027, Plane.015 | Cube.027, Plane.015 | 2 | 340 | REAR / CENTER / BOTTOM | MEDIUM | Source geometry mapped as rear lower fascia; exact vehicle variant specifications are undocumented. |
| `windshield` | GLASS | Plane.043 | Plane.043 | 1 | 80 | FRONT / CENTER / BOTTOM | HIGH | Source geometry mapped as front windscreen; exact vehicle variant specifications are undocumented. |
| `rear_window` | GLASS | Plane.032 | Plane.032 | 1 | 80 | REAR / CENTER / BOTTOM | HIGH | Source geometry mapped as rear window; exact vehicle variant specifications are undocumented. |
| `engine_block` | ENGINE | Cube.012, Cube.029, Cylinder.023, Cube.009, Cylinder.025, Cube.020, Cube.011, Cube.030 | Cube.012, Cube.029, Cylinder.023, Cube.009, Cylinder.025, Cube.020, Cube.011, Cube.030 | 16 | 1670 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as engine block/head area; exact vehicle variant specifications are undocumented. |
| `engine_auxiliaries` | ENGINE | Cylinder.024, Cube.022, Cube.023, Cube.019, Cube.021, Cube.024, Cube.010, Plane.008 | Cylinder.024, Cube.022, Cube.023, Cube.019, Cube.021, Cube.024, Cube.010, Plane.008 | 14 | 586 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as engine auxiliary components; exact vehicle variant specifications are undocumented. |
| `engine_accessories` | ENGINE | Cylinder.010, Cylinder.012, Cylinder.008, Cylinder.009, Cylinder.011, Cube.015, Plane.006 | Cylinder.010, Cylinder.012, Cylinder.008, Cylinder.009, Cylinder.011, Cube.015, Plane.006 | 7 | 909 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as engine accessory geometry; exact vehicle variant specifications are undocumented. |
| `engine_wiring` | ENGINE | Plane.007, Plane.053, Plane.039, Plane.010 | Plane.007, Plane.053, Plane.039, Plane.010 | 10 | 1544 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as engine wiring geometry; exact vehicle variant specifications are undocumented. |
| `vehicle_tubes_unknown` | UNKNOWN | Plane.005, Plane.009 | Plane.005, Plane.009 | 7 | 1286 | CENTER / CENTER / BOTTOM | UNKNOWN | Six disconnected tube runs lie across a large front-to-rear span. Their geometry is preserved as a group; no engine/exhaust/fuel function is asserted. |
| `front_axle_suspension` | SUSPENSION | Plane.001, Cube.001, Circle, Cube.025, Cube.007, Cube.014, Plane.002, Cylinder.004, Cube.006, Cylinder.005, Plane, Cylinder.007, Cube.013, Cylinder.006 | Plane.001, Cube.001, Circle, Cube.025, Cube.007, Cube.014, Plane.002, Cylinder.004, Cube.006, Cylinder.005, Plane, Cylinder.007, Cube.013, Cylinder.006 | 44 | 3988 | FRONT / CENTER / BOTTOM | MEDIUM | Source geometry mapped as front axle suspension geometry; exact vehicle variant specifications are undocumented. |
| `rear_axle_suspension` | SUSPENSION | Plane.003, Cylinder.013, Cylinder.019, Cylinder.018, Cylinder.020, Cylinder.016, Cylinder.017, Cylinder.014, Cylinder.015 | Plane.003, Cylinder.013, Cylinder.019, Cylinder.018, Cylinder.020, Cylinder.016, Cylinder.017, Cylinder.014, Cylinder.015 | 17 | 3242 | CENTER / CENTER / BOTTOM | MEDIUM | Source geometry mapped as rear axle suspension geometry; exact vehicle variant specifications are undocumented. |
| `chassis_mechanical_assemblies` | CHASSIS | Cylinder.021, Cylinder.022, Cube.016, Cube.018, Plane.004, Cube.017 | Cylinder.021, Cylinder.022, Cube.016, Cube.018, Plane.004, Cube.017 | 14 | 944 | CENTER / CENTER / BOTTOM | MEDIUM | Source geometry mapped as underbody mechanical assemblies; exact vehicle variant specifications are undocumented. |
| `body_seals` | BODY | Plane.031, Plane.042, Cube.069, Cube.074, Plane.041 | Plane.031, Plane.042, Cube.069, Cube.074, Plane.041 | 12 | 884 | CENTER / CENTER / BOTTOM | MEDIUM | Source geometry mapped as body seal and moulding geometry; exact vehicle variant specifications are undocumented. |
| `front_right_door` | BODY | Cube.002 | Cube.002 | 1 | 142 | CENTER / RIGHT / BOTTOM | HIGH | Independent front door leaf in the right front opening; distinct carcass mesh. |
| `rear_right_door` | BODY | Cube.003 | Cube.003 | 1 | 161 | CENTER / RIGHT / BOTTOM | HIGH | Independent rear door leaf in the right rear opening; distinct carcass mesh. |
| `front_left_door` | BODY | Cube.081 | Cube.081 | 1 | 142 | CENTER / LEFT / BOTTOM | HIGH | Independent front door leaf in the left front opening; distinct carcass mesh. |
| `rear_left_door` | BODY | Cube.080 | Cube.080 | 1 | 161 | CENTER / LEFT / BOTTOM | HIGH | Independent rear door leaf in the left rear opening; distinct carcass mesh. |
| `front_right_door_panel` | INTERIOR | Plane.023, Cube.048 | Plane.023, Cube.048 | 2 | 439 | CENTER / RIGHT / BOTTOM | HIGH | Front-right door card and its colocated pull/trim geometry. |
| `rear_right_door_panel` | INTERIOR | Plane.024 | Plane.024 | 1 | 403 | CENTER / RIGHT / BOTTOM | HIGH | Rear-right door card; distinct panel mesh and position. |
| `front_left_door_panel` | INTERIOR | Plane.062, Cube.085 | Plane.062, Cube.085 | 2 | 439 | CENTER / LEFT / BOTTOM | HIGH | Front-left door card and its colocated pull/trim geometry. |
| `rear_left_door_panel` | INTERIOR | Plane.063 | Plane.063 | 1 | 403 | CENTER / LEFT / BOTTOM | HIGH | Rear-left door card; distinct panel mesh and position. |
| `front_left_door_glass` | GLASS | Plane.035 | Plane.035 | 1 | 6 | CENTER / LEFT / BOTTOM | HIGH | Front-left door pane from its separate original glass object. |
| `front_right_door_glass` | GLASS | Plane.033 | Plane.033 | 1 | 6 | CENTER / RIGHT / BOTTOM | HIGH | Front-right door pane from its separate original glass object. |
| `rear_left_door_glass` | GLASS | Plane.034 | Plane.034__rear_door_glass_left | 1 | 4 | CENTER / LEFT / BOTTOM | HIGH | Separated rear-left door pane from the source two-island side-glass mesh. |
| `rear_right_door_glass` | GLASS | Plane.057 | Plane.057__rear_door_glass_right | 1 | 4 | CENTER / RIGHT / BOTTOM | HIGH | Separated rear-right door pane from the source two-island side-glass mesh. |
| `left_quarter_glass` | GLASS | Plane.034 | Plane.034__quarter_glass_left | 1 | 4 | CENTER / LEFT / BOTTOM | HIGH | Fixed left rear quarter pane, separated by its disconnected source island. |
| `right_quarter_glass` | GLASS | Plane.057 | Plane.057__quarter_glass_right | 1 | 4 | CENTER / RIGHT / BOTTOM | HIGH | Fixed right rear quarter pane, separated by its disconnected source island. |
| `hood` | BODY | Cube.005, Plane.055 | Cube.005, Plane.055 | 2 | 874 | FRONT / CENTER / BOTTOM | HIGH | Front bonnet outer panel and colocated inner/support mesh. |
| `trunk_lid` | BODY | Cube.004, Plane.056 | Cube.004, Plane.056 | 2 | 348 | REAR / CENTER / BOTTOM | HIGH | Rear boot lid outer panel and colocated inner/support mesh. |
| `front_right_door_handle` | BODY | Cube.046 | Cube.046 | 1 | 136 | CENTER / RIGHT / BOTTOM | HIGH | Exterior handle geometry positioned on the front-right door. |
| `rear_right_door_handle` | BODY | Cube.047 | Cube.047 | 1 | 136 | CENTER / RIGHT / BOTTOM | HIGH | Exterior handle geometry positioned on the rear-right door. |
| `front_left_door_handle` | BODY | Cube.084 | Cube.084 | 1 | 136 | CENTER / LEFT / BOTTOM | HIGH | Exterior handle geometry positioned on the front-left door. |
| `rear_left_door_handle` | BODY | Cube.087 | Cube.087 | 1 | 136 | CENTER / LEFT / BOTTOM | HIGH | Exterior handle geometry positioned on the rear-left door. |
| `right_side_mirror` | BODY | Cube.050, Cube.051, Plane.065 | Cube.050, Cube.051, Plane.065__right_mirror_detail | 3 | 402 | FRONT / RIGHT / BOTTOM | MEDIUM | Mirror housing/support pair on the right front door corner. |
| `left_side_mirror` | BODY | Cube.082, Cube.083, Plane.054 | Cube.082, Cube.083, Plane.054 | 3 | 402 | FRONT / LEFT / BOTTOM | MEDIUM | Mirror housing/support and separate face detail on the left front door corner. |
| `right_body_moulding` | BODY | Plane.047, Plane.048, Plane.049, Plane.050 | Plane.047, Plane.048, Plane.049, Plane.050 | 4 | 284 | CENTER / RIGHT / BOTTOM | MEDIUM | Right-side repeated body moulding/end details, grouped by source side and placement. |
| `left_body_moulding` | BODY | Plane.058, Plane.059, Plane.060, Plane.061 | Plane.058, Plane.059, Plane.060, Plane.061 | 4 | 284 | CENTER / LEFT / BOTTOM | MEDIUM | Left-side repeated body moulding/end details, grouped by source side and placement. |
| `front_left_headlight` | LIGHTING | Cylinder.033, Plane.011, Cube.058, Plane.037, Plane.038 | Cylinder.033__left, Plane.011__left, Cube.058__left, Plane.037__left, Plane.038__left | 5 | 344 | FRONT / LEFT / BOTTOM | HIGH | Left headlamp lenses, housing details and trim split by disconnected source islands. |
| `front_right_headlight` | LIGHTING | Cylinder.033, Plane.011, Cube.058, Plane.037, Plane.038 | Cylinder.033__right, Plane.011__right, Cube.058__right, Plane.037__right, Plane.038__right | 5 | 344 | FRONT / RIGHT / BOTTOM | HIGH | Right headlamp lenses, housing details and trim split by disconnected source islands. |
| `rear_left_light` | LIGHTING | Plane.036, Plane.014, Cube.057 | Plane.036__left, Plane.014__left, Cube.057__left | 7 | 374 | REAR / LEFT / BOTTOM | HIGH | Left rear-light assembly: lens and colocated disconnected housing/detail islands. |
| `rear_right_light` | LIGHTING | Plane.036, Plane.014, Cube.057 | Plane.036__right, Plane.014__right, Cube.057__right | 7 | 374 | REAR / RIGHT / BOTTOM | HIGH | Right rear-light assembly: lens and colocated disconnected housing/detail islands. |
| `front_left_indicator` | LIGHTING | Plane.045, Plane.070, Plane.069 | Plane.045__left, Plane.070__left, Plane.069__left | 3 | 102 | FRONT / LEFT / BOTTOM | HIGH | Left front indicator/lens and matching outer marker island. |
| `front_right_indicator` | LIGHTING | Plane.045, Plane.070, Plane.069 | Plane.045__right, Plane.070__right, Plane.069__right | 3 | 102 | FRONT / RIGHT / BOTTOM | HIGH | Right front indicator/lens and matching outer marker island. |
| `front_grille` | BODY | Plane.012 | Plane.012 | 17 | 276 | FRONT / CENTER / BOTTOM | HIGH | Front grille/slat mesh at the front fascia; internal slats remain one selectable grille assembly. |
| `front_license_plate` | BODY | Plane.026, Cube.049 | Plane.026, Cube.049 | 3 | 65 | FRONT / CENTER / BOTTOM | MEDIUM | Front plate/plate insert geometry centered at the front fascia. |
| `rear_license_plate` | BODY | Plane.067, Plane.068, Plane.066 | Plane.067, Plane.068, Plane.066 | 12 | 103 | REAR / RIGHT / BOTTOM | MEDIUM | Rear plate panel and its backing/edge details at the rear fascia. |
| `dashboard` | INTERIOR | Plane.020, Cube.036, Cube.054, Plane.029, Plane.021, Plane.022, Cube.061, Cube.044, Plane.027, Plane.030, Plane.016, Cube.042, Cube.043, Cube.045, Plane.028 | Plane.020, Cube.036, Cube.054, Plane.029, Plane.021, Plane.022, Cube.061, Cube.044, Plane.027, Plane.030, Plane.016, Cube.042, Cube.043, Cube.045, Plane.028 | 42 | 2407 | FRONT / CENTER / BOTTOM | MEDIUM | Instrument fascia/dashboard surfaces and colocated dash trim, grouped from the dashboard source collections. |
| `steering_wheel` | INTERIOR | Cylinder.027, Cube.038, Cube.037 | Cylinder.027, Cube.038, Cube.037 | 3 | 1004 | FRONT / LEFT / BOTTOM | MEDIUM | Steering-wheel ring and attached hub/spoke meshes at the driver control position. |
| `center_controls` | INTERIOR | Cube.039, Cube.079, Cube.060, Cube.059, Cube.078, Cylinder.034, Cylinder.041 | Cube.039, Cube.079, Cube.060, Cube.059, Cube.078, Cylinder.034, Cylinder.041 | 20 | 810 | FRONT / CENTER / BOTTOM | MEDIUM | Small grouped center-dashboard/control geometry; exact switch functions are not asserted. |
| `sun_visors` | INTERIOR | Cube.075, Plane.051 | Cube.075, Plane.051 | 4 | 280 | FRONT / CENTER / BOTTOM | MEDIUM | Two source-disconnected overhead visor panels with matching small attachments. |
| `headliner_trim` | INTERIOR | Cube.076 | Cube.076 | 4 | 640 | CENTER / CENTER / BOTTOM | MEDIUM | Four disconnected overhead cabin trim/rail pieces; retained as one cabin trim assembly. |
| `cabin_interior_shell` | INTERIOR | Plane.019 | Plane.019 | 1 | 862 | CENTER / CENTER / BOTTOM | MEDIUM | Continuous connected interior shell spanning much of the cabin; no supported panel seams allow safe further separation. |
| `rear_cabin_trim` | INTERIOR | Cylinder.038, Cube.063, Cube.068, Plane.040, Plane.052, Cube.064, Cylinder.036 | Cylinder.038, Cube.063, Cube.068, Plane.040, Plane.052, Cube.064, Cylinder.036 | 19 | 1068 | CENTER / CENTER / BOTTOM | MEDIUM | Rear and upper-cabin interior trim meshes grouped by their cabin collection and placement. |
| `interior_floor_trim` | INTERIOR | Cube.035 | Cube.035 | 4 | 264 | CENTER / CENTER / BOTTOM | MEDIUM | Low, thin cabin floor trim panel in the source salon collection. |
| `lower_dashboard_trim` | INTERIOR | Cube.041, Cube.040 | Cube.041, Cube.040 | 6 | 228 | FRONT / LEFT / BOTTOM | UNKNOWN | Lower front-cabin/dash trim pair by measured position; exact individual control function is unconfirmed. |
| `front_left_seat` | INTERIOR | Cube.032, Cube.031 | Cube.032__left, Cube.031__left | 2 | 430 | CENTER / LEFT / BOTTOM | HIGH | Left front seat cushion and backrest, paired by their separated same-side islands. |
| `front_right_seat` | INTERIOR | Cube.032, Cube.031 | Cube.032__right, Cube.031__right | 2 | 430 | CENTER / RIGHT / BOTTOM | HIGH | Right front seat cushion and backrest, paired by their separated same-side islands. |
| `rear_seat_base` | INTERIOR | Cube.033 | Cube.033 | 1 | 190 | CENTER / CENTER / BOTTOM | HIGH | Continuous rear bench cushion source mesh. |
| `rear_seat_back` | INTERIOR | Cube.034 | Cube.034 | 1 | 272 | CENTER / CENTER / BOTTOM | HIGH | Continuous rear bench backrest source mesh. |
| `front_headrests` | INTERIOR | Cube.055 | Cube.055 | 2 | 568 | CENTER / CENTER / BOTTOM | HIGH | Two separate front-seat headrest cushions at the same longitudinal position as the front seats. |
| `front_seat_supports_unknown` | INTERIOR | Cylinder.026, Cube.066 | Cylinder.026, Cube.066 | 6 | 576 | CENTER / CENTER / BOTTOM | UNKNOWN | Low cabin crossbar/bracket geometry positioned beneath the front-seat region; precise hardware role is unconfirmed. |
| `rear_seat_supports_unknown` | INTERIOR | Cube.067 | Cube.067 | 4 | 160 | CENTER / CENTER / BOTTOM | UNKNOWN | Disconnected support-like pieces below the rear bench; precise role is unconfirmed. |
| `handbrake` | INTERIOR | Cube.065, Cylinder.037 | Cube.065, Cylinder.037 | 2 | 128 | CENTER / CENTER / BOTTOM | MEDIUM | Long lever and base geometry on the center floor, consistent with a handbrake control by shape and position. |
| `rear_package_shelf` | INTERIOR | Cube.077 | Cube.077 | 4 | 512 | CENTER / CENTER / BOTTOM | MEDIUM | Broad rear-cabin parcel-shelf geometry behind the rear bench, retained as one four-island trim assembly. |
| `rear_left_quarter_trim` | INTERIOR | Plane.044 | Plane.044__left | 1 | 148 | REAR / LEFT / BOTTOM | MEDIUM | Left rear-cabin quarter trim island by source lateral position. |
| `rear_right_quarter_trim` | INTERIOR | Plane.044 | Plane.044__right | 1 | 148 | REAR / RIGHT / BOTTOM | MEDIUM | Right rear-cabin quarter trim island by source lateral position. |
| `interior_rear_view_mirror` | INTERIOR | Cube.052, Cube.053, Plane.065 | Cube.052, Cube.053, Plane.065__interior_mirror_detail | 3 | 278 | FRONT / CENTER / BOTTOM | MEDIUM | Small centered mirror and stem geometry at the upper windshield/cabin center. |
| `rear_cabin_roof_trim` | INTERIOR | Cube.056, Cylinder.028 | Cube.056, Cylinder.028 | 8 | 296 | CENTER / CENTER / BOTTOM | UNKNOWN | Thin disconnected upper-cabin trim pieces grouped by their shared position and source collection. |
| `left_dashboard_side_trim` | INTERIOR | Cube.070, Cube.072 | Cube.070, Cube.072 | 2 | 126 | FRONT / CENTER / BOTTOM | MEDIUM | Small trim pair at the left outer dashboard end by measured side position. |
| `right_dashboard_side_trim` | INTERIOR | Cube.071, Cube.073 | Cube.071, Cube.073 | 2 | 126 | FRONT / RIGHT / BOTTOM | MEDIUM | Small trim pair at the right outer dashboard end by measured side position. |
| `trunk_cavity_panel` | BODY | Plane.025 | Plane.025 | 1 | 286 | REAR / CENTER / BOTTOM | MEDIUM | Large rear luggage-cavity panel inside the trunk region; exact floor/liner role is not provable. |
| `front_right_door_details_unknown` | UNKNOWN | Cylinder.035, Cube.062 | Cylinder.035, Cube.062 | 4 | 218 | FRONT / RIGHT / BOTTOM | UNKNOWN | Small grouped detail geometry at the front right door; function is not confidently identifiable. |
| `front_left_door_details_unknown` | UNKNOWN | Cylinder.031, Cube.086 | Cylinder.031, Cube.086 | 4 | 218 | FRONT / LEFT / BOTTOM | UNKNOWN | Small grouped detail geometry at the front left door; function is not confidently identifiable. |
| `rear_right_door_details_unknown` | UNKNOWN | Cylinder.003, Cube.088 | Cylinder.003, Cube.088 | 4 | 218 | CENTER / RIGHT / BOTTOM | UNKNOWN | Small grouped detail geometry at the rear right door; function is not confidently identifiable. |
| `rear_left_door_details_unknown` | UNKNOWN | Cylinder.032, Cube.089 | Cylinder.032, Cube.089 | 4 | 218 | CENTER / LEFT / BOTTOM | UNKNOWN | Small grouped detail geometry at the rear left door; function is not confidently identifiable. |
| `left_b_pillar_detail_unknown` | UNKNOWN | Cylinder.002 | Cylinder.002 | 1 | 22 | CENTER / LEFT / BOTTOM | UNKNOWN | Tiny exterior detail at the left-side B-pillar region; exact function is unknown. |
| `right_b_pillar_detail_unknown` | UNKNOWN | Cylinder.039 | Cylinder.039 | 1 | 22 | CENTER / RIGHT / BOTTOM | UNKNOWN | Tiny exterior detail at the right-side B-pillar region; exact function is unknown. |
| `rear_left_body_detail_unknown` | UNKNOWN | Cube.028 | Cube.028 | 1 | 6 | REAR / RIGHT / BOTTOM | UNKNOWN | Small isolated body-side detail at the left rear quarter; exact function is unknown. |
| `front_right_wheel_hardware` | WHEELS | Cylinder.029, Cylinder.030 | Cylinder.029__right, Cylinder.030__right | 5 | 158 | FRONT / RIGHT / BOTTOM | UNKNOWN | Wheel-center/hub-side details grouped for this corner; the source does not prove a brake disc, caliper or drum. |
| `front_left_wheel_hardware` | WHEELS | Cylinder.029, Cylinder.030 | Cylinder.029__left, Cylinder.030__left | 5 | 158 | FRONT / LEFT / BOTTOM | UNKNOWN | Wheel-center/hub-side details grouped for this corner; the source does not prove a brake disc, caliper or drum. |
| `rear_right_wheel_hardware` | WHEELS | Cylinder.044, Cylinder.045 | Cylinder.044__right, Cylinder.045__right | 5 | 158 | REAR / RIGHT / BOTTOM | UNKNOWN | Wheel-center/hub-side details grouped for this corner; the source does not prove a brake disc, caliper or drum. |
| `rear_left_wheel_hardware` | WHEELS | Cylinder.044, Cylinder.045 | Cylinder.044__left, Cylinder.045__left | 5 | 158 | REAR / LEFT / BOTTOM | UNKNOWN | Wheel-center/hub-side details grouped for this corner; the source does not prove a brake disc, caliper or drum. |
| `front_fascia_details` | BODY | Plane.046 | Plane.046__front_fascia_fasteners | 8 | 48 | FRONT / CENTER / BOTTOM | UNKNOWN | Small distributed fastening details at front lamp/fascia positions; kept non-decomposed as a decorative fastener set. |
| `rear_fascia_details` | BODY | Plane.046 | Plane.046__rear_fascia_fasteners | 10 | 60 | REAR / CENTER / BOTTOM | UNKNOWN | Small distributed fastening details at rear-light/fascia positions; kept non-decomposed as a decorative fastener set. |
| `dashboard_ornament_unknown` | UNKNOWN | Quacker1, Cylinder.040 | Quacker1, Cylinder.040 | 4 | 506 | FRONT / CENTER / BOTTOM | UNKNOWN | Small dashboard-positioned ornament and base; mesh groups name body parts like head/wings, but the intended object/function is not verified. |

Category totals:

- **BODY:** 24
- **GLASS:** 8
- **LIGHTING:** 6
- **WHEELS:** 12
- **BRAKES:** 0
- **ENGINE:** 4
- **DRIVETRAIN:** 0
- **SUSPENSION:** 2
- **INTERIOR:** 28
- **CHASSIS:** 2
- **EXHAUST:** 0
- **UNKNOWN:** 9

The mapping uses physical source evidence. Doors/glass/lights and cabin details are split only where the source has distinct objects or reliable disconnected geometry. Shared material alone was never used as a component boundary. New notable details include four independent door leaves and door panels, four door windows plus left/right quarter windows, individual front lamps and rear lamps, separate hood/trunk, per-corner wheel internals/hardware, separate front seats and rear seat base/back, dashboard/controls/handbrake, and per-side exterior mirrors/mouldings. Unknown tube/detail groups remain UNKNOWN where source geometry does not prove a technical name.

## Deep analysis passes and suspicious-mesh review

1. **Source inventory:** entire original Blender scene examined, including cameras, lights, reference empties, collections, hidden flags, hierarchy, linked data, modifiers, slots, vertex groups, and geometry.
2. **Island pass:** all 208 mesh objects examined; 464 connected islands found. Disconnected parts were safely separated and assigned from physical/spatial evidence. No arbitrary Boolean cuts were used.
3. **Second pass:** largest remaining meshes were checked in triangle-count order and against bbox volume/dimensions. The large **Cube** body shell contains one connected island; the largest tire/rim/cylinder objects have meaningful bilateral/corner islands that were separated or mapped to the correct wheel. **Plane.005** contains six disconnected, body-length tube runs and remains **vehicle_tubes_unknown** rather than a guessed exhaust/engine label.
4. **Third suspicious pass:** every candidate over 5% of all triangles, with vehicle-scale bounds, multiple islands, or apparent cross-side/front-rear extent was rechecked. The **Cube** body shell has 2415 triangles (5.27%) but is a single continuous shell island. **Cube.008** underbody and **Plane.019** cabin shell were inspected by bounds and topology; no safe extra physical boundaries were found within their continuous surfaces.
5. **Suspicious flags:** final components are joined by source topology groups and verified source positions. All final runtime meshes are assigned once; duplicate assignments = 0, unassigned meaningful geometry = 0, invalid component IDs = 0.

## FUSED / NOT SAFELY SEPARABLE

- **Main painted body shell (Cube, 2,415 triangles, one connected island):** hood and trunk lids and all four doors are separate source geometry and were mapped independently. The remaining continuous roof, quarter panels, fender/arch surfaces, and sill transitions stay fused; no stable topology boundary separates them without cutting a continuous surface.
- **Underbody (Cube.008, 1,115 triangles, one connected island):** the broad continuous floor/underbody remains one component; there are no independent subframe boundaries within this mesh.
- **Cabin/interior shell (Plane.019, 862 triangles, see inventory island record):** continuous shell surfaces remain grouped. Seats, dashboard, controls, trims and other separately represented cabin geometry are mapped independently.
- **Axle/suspension assemblies:** independently disconnected bars/struts are retained as source-supported assemblies; the remaining crossmember shapes have no reliable semantic separation. No separate brake disc/caliper/drum is asserted; **BRAKES = 0** because the original geometry does not establish a distinct brake component.
- **Distributed tubes:** six tube runs span multiple positions; kept as unknown tube geometry, not labelled exhaust or engine hoses without proof.

## GLB and runtime optimization

| Metric | Old | New |
|---|---:|---:|
| GLB size | 49,651,408 bytes | 6,865,804 bytes |
| Runtime triangles | 45,784 | 45,784 |
| Mesh draws/primitives | 210 | 232 |
| Materials | 34 | 34 |
| Embedded images | 81 | 81 |
| Image payload bytes | 48,973,843 | 6,157,719 |

The old GLB was large primarily because it embedded 81 lossless PNG texture images (48,973,843 bytes); geometry was only 45,784 triangles and duplicate-face analysis found no duplicated triangles/vertices across meshes. The new preparation retained the same 45,784 triangles and all 34 materials and 81 images. It re-encoded 74 opaque images as JPEG quality 88 and kept 7 alpha-bearing PNGs; texture dimensions remain at or below 1024. The mesh optimizer's 10k-triangle threshold did not run on any mesh (largest source mesh: 2,415 triangles), so no detail was removed by decimation. Savings: 42,785,604 bytes / 42.79 MB, chiefly texture re-encoding. Semantic boundaries remain separate.

Source duplicate audit: 45,784 triangles, 0 duplicate vertex entries at tolerance 1e-5, 0 repeated faces within objects, 0 duplicated triangle faces across objects. Empty duplicate objects: Plane.017 and Plane.018.

## Runtime validation

- GLB magic/version/header valid: **PASS**; scene 1; nodes 331; 232 mesh resources/primitives; 45,784 runtime triangles; Draco compression required; 34 materials; 81 embedded images.
- Semantic group nodes: 95; all groups exist and have prepared child mesh nodes. Runtime/browser model audit: 232 draws, 95 component registrations; each component gets a finite combined bounding box and focus succeeds.
- EXPLODE 0% equals assembled transform baseline; observed round trip 0 -> 25 -> 50 -> 75 -> 100 -> 75 -> 50 -> 25 -> 0 has final and repeated-state transform drift **0**. Wheel assembly offset is shared by tire/rim at 25 to 50%, inner part offsets begin after 50%.
- React routes verified: /cars/13 and /cars/13/components/hood; Django Car/CarPart sync for VAZ only, 95 unique CarParts; Product/ProductCompatibility creations: 0.
- Browser artifacts: [viewer QA report](qa/vaz2105-deep/browser/report.json), [React/Django route QA](qa/vaz2105-deep/browser/react-report.json), assembled/exploded/view images are in the qa/vaz2105-deep/browser directory.

## QA status

- Original Blender source remained read-only; full-scene inventory and hidden-object review completed.
- GLB structure, mesh/geometry counts, materials, texture embedding, Draco extension and all 95 semantic group nodes: **PASS**.
- Mapping invariants: duplicate assignments 0, missing interactive source meshes 0, extraneous source meshes 0, all runtime mesh draws assigned once.
- Viewer model load, materials, 95/95 focus bounds, OrbitControls, Raycaster hover and selection, and mobile tap: **PASS**; browser exceptions/network errors: 0.
- Explode forward/reverse sequence: **PASS**, assembled pose error 0, final and repeated-step drift 0.
- Visual QA screenshots recorded for front, rear, left, right, top-ish, front/rear three-quarter; exploded 25/50/75/100; engine bay, interior and underbody.
- React /cars/13, component index (95 entries), selection and /cars/13/components/hood; Django API at local port 8001 returns 95 unique VAZ CarParts: **PASS**. Product and ProductCompatibility creations: 0.
- React test suite: **11/11 passed**. Django tests: **2/2 passed**, system check clean. Production build: **PASS**. Build emits the existing React Router "use client" notice and a large chunk warning (the Three.js scene bundle is 705.70 kB); the VAZ GLB is 6.87 MB.

Structured browser evidence is in [viewer QA report](qa/vaz2105-deep/browser/report.json) and [React/Django route QA](qa/vaz2105-deep/browser/react-report.json). Screenshots are stored alongside them.
