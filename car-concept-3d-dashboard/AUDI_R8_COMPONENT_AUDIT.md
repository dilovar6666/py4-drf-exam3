# Audi R8 semantic component audit

This audit is based on all 153 source OBJ groups, their names, GLB world-space
bounds, symmetry, material role, and relationship to neighbouring geometry.
`Line01` is the single non-vehicle group and remains excluded. The remaining
152 source meshes are covered below without using loose geometry islands.

Confidence describes the final semantic assignment, not confidence in every
micro-detail as an independently useful component. `MERGE` means the listed
source meshes become one hover/explode component. Technical details such as
bolts, valve parts, lamp lettering, and caliper detail meshes stay with their
recognisable parent.

## Body

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 1 | `The_body`, `Front_edges` | `body_shell` | Body shell | BODY | HIGH | MERGE |
| 2 | `Carbon` | `carbon_sideblades` | Carbon sideblades | BODY | MEDIUM | SEPARATE |
| 3 | `Fuel_tank_cap` | `fuel_filler_door` | Fuel filler door | BODY | HIGH | SEPARATE |
| 4 | `Front_logo`, `Rear_logo`, `R8_letters`, `Qattro_logo` | `exterior_badges` | Exterior badges | BODY | HIGH | MERGE |
| 5 | `Rear_edges` | `rear_lower_trim` | Rear lower trim | BODY | MEDIUM | SEPARATE |
| 6 | `radiator_grill` | `front_grille` | Front grille | BODY | HIGH | SEPARATE |
| 7 | `Front_plate` | `front_license_plate` | Front license plate | BODY | HIGH | SEPARATE |
| 8 | `Rear_plate` | `rear_license_plate` | Rear license plate | BODY | HIGH | SEPARATE |
| 9 | `Wiper__left` | `wiper_left` | Left windshield wiper | BODY | HIGH | SEPARATE |
| 10 | `Wiper_right` | `wiper_right` | Right windshield wiper | BODY | HIGH | SEPARATE |
| 11 | `Bottom` | `underbody` | Underbody panel | BODY | MEDIUM | SEPARATE |
| 12 | `Wheel_hole_cover` | `wheel_arch_liners` | Wheel-arch liners | BODY | MEDIUM | SEPARATE |
| 13 | `Luggage_carrier_cover` | `rear_engine_cover` | Rear deck / engine cover | BODY | MEDIUM | SEPARATE |
| 14 | `Left_door` | `door_left` | Left door | BODY | HIGH | SEPARATE |
| 15 | `Left_door_interior_panel` | `door_trim_left` | Left door interior trim | BODY | HIGH | SEPARATE |
| 16 | `Right_door` | `door_right` | Right door | BODY | HIGH | SEPARATE |
| 17 | `Right_door_interior_panel` | `door_trim_right` | Right door interior trim | BODY | HIGH | SEPARATE |

`Front_edges` is an asymmetric technical edge mesh and is not exposed as a
standalone part. It stays in `body_shell`.

## Glass

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 18 | `Front_windsield` | `windshield` | Windshield | GLASS | HIGH | SEPARATE |
| 19 | `Rear_window` | `rear_window` | Rear window | GLASS | HIGH | SEPARATE |
| 20 | `Window_inside` | `cabin_engine_partition_glass` | Cabin/engine partition glass | GLASS | MEDIUM | SEPARATE |
| 21 | `Side_window_left` | `side_window_left` | Left side window | GLASS | HIGH | SEPARATE |
| 22 | `Side_window_right` | `side_window_right` | Right side window | GLASS | HIGH | SEPARATE |

The `Window_inside` bounds place it behind the cabin and ahead of the rear
engine geometry. The conservative name describes its position without
claiming an unsupported mechanism.

## Interior

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 23 | `Body_of_interior` | `interior_shell` | Interior shell | INTERIOR | HIGH | SEPARATE |
| 24 | `Car_dashboard`, `Plane_under_dashboard` | `dashboard` | Dashboard | INTERIOR | HIGH | MERGE |
| 25 | `Brake_pedal` | `brake_pedal` | Brake pedal | INTERIOR | HIGH | SEPARATE |
| 26 | `Clutch_pedal` | `clutch_pedal` | Clutch pedal | INTERIOR | HIGH | SEPARATE |
| 27 | `Gas_pedal`, `button_of_accelerator` | `accelerator_pedal` | Accelerator pedal | INTERIOR | HIGH | MERGE |
| 28 | `Left_grill_of_conditioning`, `Roller_of_left_air_conditioning_grill` | `air_vent_left` | Left air vent | INTERIOR | HIGH | MERGE |
| 29 | `Center_grill_of_conditioning`, `Roller_of_center_air_conditioning_grill` | `air_vent_center` | Center air vent | INTERIOR | HIGH | MERGE |
| 30 | `Right_grill_of_air_conditioning`, `Roller_of_right_air_conditioninng_grill` | `air_vent_right` | Right air vent | INTERIOR | HIGH | MERGE |
| 31 | `Gearbox` | `center_tunnel` | Center tunnel | INTERIOR | MEDIUM | SEPARATE |
| 32 | `Cup_holder` | `cup_holder` | Cup holder | INTERIOR | HIGH | SEPARATE |
| 33 | `Transmission_gear_shifter`, `Grid_switching_speeds` | `gear_shifter` | Gear shifter and gate | INTERIOR | HIGH | MERGE |
| 34 | `Computer`, `Frame_of_computer` | `infotainment_display` | Infotainment display | INTERIOR | HIGH | MERGE |
| 35 | `CD_player` | `cd_player` | CD player | INTERIOR | HIGH | SEPARATE |
| 36 | `Cover_of_the_meters`, `The_meters_cover_glass` | `instrument_cluster` | Instrument cluster | INTERIOR | HIGH | MERGE |
| 37 | `grill_on_top_of_dashboard` | `dashboard_speaker_grille` | Dashboard speaker grille | INTERIOR | HIGH | SEPARATE |
| 38 | `rear-view_mirror` | `rear_view_mirror` | Rear-view mirror | INTERIOR | HIGH | SEPARATE |
| 39 | `Seats` | `seats` | Seat assembly | INTERIOR | HIGH | SEPARATE |
| 40 | `Steer_-_driver_wheel` | `steering_wheel` | Steering wheel | INTERIOR | HIGH | SEPARATE |

`Gearbox` spans the cabin centre line and is retained as the visible centre
tunnel. It is not labelled as a transmission because the source does not
provide a reliable standalone transmission assembly.

## Wheels

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 41 | `Front_right_tire01` | `front_left_tire` | Front left tire | WHEELS | HIGH | SEPARATE |
| 42 | `Front_right_rim_01`, `FRW_logo_on_rim01`, `FRW_bolt01`, `FRW_nipple_part_04`, `FRW_nipple_part_05`, `FRW_nipple_part_06` | `front_left_rim` | Front left rim | WHEELS | HIGH | MERGE |
| 43 | `Front_right_tire` | `front_right_tire` | Front right tire | WHEELS | HIGH | SEPARATE |
| 44 | `Front_right_rim_`, `FRW_logo_on_rim`, `FRW_bolt`, `FRW_nipple_part_1`, `FRW_nipple_part_2`, `FRW_nipple_part_3` | `front_right_rim` | Front right rim | WHEELS | HIGH | MERGE |
| 45 | `BRW_tire01` | `rear_left_tire` | Rear left tire | WHEELS | HIGH | SEPARATE |
| 46 | `BRW_rim01`, `BRW_rim_logo01`, `BRW_rim_bolts01`, `BRW_nipple_cap01`, `BRW_nipple_detail_03`, `BRW_nipple_detail_04` | `rear_left_rim` | Rear left rim | WHEELS | HIGH | MERGE |
| 47 | `BRW_tire` | `rear_right_tire` | Rear right tire | WHEELS | HIGH | SEPARATE |
| 48 | `BRW_rim`, `BRW_rim_logo`, `BRW_rim_bolts`, `BRW_nipple_cap`, `BRW_nipple_detail_1`, `BRW_nipple_detail_2` | `rear_right_rim` | Rear right rim | WHEELS | HIGH | MERGE |

The `01` side is confirmed as vehicle-left from positive-X world bounds. Rim
logos, bolts, and valve/nipple geometry are meaningful details of a rim, but
not useful independent hover/explode targets.

## Brakes

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 49 | `FRW_brake_disk01` | `front_left_brake_disc` | Front left brake disc | BRAKES | HIGH | SEPARATE |
| 50 | `FRW_brake_pad01`, `FRW_brake_pad_detail_03`, `FRW_brake_pad_detail_04` | `front_left_brake_caliper` | Front left brake caliper | BRAKES | HIGH | MERGE |
| 51 | `FRW_brake_disk` | `front_right_brake_disc` | Front right brake disc | BRAKES | HIGH | SEPARATE |
| 52 | `FRW_brake_pad`, `FRW_brake_pad_detail_1`, `FRW_brake_pad_detail_2` | `front_right_brake_caliper` | Front right brake caliper | BRAKES | HIGH | MERGE |
| 53 | `BRW_brake_disk01` | `rear_left_brake_disc` | Rear left brake disc | BRAKES | HIGH | SEPARATE |
| 54 | `BRW_brake_pad01`, `BRW_brake_pad_detail_03`, `BRW_brake_pad_detail_04` | `rear_left_brake_caliper` | Rear left brake caliper | BRAKES | HIGH | MERGE |
| 55 | `BRW_brake_disk` | `rear_right_brake_disc` | Rear right brake disc | BRAKES | HIGH | SEPARATE |
| 56 | `BRW_brake_pad`, `BRW_brake_pad_detail_1`, `BRW_brake_pad_detail_2` | `rear_right_brake_caliper` | Rear right brake caliper | BRAKES | HIGH | MERGE |

The source calls the caliper bodies “pads”; their paired detail meshes and
position around each disc support the user-facing caliper classification.

## Engine

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 57 | `Engine`, `Engine_part_1`, `Engine_part_2`, `Engine_part_3`, `Engine_bolts`, `Engine_section`, `FSI_letters`, `V8_letters` | `engine_block` | Engine block and central assembly | ENGINE | HIGH | MERGE |
| 58 | `Engine_left_panel`, `Cap_of_engine_left_panel` | `engine_cover_left` | Left engine cover | ENGINE | HIGH | MERGE |
| 59 | `engine_right_panel`, `Cap_of_engine_right_panel` | `engine_cover_right` | Right engine cover | ENGINE | HIGH | MERGE |
| 60 | `Engine_rear_panel` | `engine_rear_panel` | Rear engine panel | ENGINE | HIGH | SEPARATE |

The numbered engine parts have no defensible individual function names. They
remain in `engine_block`; no intake, airbox, or transmission is invented.

## Lighting

| # | Source object/group | Proposed componentId | Human name | Category | Confidence | Action |
|---:|---|---|---|---|---|---|
| 61 | `FRHL_main_body01`, `FRHL_Halogen_body01`, `Halogen_lens_back_side_cover01`, `FRHL_box01`, `FRHL_R8_holder01`, `FRHL_R8_letters01` | `headlight_left_housing` | Left headlight housing | LIGHTING | HIGH | MERGE |
| 62 | `FRHL_Cover_glass01`, `FRHL_halogen_lens01` | `headlight_left_lens` | Left headlight lens | LIGHTING | HIGH | MERGE |
| 63 | `FRHL_little_bulbs01`, `FRHL_dimension_bulb_reflector01`, `FRHL_dimension_bulb01` | `headlight_left_emitters` | Left headlight emitters | LIGHTING | HIGH | MERGE |
| 64 | `FRHL_main_body`, `FRHL_Halogen_body`, `Halogen_lens_back_side_cover`, `FRHL_box`, `FRHL_R8_holder`, `FRHL_R8_letters` | `headlight_right_housing` | Right headlight housing | LIGHTING | HIGH | MERGE |
| 65 | `FRHL_Cover_glass`, `FRHL_halogen_lens` | `headlight_right_lens` | Right headlight lens | LIGHTING | HIGH | MERGE |
| 66 | `FRHL_little_bulbs`, `FRHL_dimension_bulb_reflector`, `FRHL_dimension_bulb` | `headlight_right_emitters` | Right headlight emitters | LIGHTING | HIGH | MERGE |
| 67 | `RRL_main_body01`, `RRL_long_box01` | `taillight_left_housing` | Left taillight housing | LIGHTING | HIGH | MERGE |
| 68 | `RRL_cover_glass01` | `taillight_left_lens` | Left taillight lens | LIGHTING | HIGH | SEPARATE |
| 69 | `RRL_Smaller_brake_bulb01`, `RRL_bigger_brake_bulb01`, `RRL_dimension_bulb01`, `RRL_littele_bulbs_04`, `RRL_little_bulbs_03`, `RRL_little_bulbs_04` | `taillight_left_emitters` | Left taillight emitters | LIGHTING | HIGH | MERGE |
| 70 | `RRL_main_body`, `RRL_long_box` | `taillight_right_housing` | Right taillight housing | LIGHTING | HIGH | MERGE |
| 71 | `RRL_cover_glass` | `taillight_right_lens` | Right taillight lens | LIGHTING | HIGH | SEPARATE |
| 72 | `RRL_Smaller_brake_bulb`, `RRL_bigger_brake_bulb`, `RRL_dimension_bulb`, `RRL_littele_bulbs_3`, `RRL_little_bulbs_1`, `RRL_little_bulbs_2` | `taillight_right_emitters` | Right taillight emitters | LIGHTING | HIGH | MERGE |
| 73 | `Stop_light_on_top`, `Bulbs_of_stop_light_on_top` | `high_mounted_stop_light` | High-mounted stop light | LIGHTING | HIGH | MERGE |
| 74 | `Bottom_stop_light` | `rear_lower_center_light` | Rear lower centre light | LIGHTING | HIGH | SEPARATE |

Housing, lens, and emitter layers are separately understandable and support a
layered explode. Lettering and holder details remain with their housing.

## Excluded and non-exposed standalone candidates

| Source object/group | Decision | Reason |
|---|---|---|
| `Line01` | REMOVE | Presentation/background geometry, not part of the car. |
| `Front_edges` | KEEP INSIDE `body_shell` | Asymmetric technical edge with no reliable standalone human part. |
| Rim logos, bolts, and nipple/valve detail groups | KEEP INSIDE corresponding rim | Recognisable only as micro-details of the rim; separate explode would be noise. |
| Brake-pad detail groups | KEEP INSIDE corresponding caliper | Technical fragments of one caliper assembly. |
| `Engine_part_1`, `Engine_part_2`, `Engine_part_3`, `Engine_section`, `Engine_bolts`, `FSI_letters`, `V8_letters` | KEEP INSIDE `engine_block` | Geometry is real, but separate mechanical functions cannot be named reliably. |
| Engine panel cap groups | KEEP INSIDE corresponding engine cover | Small cover detail, not a useful standalone part. |
| Vent rollers, display frame, shifter gate, accelerator button, meter glass, lower dashboard plane | KEEP INSIDE semantic parent | Useful geometry, but not a useful independent hover/explode target. |
| Lamp holders and lamp lettering | KEEP INSIDE corresponding housing | Micro-details of the lamp assembly. |

## Audit result

- Source groups considered: **153**.
- Automotive source meshes retained: **152**.
- Background groups removed: **1** (`Line01`).
- Meaningful logical components proposed: **74**.
- HIGH confidence components: **67**.
- MEDIUM confidence components: **7**.
- LOW-confidence components exposed: **0**.
- Unmapped automotive meshes: **0**.

The count is a result of the semantic audit. No target component count was used.
