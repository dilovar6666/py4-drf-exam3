# Ford GT40 Deep Decomposition Report

## Scope and recovery point

This report covers only the Ford GT40 source at `source_models/car1/GT40.blend`. The original was opened by Blender in read-only analysis/preparation operations and was never saved. Its byte size remains 33,442,852 bytes; the inventory recorded 33,442,852 bytes and source modification time 2026-09-27T05:52:42.313Z. The prior integrated mapping had 34 semantic components and an approximately 4.29 MB GLB. That mapping was used only as the old-result comparison, not as a decomposition constraint.

## Source inventory

| Measure | Source result |
|---|---:|
| Blender version | 5.2.2 LTS |
| Scene / all datablock objects | Scene / 172 |
| Scene objects | 172 |
| Mesh objects | 167 |
| Evaluated source triangles | 846,078 |
| Materials | 86 |
| Collections | 7 |
| Hidden viewport objects | 0 |
| Hidden render objects | 0 |
| Objects inside collection-disabled viewport/render collections | 10 |
| Objects not visible in active view layer | 10 |
| Vertex groups | 0 |
| Modifiers | 228 |
| Linked objects/data | 0 |
| True evaluated instances | 0 |
| Objects with a parent / objects with children | 0 / 0 |
| Shared mesh datablocks | 2 |
| Objects with more than one material slot | 49 |

Modifier types: ARRAY 4; EDGE_SPLIT 125; MIRROR 70; SUBSURF 29.

Collection tree:

- Collection 1: 162 direct object(s), hidden viewport=false, hidden render=false
- Collection 2: 6 direct object(s), hidden viewport=true, hidden render=true
- Collection 3: 4 direct object(s), hidden viewport=true, hidden render=true

All Blender collection datablocks (including the four group collections not linked under the active scene root):

| Collection | Users | Objects | Viewport hidden | Render hidden |
|---|---:|---:|---|---|
| Collection 1 | 1 | 162 | false | false |
| Collection 2 | 1 | 6 | true | true |
| Collection 3 | 1 | 4 | true | true |
| Group | 1 | 8 | false | false |
| Group.001 | 1 | 9 | false | false |
| Group.002 | 1 | 7 | false | false |
| Group.003 | 1 | 3 | false | false |

Largest source meshes by triangles:

| Object | Triangles | Connected islands | Dimensions (source units) | Center |
|---|---:|---:|---|---|
| GT40_Body | 181,232 | 184 | 9.868 × 4.204 × 2.110 | -0.025, 0.014, 0.371 |
| GT40_DriverSeat2 | 31,872 | 5 | 0.459 × 1.137 × 1.044 | -0.904, 0.811, 0.253 |
| GT40_PassengerSeat2 | 31,872 | 5 | 0.459 × 1.137 × 1.044 | -0.904, -0.771, 0.253 |
| GT40_FrontGrill | 30,912 | 1 | 0.234 × 2.112 × 0.494 | 4.547, 0.014, -0.377 |
| GT40_RearGrill | 26,604 | 2 | 0.273 × 2.733 × 0.445 | -4.593, 0.014, 0.251 |
| GT40_RearExhaust | 26,496 | 8 | 0.709 × 0.588 × 0.262 | -4.551, 0.014, 0.216 |
| GT40_DriverSeat1 | 25,136 | 5 | 1.293 × 1.162 × 0.447 | -0.184, 0.811, -0.254 |
| GT40_PassengerSeat1 | 25,136 | 5 | 1.293 × 1.162 × 0.447 | -0.184, -0.771, -0.254 |
| GT40_WheelBL | 21,404 | 6455 | 2.344 × 0.834 × 2.344 | -3.141, 1.477, -0.178 |
| GT40_WheelBR | 21,404 | 6455 | 2.344 × 0.834 × 2.344 | -3.141, -1.451, -0.178 |
| GT40_WheelFL | 21,404 | 6455 | 2.183 × 0.897 × 2.182 | 2.465, 1.488, -0.178 |
| GT40_WheelFR | 21,404 | 6455 | 2.183 × 0.911 × 2.182 | 2.465, -1.466, -0.178 |
| GT40_WheelTrimF | 21,056 | 24 | 1.957 × 4.015 × 1.253 | 2.517, 0.014, 0.091 |
| GT40_WheelTrimB | 20,160 | 24 | 1.961 × 3.994 × 1.087 | -3.160, 0.014, 0.244 |

Largest source objects by bounding-box volume:

- `GT40_Body`: 9.868 × 4.204 × 2.110 units; 181,232 triangles; 184 connected islands.
- `Studio_Ground1`: 3.353 × 5.323 × 1.036 units; 10 triangles; 1 connected islands.
- `GT40_WheelTrimF`: 1.957 × 4.015 × 1.253 units; 21,056 triangles; 24 connected islands.
- `GT40_WheelTrimScrewsF`: 1.910 × 3.937 × 1.184 units; 2,496 triangles; 96 connected islands.
- `GT40_WheelTrimB`: 1.961 × 3.994 × 1.087 units; 20,160 triangles; 24 connected islands.
- `PaintPallet1`: 2.000 × 2.000 × 2.000 units; 12 triangles; 1 connected islands.
- `PaintPallet2`: 2.000 × 2.000 × 2.000 units; 12 triangles; 1 connected islands.
- `PaintPallet3`: 2.000 × 2.000 × 2.000 units; 12 triangles; 1 connected islands.
- `PaintPallet4`: 2.000 × 2.000 × 2.000 units; 12 triangles; 1 connected islands.
- `GT40_WheelTrimScrewsB`: 1.876 × 3.949 × 0.832 units; 2,288 triangles; 88 connected islands.

Generic/suspiciously named source objects recorded by the analyzer: GT40_Body, GT40_BodyTrim1, GT40_BodyTrim2, GT40_DoorInteriorL, GT40_DoorInteriorR, GT40_DoorInteriorScrewsL, GT40_DoorInteriorScrewsR, GT40_EngineBlock1, GT40_EngineBlockCaps, GT40_EngineCaps, GT40_EnginePipes1, GT40_EnginePipes2, GT40_EnginePipes3, GT40_EnginePipes4, GT40_EngineSprings1, GT40_EngineSpringsFrame, GT40_EngineSpringsSupports, GT40_EngineSuperChargers, GT40_EngineTrim1, GT40_EngineTrim2, GT40_EngineTrim3, GT40_EngineVent, GT40_EngineWires, GT40_InteriorBar1, GT40_InteriorBar2, GT40_InteriorBar3, GT40_InteriorBar4, GT40_InteriorDoorHandleL, GT40_InteriorDoorHandleR, GT40_InteriorKnob1, GT40_InteriorKnob2, GT40_InteriorKnob3, GT40_InteriorKnob4, GT40_InteriorKnob5, GT40_InteriorKnob6, GT40_InteriorKnob7, GT40_InteriorLight1, GT40_InteriorLight2, GT40_InteriorLight3, GT40_InteriorLight4, GT40_InteriorLight5, GT40_InteriorLight6, GT40_InteriorTube1, GT40_InteriorTube2, GT40_InteriorTube3, GT40_InteriorTube4, GT40_InteriorVent1, GT40_InteriorVent2. Two source objects share mesh datablocks and no linked objects/data were found. Ten objects were disabled through two hidden collections: four paint palettes and six studio objects (four lights, camera and ground); they were inspected and the nonvehicle palette/studio geometry was excluded from the runtime. No hidden vehicle mesh was found. The full per-object inventory (names, data blocks, collections, hierarchy, visibility, modifiers, material slots, vertex groups, counts, bounds, positions, dimensions, materials and per-island details) is in [source-inventory.json](qa/gt40-deep/source-inventory.json).

## Geometry-island analysis and second pass

GT40_Body evaluates to 181,232 triangles and 184 disconnected islands. Explicit reviewed face-island selections separated the two door skins, two front hood islands and one engine-cover island; exact coincident duplicate faces within the two door subsets were removed (2,071 left, 1,953 right). A cross-check against the remaining body found zero identical face/material/vertex-set overlaps between the selected panels and shell, so the split does not rely on hiding a duplicate shell face.

Material boundaries separate tire surfaces from rim surfaces in each of the four wheel meshes. Independent source-position islands also support four wheel-arch trim components. Rear radiator islands and engine-wire islands were split by their actual positive/negative lateral centers; exhaust and rear grille geometry were divided using their disconnected left/right islands. Seats use distinct source meshes for the backrest and base/support region.

Second pass ranked remaining meshes by triangle count, then bounding-box volume and dimensions, and rechecked the largest/generic candidates: the connected body shell, both 31,872-triangle seat-back source meshes, front/rear grilles, exhaust, all four 21,404-triangle wheel meshes, wheel-arch meshes, both 19,856-triangle piston-bank meshes, engine block and engine wiring. This pass yielded the bilateral radiator, exhaust, rear grille and wire components plus the seat back/base split. It did not produce Boolean cuts or treat material slots or every tiny island as semantic parts.

## Old result and new result

| Result | Semantic components | Runtime GLB |
|---|---:|---:|
| Previous GT40 result | 34 | approximately 4.29 MB |
| Deep result | 63 | 4.55 MiB (4,772,164 bytes) |
| Net change | +29 | source model regenerated |

Verified sources of finer semantic boundaries:

- Four individual tire/rim pairs replace four undifferentiated wheel groups.
- Four body-sourced door/hood/engine-cover subsets and four isolated wheel-arch surfaces are independently mapped.
- The engine is represented by block, intake, valvetrain, two piston banks, two wire bundles, pipework and mounting hardware; the left/right radiator and exhaust geometry is separate.
- Driver/passenger seat backs and bases are separate; rear grille and front/rear lighting are grouped by their real side/assembly geometry.

Category counts: **BODY 16; GLASS 4; LIGHTING 7; WHEELS/BRAKES 8/0; ENGINE 13; DRIVETRAIN 0; SUSPENSION 0; INTERIOR 14; CHASSIS 0; UNKNOWN 1**. Confidence counts: HIGH 34, UNKNOWN 4, MEDIUM 25.

## Semantic component inventory

The table uses actual prepared meshes after evaluated modifiers and conservative decimation. Island count is measured on each final prepared mesh; reported centers are transformed back to source-scene coordinates (front is positive X, left is positive Y, top is positive Z). When several meshes form one semantic assembly, all names are listed.

| Component ID | Category | Source object(s) | Runtime mesh(es) | Islands | Triangles | Position | Confidence | Classification reason |
|---|---|---|---|---:|---:|---|---|---|
| body_shell | BODY | GT40_Body | GT40_Body | 173 | 91,812 | CENTER (0.000, 0.000, 0.056) | HIGH | Remaining connected body surfaces and minor unidentified exterior hardware; no arbitrary cutting. |
| windshield | GLASS | GT40_Windshield | GT40_Windshield | 3 | 2,752 | FRONT/TOP (0.955, 0.014, 1.073) | HIGH | Windshield: 1 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| side_window_left | GLASS | GT40_WindowL | GT40_WindowL | 16 | 3,392 | LEFT/TOP (-0.292, 1.466, 1.085) | HIGH | Left side glazing: 1 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| side_window_right | GLASS | GT40_WindowR | GT40_WindowR | 16 | 3,392 | RIGHT/TOP (-0.292, -1.437, 1.085) | HIGH | Right side glazing: 1 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| rear_window | GLASS | GT40_BackWindow1<br>GT40_BackWindow2 | GT40_BackWindow1<br>GT40_BackWindow2 | 9 | 4,228 | REAR (-0.920, -0.000, 0.330) | HIGH | Rear glazing: 2 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| wiper | BODY | GT40_Wiper1 | GT40_Wiper1 | 6 | 1,676 | FRONT/TOP (1.702, 0.129, 0.825) | HIGH | Windshield wiper: 1 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| door_trim_left | INTERIOR | GT40_InteriorDoorHandleL<br>GT40_DoorInteriorScrewsL<br>GT40_DoorInteriorL | GT40_InteriorDoorHandleL<br>GT40_DoorInteriorScrewsL<br>GT40_DoorInteriorL | 53 | 3,148 | LEFT (-0.058, 0.699, 0.060) | HIGH | Left interior door trim: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| door_trim_right | INTERIOR | GT40_InteriorDoorHandleR<br>GT40_DoorInteriorScrewsR<br>GT40_DoorInteriorR | GT40_InteriorDoorHandleR<br>GT40_DoorInteriorScrewsR<br>GT40_DoorInteriorR | 53 | 3,148 | RIGHT (-0.058, -0.699, 0.060) | HIGH | Right interior door trim: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| steering_wheel | INTERIOR | GT40_SteeringWheel1<br>GT40_SteeringWheelScrews<br>GT40_SteeringWheel2 | GT40_SteeringWheel1<br>GT40_SteeringWheelScrews<br>GT40_SteeringWheel2 | 118 | 11,452 | FRONT/LEFT (1.092, 0.797, 0.397) | HIGH | Steering wheel and column: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| pedals | INTERIOR | GT40_Pedal1<br>GT40_Pedal2<br>GT40_Pedal3<br>GT40_Pedal1Connector<br>GT40_Pedal2Connector<br>GT40_Pedal3Connector | GT40_Pedal1<br>GT40_Pedal2<br>GT40_Pedal3<br>GT40_Pedal1Connector<br>GT40_Pedal2Connector<br>GT40_Pedal3Connector | 367 | 3,072 | FRONT/LEFT/BOTTOM (1.339, 0.706, -0.240) | HIGH | Pedal assembly: 6 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| gear_selector | INTERIOR | GT40_GearShifter<br>GT40_GearShiftCover<br>GT40_GearShiftSign | GT40_GearShifter<br>GT40_GearShiftCover<br>GT40_GearShiftSign | 9 | 826 | BOTTOM (0.369, -0.000, -0.108) | HIGH | Gear selector and surround: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| handbrake | INTERIOR | GT40_Handbrake<br>GT40_HandBrakeCover | GT40_Handbrake<br>GT40_HandBrakeCover | 23 | 888 | BOTTOM (0.015, -0.000, -0.129) | HIGH | Handbrake and cover: 2 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| instrument_cluster | INTERIOR | GT40_Instrument1<br>GT40_Instrument2<br>GT40_Instrument3<br>GT40_Instrument4<br>GT40_Instrument5<br>GT40_RevCounter2<br>GT40_Speedometer<br>GT40_RevCounter1<br>GT40_InteriorLight1<br>GT40_InteriorLight2<br>GT40_InteriorLight3<br>GT40_InteriorLight4<br>GT40_InteriorLight5<br>GT40_InteriorLight6<br>GT40_Instrument6<br>GT40_Instrument7<br>GT40_Instrument8 | GT40_Instrument1<br>GT40_Instrument2<br>GT40_Instrument3<br>GT40_Instrument4<br>GT40_Instrument5<br>GT40_RevCounter2<br>GT40_Speedometer<br>GT40_RevCounter1<br>GT40_InteriorLight1<br>GT40_InteriorLight2<br>GT40_InteriorLight3<br>GT40_InteriorLight4<br>GT40_InteriorLight5<br>GT40_InteriorLight6<br>GT40_Instrument6<br>GT40_Instrument7<br>GT40_Instrument8 | 159 | 20,522 | FRONT (0.875, -0.179, 0.386) | HIGH | Instruments and indicators: 17 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| interior_controls | INTERIOR | GT40_InteriorKnob1<br>GT40_InteriorKnob2<br>GT40_InteriorKnob3<br>GT40_InteriorKnob4<br>GT40_InteriorKnob5<br>GT40_InteriorKnob6<br>GT40_InteriorKnob7 | GT40_InteriorKnob1<br>GT40_InteriorKnob2<br>GT40_InteriorKnob3<br>GT40_InteriorKnob4<br>GT40_InteriorKnob5<br>GT40_InteriorKnob6<br>GT40_InteriorKnob7 | 35 | 4,004 | CENTER (0.515, 0.095, 0.133) | HIGH | Interior knobs: 7 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| interior_ducts | INTERIOR | GT40_InteriorTube1<br>GT40_InteriorTube2<br>GT40_InteriorTube3<br>GT40_InteriorTube4<br>GT40_InteriorVent1<br>GT40_InteriorVent2 | GT40_InteriorTube1<br>GT40_InteriorTube2<br>GT40_InteriorTube3<br>GT40_InteriorTube4<br>GT40_InteriorVent1<br>GT40_InteriorVent2 | 1214 | 75,608 | CENTER (0.595, 0.000, 0.050) | HIGH | Interior ventilation ducts: 6 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| interior_bracing | INTERIOR | GT40_DoorPanelScrews<br>GT40_DoorPanel<br>GT40_DriverFootBar<br>GT40_InteriorBar1<br>GT40_InteriorBar2<br>GT40_InteriorBar3<br>GT40_InteriorBar4<br>GT40_PassengerFootBar | GT40_DoorPanelScrews<br>GT40_DoorPanel<br>GT40_DriverFootBar<br>GT40_InteriorBar1<br>GT40_InteriorBar2<br>GT40_InteriorBar3<br>GT40_InteriorBar4<br>GT40_PassengerFootBar | 128 | 6,856 | BOTTOM (0.335, -0.000, -0.235) | HIGH | Interior bracing and foot bars: 8 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| indicators | LIGHTING | GT40_TurnSignalSocket<br>GT40_TurnSignalGlass<br>GT40_TurnSignalLights | GT40_TurnSignalSocket<br>GT40_TurnSignalGlass<br>GT40_TurnSignalLights | 28 | 1,656 | FRONT/BOTTOM (4.313, 0.014, -0.446) | HIGH | Front indicators: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| front_grille | BODY | GT40_FrontGrill<br>GT40_FrontGrillSupport<br>GT40_FrontGrillBar | GT40_FrontGrill<br>GT40_FrontGrillSupport<br>GT40_FrontGrillBar | 28 | 22,842 | FRONT/BOTTOM (2.039, 0.000, -0.283) | HIGH | Front grille and supports: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| underbody | BODY | GT40_UndersideBoxScrews<br>GT40_UndersideBox<br>GT40_Underside | GT40_UndersideBoxScrews<br>GT40_UndersideBox<br>GT40_Underside | 138 | 3,878 | BOTTOM (-0.251, 0.014, -0.409) | HIGH | Underbody and rear box: 3 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| rear_bracing | BODY | GT40_RearTruss<br>GT40_RearTrussSupport | GT40_RearTruss<br>GT40_RearTrussSupport | 64 | 604 | REAR/BOTTOM (-4.314, 0.014, -0.309) | HIGH | Rear truss and supports: 2 original mesh object(s), grouped from this vehicle's source geometry. No mechanical specifications or product compatibility are inferred. |
| rear_mechanical_assembly | UNKNOWN | GT40_WinchPipes<br>GT40_WinchMotor<br>GT40_WinchSupport2<br>GT40_RearWinchTrim<br>GT40_RearWinch<br>GT40_WinchSupport | GT40_WinchPipes<br>GT40_WinchMotor<br>GT40_WinchSupport2<br>GT40_RearWinchTrim<br>GT40_RearWinch<br>GT40_WinchSupport | 49 | 3,172 | REAR/BOTTOM (-4.233, 0.013, -0.331) | UNKNOWN | Source-labelled rear winch assembly, including motor and supports. The vehicle subsystem role is not confirmed by geometry, so it remains UNKNOWN. |
| exterior_hardware | BODY | GT40_RearTowHooks<br>GT40_TowHooks1<br>GT40_RearWindowScrews<br>GT40_WheelTrimScrewsF<br>GT40_WheelTrimScrewsB<br>GT40_WheelTrimB<br>GT40_WheelTrimF<br>GT40_DoorHatchScrews<br>GT40_IntakeScrews1<br>GT40_IntakeScrews2<br>GT40_DoorHatch1<br>GT40_DoorScrewsL<br>GT40_DoorScrewsR<br>GT40_RoofScrews<br>GT40_SpoilerBolt1<br>GT40_SpoilerBolt2<br>GT40_SpoilerBolt3<br>GT40_TrunkBolts<br>GT40_DoorHandleL<br>GT40_DoorHandleR<br>GT40_FuelCap<br>GT40_TrunkHinge1<br>GT40_BodyTrim1<br>GT40_BodyTrim2<br>GT40_TrunkTrim1<br>GT40_TrunkHinge2<br>GT40_DoorTrimL<br>GT40_DoorTrimR | GT40_RearTowHooks<br>GT40_TowHooks1<br>GT40_RearWindowScrews<br>GT40_WheelTrimScrewsF<br>GT40_WheelTrimScrewsB<br>GT40_WheelTrimB<br>GT40_WheelTrimF<br>GT40_DoorHatchScrews<br>GT40_IntakeScrews1<br>GT40_IntakeScrews2<br>GT40_DoorHatch1<br>GT40_DoorScrewsL<br>GT40_DoorScrewsR<br>GT40_RoofScrews<br>GT40_SpoilerBolt1<br>GT40_SpoilerBolt2<br>GT40_SpoilerBolt3<br>GT40_TrunkBolts<br>GT40_DoorHandleL<br>GT40_DoorHandleR<br>GT40_FuelCap<br>GT40_TrunkHinge1<br>GT40_BodyTrim1<br>GT40_BodyTrim2<br>GT40_TrunkTrim1<br>GT40_TrunkHinge2<br>GT40_DoorTrimL<br>GT40_DoorTrimR | 537 | 34,388 | CENTER (-0.022, 0.014, 0.427) | UNKNOWN | Remaining trims, hinges, fasteners, handles, hooks, caps and small wheel arch details; the four large independent arch surfaces are mapped separately. |
| door_left | BODY | GT40_Body | GT40_Body__door_left | 54 | 15,006 | LEFT (-0.049, 0.500, 0.189) | HIGH | Source geometry identifies left door exterior; exact technical specifications are not documented. |
| door_right | BODY | GT40_Body | GT40_Body__door_right | 45 | 15,242 | RIGHT (-0.049, -0.500, 0.189) | HIGH | Source geometry identifies right door exterior; exact technical specifications are not documented. |
| hood | BODY | GT40_Body | GT40_Body__hood | 2 | 5,648 | FRONT (1.588, -0.000, 0.094) | MEDIUM | Source geometry identifies front luggage hood; exact technical specifications are not documented. |
| engine_cover | BODY | GT40_Body | GT40_Body__engine_cover | 1 | 6,120 | REAR (-0.924, -0.000, 0.319) | MEDIUM | Source geometry identifies rear engine cover; exact technical specifications are not documented. |
| tire_fl | WHEELS | GT40_WheelFL | GT40_WheelFL__tire | 6439 | 18,912 | FRONT/LEFT/BOTTOM (2.465, 1.614, -0.178) | HIGH | Source geometry identifies fl tire; exact technical specifications are not documented. |
| rim_fl | WHEELS | GT40_RimFL<br>GT40_WheelFL | GT40_RimFL<br>GT40_WheelFL | 267 | 7,634 | FRONT/LEFT/BOTTOM (2.465, 1.504, -0.178) | HIGH | Source geometry identifies fl rim; exact technical specifications are not documented. |
| tire_fr | WHEELS | GT40_WheelFR | GT40_WheelFR__tire | 6439 | 18,912 | FRONT/RIGHT/BOTTOM (2.465, -1.598, -0.178) | HIGH | Source geometry identifies fr tire; exact technical specifications are not documented. |
| rim_fr | WHEELS | GT40_RimFR<br>GT40_WheelFR | GT40_RimFR<br>GT40_WheelFR | 267 | 7,634 | FRONT/RIGHT/BOTTOM (2.465, -1.482, -0.178) | HIGH | Source geometry identifies fr rim; exact technical specifications are not documented. |
| tire_rl | WHEELS | GT40_WheelBL | GT40_WheelBL__tire | 6439 | 18,912 | REAR/LEFT/BOTTOM (-3.141, 1.547, -0.178) | HIGH | Source geometry identifies rl tire; exact technical specifications are not documented. |
| rim_rl | WHEELS | GT40_RimBL<br>GT40_WheelBL | GT40_RimBL<br>GT40_WheelBL | 267 | 7,634 | REAR/LEFT/BOTTOM (-3.141, 1.495, -0.178) | HIGH | Source geometry identifies rl rim; exact technical specifications are not documented. |
| tire_rr | WHEELS | GT40_WheelBR | GT40_WheelBR__tire | 6439 | 18,912 | REAR/RIGHT/BOTTOM (-3.141, -1.521, -0.178) | HIGH | Source geometry identifies rr tire; exact technical specifications are not documented. |
| rim_rr | WHEELS | GT40_RimBR<br>GT40_WheelBR | GT40_RimBR<br>GT40_WheelBR | 267 | 7,634 | REAR/RIGHT/BOTTOM (-3.141, -1.468, -0.178) | HIGH | Source geometry identifies rr rim; exact technical specifications are not documented. |
| engine_block | ENGINE | GT40_EngineBlockCaps<br>GT40_EngineCaps<br>GT40_EngineBlock1 | GT40_EngineBlockCaps<br>GT40_EngineCaps<br>GT40_EngineBlock1 | 81 | 5,838 | REAR (-0.905, -0.000, 0.262) | MEDIUM | Source geometry identifies engine block; exact technical specifications are not documented. |
| intake | ENGINE | GT40_EngineVent<br>GT40_EngineSuperChargers | GT40_EngineVent<br>GT40_EngineSuperChargers | 57 | 17,532 | REAR (-1.111, -0.000, 0.277) | MEDIUM | Source geometry identifies intake; exact technical specifications are not documented. |
| engine_valvetrain | ENGINE | GT40_EngineSprings1<br>GT40_EngineSpringsFrame<br>GT40_EngineSpringsSupports | GT40_EngineSprings1<br>GT40_EngineSpringsFrame<br>GT40_EngineSpringsSupports | 90 | 14,352 | REAR (-1.214, -0.000, 0.234) | MEDIUM | Source geometry identifies engine valvetrain; exact technical specifications are not documented. |
| engine_pipework | ENGINE | GT40_EnginePipes2<br>GT40_EnginePipes3<br>GT40_EnginePipes1<br>GT40_EnginePipes4 | GT40_EnginePipes2<br>GT40_EnginePipes3<br>GT40_EnginePipes1<br>GT40_EnginePipes4 | 118 | 20,960 | REAR (-1.097, 0.000, 0.230) | UNKNOWN | Source geometry identifies engine pipework; exact technical specifications are not documented. |
| engine_mounting_hardware | ENGINE | GT40_EngineTrim1<br>GT40_EngineTrim3<br>GT40_EngineTrim2 | GT40_EngineTrim1<br>GT40_EngineTrim3<br>GT40_EngineTrim2 | 57 | 264 | REAR (-1.041, -0.000, 0.253) | UNKNOWN | Source geometry identifies engine mounting hardware; exact technical specifications are not documented. |
| headlight_left | LIGHTING | GT40_HeadLights<br>GT40_HeadLightScrews<br>GT40_HeadLightCover2<br>GT40_HeadLightCover<br>GT40_HeadLightGlass | GT40_HeadLights__left<br>GT40_HeadLightScrews__left<br>GT40_HeadLightCover2__left<br>GT40_HeadLightCover__left<br>GT40_HeadLightGlass__left | 59 | 3,600 | FRONT/LEFT/BOTTOM (1.969, 0.628, -0.133) | HIGH | Source geometry identifies headlights left; exact technical specifications are not documented. |
| headlight_right | LIGHTING | GT40_HeadLights<br>GT40_HeadLightScrews<br>GT40_HeadLightCover2<br>GT40_HeadLightCover<br>GT40_HeadLightGlass | GT40_HeadLights<br>GT40_HeadLightScrews<br>GT40_HeadLightCover2<br>GT40_HeadLightCover<br>GT40_HeadLightGlass | 59 | 3,600 | FRONT/RIGHT/BOTTOM (1.969, -0.628, -0.133) | HIGH | Source geometry identifies headlights right; exact technical specifications are not documented. |
| headlights_trim | LIGHTING | GT40_SecondaryHeadlights<br>GT40_FrontSecondaryLightSocket<br>GT40_FrontSecondaryLightGlass | GT40_SecondaryHeadlights<br>GT40_FrontSecondaryLightSocket<br>GT40_FrontSecondaryLightGlass | 68 | 5,824 | FRONT/BOTTOM (3.115, 0.014, -0.256) | MEDIUM | Source geometry identifies headlights shared trim; exact technical specifications are not documented. |
| taillight_left | LIGHTING | GT40_Taillight1<br>GT40_Taillight2<br>GT40_TaillightTrim1<br>GT40_TaillightTrim2<br>GT40_TaillightCover1<br>GT40_TaillightCover2 | GT40_Taillight1__left<br>GT40_Taillight2__left<br>GT40_TaillightTrim1__left<br>GT40_TaillightTrim2__left<br>GT40_TaillightCover1__left<br>GT40_TaillightCover2__left | 56 | 4,796 | REAR/LEFT (-4.614, 1.596, 0.249) | HIGH | Source geometry identifies taillights left; exact technical specifications are not documented. |
| taillight_right | LIGHTING | GT40_Taillight1<br>GT40_Taillight2<br>GT40_TaillightTrim1<br>GT40_TaillightTrim2<br>GT40_TaillightCover1<br>GT40_TaillightCover2 | GT40_Taillight1<br>GT40_Taillight2<br>GT40_TaillightTrim1<br>GT40_TaillightTrim2<br>GT40_TaillightCover1<br>GT40_TaillightCover2 | 56 | 4,796 | REAR/RIGHT (-4.614, -1.567, 0.249) | HIGH | Source geometry identifies taillights right; exact technical specifications are not documented. |
| taillights_trim | LIGHTING | GT40_TailightGlass | GT40_TailightGlass | 12 | 392 | REAR (-4.583, 0.014, 0.276) | MEDIUM | Source geometry identifies taillights shared trim; exact technical specifications are not documented. |
| seat_back_left | INTERIOR | GT40_DriverSeat2 | GT40_DriverSeat2 | 5 | 22,310 | LEFT (-0.392, 0.355, 0.003) | MEDIUM | Separated by source mesh boundary: seat backrest versus cushion/base and attachment bars. Driver/passenger side follows source position. |
| seat_base_left | INTERIOR | GT40_DriverSeat1<br>GT40_DriverSeatBar<br>GT40_DriverSeatMount | GT40_DriverSeat1<br>GT40_DriverSeatBar<br>GT40_DriverSeatMount | 13 | 17,986 | LEFT/BOTTOM (-0.103, 0.354, -0.240) | MEDIUM | Separated by source mesh boundary: seat backrest versus cushion/base and attachment bars. Driver/passenger side follows source position. |
| seat_back_right | INTERIOR | GT40_PassengerSeat2 | GT40_PassengerSeat2 | 5 | 22,310 | RIGHT (-0.392, -0.350, 0.003) | MEDIUM | Separated by source mesh boundary: seat backrest versus cushion/base and attachment bars. Driver/passenger side follows source position. |
| seat_base_right | INTERIOR | GT40_PassengerSeat1<br>GT40_PassengerSeatBar<br>GT40_PassengerSeatMount | GT40_PassengerSeat1<br>GT40_PassengerSeatBar<br>GT40_PassengerSeatMount | 13 | 17,986 | RIGHT/BOTTOM (-0.257, -0.749, -0.338) | MEDIUM | Separated by source mesh boundary: seat backrest versus cushion/base and attachment bars. Driver/passenger side follows source position. |
| radiator_left | ENGINE | GT40_Radiator1 | GT40_Radiator1__left | 60 | 858 | REAR/LEFT/TOP (-2.239, 0.831, 0.735) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| radiator_right | ENGINE | GT40_Radiator1 | GT40_Radiator1__right | 60 | 858 | REAR/RIGHT/TOP (-2.239, -0.802, 0.735) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| exhaust_left | ENGINE | GT40_RearExhaust | GT40_RearExhaust__left | 4 | 13,248 | REAR (-4.551, 0.186, 0.216) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| exhaust_right | ENGINE | GT40_RearExhaust | GT40_RearExhaust__right | 4 | 13,248 | REAR (-4.551, -0.157, 0.216) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| rear_grille_left | BODY | GT40_RearGrill | GT40_RearGrill__left | 1 | 13,302 | REAR/LEFT (-4.593, 0.890, 0.249) | MEDIUM | Disconnected left/right body geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| rear_grille_right | BODY | GT40_RearGrill | GT40_RearGrill__right | 1 | 13,302 | REAR/RIGHT (-4.593, -0.862, 0.249) | MEDIUM | Disconnected left/right body geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| engine_wiring_left | ENGINE | GT40_EngineWires | GT40_EngineWires__left | 20 | 4,464 | REAR (-0.900, 0.217, 0.301) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| engine_wiring_right | ENGINE | GT40_EngineWires | GT40_EngineWires__right | 20 | 4,464 | REAR (-0.900, -0.217, 0.301) | MEDIUM | Disconnected left/right engine geometry islands split by source vehicle position; semantic identity follows the source object's name and placement. |
| wheel_arch_front_left | BODY | GT40_WheelTrimF | GT40_WheelTrimF__arch_front_left | 1 | 9,664 | FRONT/LEFT (2.517, 1.939, 0.091) | MEDIUM | One large source-connected wheel arch surface isolated from GT40_WheelTrimF/B; nearby small fasteners remain mapped with exterior hardware. |
| wheel_arch_front_right | BODY | GT40_WheelTrimF | GT40_WheelTrimF__arch_front_right | 1 | 9,664 | FRONT/RIGHT (2.517, -1.911, 0.091) | MEDIUM | One large source-connected wheel arch surface isolated from GT40_WheelTrimF/B; nearby small fasteners remain mapped with exterior hardware. |
| wheel_arch_rear_left | BODY | GT40_WheelTrimB | GT40_WheelTrimB__arch_rear_left | 1 | 9,144 | REAR/LEFT (-3.160, 1.890, 0.244) | MEDIUM | One large source-connected wheel arch surface isolated from GT40_WheelTrimF/B; nearby small fasteners remain mapped with exterior hardware. |
| wheel_arch_rear_right | BODY | GT40_WheelTrimB | GT40_WheelTrimB__arch_rear_right | 1 | 9,144 | REAR/RIGHT (-3.160, -1.862, 0.244) | MEDIUM | One large source-connected wheel arch surface isolated from GT40_WheelTrimF/B; nearby small fasteners remain mapped with exterior hardware. |
| engine_piston_bank_left | ENGINE | GT40_Pistons1 | GT40_Pistons1 | 724 | 19,856 | REAR/TOP (-2.062, 0.103, 0.905) | MEDIUM | One of the two independently modeled, spatially separated piston banks in the rear engine; internal repeated islands are retained as a grouped assembly. |
| engine_piston_bank_right | ENGINE | GT40_Pistons2 | GT40_Pistons2 | 724 | 19,856 | REAR/TOP (-2.062, -0.076, 0.905) | MEDIUM | One of the two independently modeled, spatially separated piston banks in the rear engine; internal repeated islands are retained as a grouped assembly. |

## FUSED / NOT SAFELY SEPARABLE

**5 documented limits** (5 entries; one fused large shell, one connected grille assembly, small unlabeled body islands, and two unrepresented/unverified systems):

1. **GT40_Body island 0, 77,228 source triangles.** A single continuous shell spans the hood surround, front and rear shoulder/fender skins, roof, side body and sill transitions. Door skins, hood and rear engine cover were isolated, but arbitrary cuts through this connected remainder would invent panel boundaries.
2. **Remaining small GT40_Body islands.** After the four reviewed door/hood/engine-cover separations, 177 source islands remain in the shell. Many are small decorative/edge surfaces without defensible names; the body mapping retains them, and hardware remains a broad trim group.
3. **GT40_FrontGrill, 30,912 triangles.** The evaluated grill is one connected mesh; no supported topology boundary separates bars, frame and support into independent named parts.
4. **Brake rotor / caliper geometry.** The wheel sources contain tires, rim faces and center/backing geometry, but no distinct rotor or caliper can be positively identified. No brake component is fabricated.
5. **Chassis, suspension and drivetrain service parts.** The scene includes an underside, rear truss, engine and source-labelled rear winch group, but no unambiguous independently modeled control arms, springs/dampers, driveshaft, axle or differential. Their generic geometry is retained without unsupported mechanical labels.

## Prepared runtime GLB and mapping QA

- GLB header: valid glTF 2.0; magic `glTF`, version 2; file size 4,772,164 bytes.
- Runtime mesh resources: 189; primitive/runtime draw records: 288; triangles: 755,134; GLB materials: 40.
- Semantic component groups: 63; groups with mesh descendants: 63; missing expected groups: 0; finite component transforms/bounds: true.
- Preparation accounting: 189 prepared mesh objects; 755,134 triangles; 41 source materials used; 32,523 final geometry islands across prepared meshes.
- Source object coverage: 162/162 retained vehicle source mesh objects represented; missing 0; unexpected 0. Five nonvehicle studio/palette objects were explicitly excluded: Studio_Ground1, PaintPallet4, PaintPallet2, PaintPallet3, PaintPallet1.
- Runtime decoder requirement: KHR_draco_mesh_compression; the universal viewer has its local Draco decoder configured and successfully loaded this GLB in-browser.

## Explode, viewer, React and Django

- Browser QA: PASS; 63/63 groups register and focus with finite combined bounds. The viewer loaded 288 runtime meshes; 0 unassigned, 0 lost and 0 hidden. Total group mesh memberships match the loaded meshes.
- Interaction: Raycaster hover/click on `wheel_arch_front_left`, focus for all 63 components, one deep link to the left piston bank, OrbitControls drag and mobile tap all passed. Console errors, exceptions and HTTP errors: 0/0/0.
- Explode: 0 → 25 → 50 → 75 → 100 → 75 → 50 → 25 → 0; EXPLODE 0% matches base component transforms exactly; reverse drift 0; repeated 25/50/75 drift 0/0/0. All are zero. Wheel hierarchy test: assembly displacement starts by 25%, reaches full offset at 50%, stays fixed through 100%, and tire/rim separation begins after 50% (measured relative offsets 0.264, 0.528, and tire/rim separation 0.308).
- Visual QA: seven assembled views [front](qa/gt40-deep/front.png), [rear](qa/gt40-deep/rear.png), [left](qa/gt40-deep/left.png), [right](qa/gt40-deep/right.png), [top](qa/gt40-deep/top.png), [front quarter](qa/gt40-deep/front-quarter.png), and [rear quarter](qa/gt40-deep/rear-quarter.png). Browser captures show the GT40 assembled at 0% and at [25%](qa/gt40-deep/browser/explode-25.png), [50%](qa/gt40-deep/browser/explode-50.png), [75%](qa/gt40-deep/browser/explode-75.png) and [100%](qa/gt40-deep/browser/explode-100.png).
- React tests: 11/11 passed. Production build: passed; Vite emitted the existing >500 kB chunk-size advisory.
- Django prepared-vehicle tests: PASS, 2/2 against the isolated test settings. The browser QA database contains Ford GT40 only, 63 CarPart rows, zero Products and zero compatibility rows.

## Known source limitations

The source has no separately provable brake rotor/caliper, suspension, axle/differential/driveshaft or complete chassis/frame assemblies. Exact year/variant is undocumented. The rendered source already shows dark mottled shading on parts of the door/side surfaces in the earlier integrated capture as well; a read-only cross-check found no exact coincident door faces against the retained body shell. I did not alter those source surfaces or fabricate replacement geometry.
