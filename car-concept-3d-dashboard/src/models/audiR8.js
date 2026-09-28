// Semantic hierarchy emitted by tools/prepare_audi_r8.py and documented in
// AUDI_R8_COMPONENT_AUDIT.md. Component IDs are stable application IDs; OBJ
// group names remain isolated inside the preparation script.

const radialX = (distanceFactor, verticalBias = 0.02) => ({
  directionMode: 'radial-x', verticalBias, distanceFactor
});

function component(componentId, displayName, category, explode, options = {}) {
  const confidence = options.confidence || 'HIGH';
  return {
    displayName,
    category,
    confidence,
    nodes: [`AA_${componentId}`],
    metadata: {
      category,
      confidence,
      system: options.system || category.toLowerCase(),
      layer: options.layer || 0
    },
    explode,
    ...(options.lab ? { lab: options.lab } : {})
  };
}

const components = {
  body_shell: component('body_shell', 'Body shell', 'BODY', { direction: [0, 1, 0], distanceFactor: 0 }),
  carbon_sideblades: component('carbon_sideblades', 'Carbon sideblades', 'BODY', { direction: [0, 1, 0], distanceFactor: 0.055 }, { confidence: 'MEDIUM' }),
  fuel_filler_door: component('fuel_filler_door', 'Fuel filler door', 'BODY', radialX(0.1, 0.08)),
  exterior_badges: component('exterior_badges', 'Exterior badges', 'BODY', { direction: [0, 1, 0], distanceFactor: 0.055 }),
  rear_lower_trim: component('rear_lower_trim', 'Rear lower trim', 'BODY', { direction: [0, 0.12, -1], distanceFactor: 0.1 }, { confidence: 'MEDIUM' }),
  front_grille: component('front_grille', 'Front grille', 'BODY', { direction: [0, 0.08, 1], distanceFactor: 0.1 }),
  front_license_plate: component('front_license_plate', 'Front license plate', 'BODY', { direction: [0, 0.05, 1], distanceFactor: 0.13 }),
  rear_license_plate: component('rear_license_plate', 'Rear license plate', 'BODY', { direction: [0, 0.05, -1], distanceFactor: 0.13 }),
  wiper_left: component('wiper_left', 'Left windshield wiper', 'BODY', { direction: [0.2, 1, 0.15], distanceFactor: 0.08 }),
  wiper_right: component('wiper_right', 'Right windshield wiper', 'BODY', { direction: [-0.2, 1, 0.15], distanceFactor: 0.08 }),
  underbody: component('underbody', 'Underbody panel', 'BODY', { direction: [0, -1, 0], distanceFactor: 0.08 }, { confidence: 'MEDIUM' }),
  wheel_arch_liners: component('wheel_arch_liners', 'Wheel-arch liners', 'BODY', { direction: [0, -1, 0], distanceFactor: 0.06 }, { confidence: 'MEDIUM' }),
  rear_engine_cover: component('rear_engine_cover', 'Rear deck / engine cover', 'BODY', { direction: [0, 0.65, -0.75], distanceFactor: 0.15 }, { confidence: 'MEDIUM' }),
  door_left: component('door_left', 'Left door', 'BODY', radialX(0.2, 0.12), {
    system: 'door_left', layer: 3,
    lab: { slotId: 'middle_right', rotation: [0.02, -0.32, -0.06], maxSize: 2.05 }
  }),
  door_trim_left: component('door_trim_left', 'Left door interior trim', 'BODY', radialX(0.15, 0.1), { system: 'door_left', layer: 2 }),
  door_right: component('door_right', 'Right door', 'BODY', radialX(0.2, 0.12), { system: 'door_right', layer: 3 }),
  door_trim_right: component('door_trim_right', 'Right door interior trim', 'BODY', radialX(0.15, 0.1), { system: 'door_right', layer: 2 }),

  windshield: component('windshield', 'Windshield', 'GLASS', { direction: [0, 1, 0.12], distanceFactor: 0.12 }),
  rear_window: component('rear_window', 'Rear window', 'GLASS', { direction: [0, 0.85, -0.3], distanceFactor: 0.11 }),
  cabin_engine_partition_glass: component('cabin_engine_partition_glass', 'Cabin/engine partition glass', 'GLASS', { direction: [0, 1, -0.1], distanceFactor: 0.08 }, { confidence: 'MEDIUM' }),
  side_window_left: component('side_window_left', 'Left side window', 'GLASS', radialX(0.235, 0.18), { system: 'door_left', layer: 4 }),
  side_window_right: component('side_window_right', 'Right side window', 'GLASS', radialX(0.235, 0.18), { system: 'door_right', layer: 4 }),

  interior_shell: component('interior_shell', 'Interior shell', 'INTERIOR', { direction: [0, 1, 0], distanceFactor: 0.04 }),
  dashboard: component('dashboard', 'Dashboard', 'INTERIOR', { direction: [0, 0.35, 0.94], distanceFactor: 0.08 }),
  brake_pedal: component('brake_pedal', 'Brake pedal', 'INTERIOR', { direction: [0.2, -0.25, 1], distanceFactor: 0.065 }),
  clutch_pedal: component('clutch_pedal', 'Clutch pedal', 'INTERIOR', { direction: [0.35, -0.25, 1], distanceFactor: 0.075 }),
  accelerator_pedal: component('accelerator_pedal', 'Accelerator pedal', 'INTERIOR', { direction: [-0.2, -0.25, 1], distanceFactor: 0.065 }),
  air_vent_left: component('air_vent_left', 'Left air vent', 'INTERIOR', radialX(0.09, 0.2)),
  air_vent_center: component('air_vent_center', 'Center air vent', 'INTERIOR', { direction: [0, 0.25, 1], distanceFactor: 0.09 }),
  air_vent_right: component('air_vent_right', 'Right air vent', 'INTERIOR', radialX(0.09, 0.2)),
  center_tunnel: component('center_tunnel', 'Center tunnel', 'INTERIOR', { direction: [0, 1, 0], distanceFactor: 0.055 }, { confidence: 'MEDIUM' }),
  cup_holder: component('cup_holder', 'Cup holder', 'INTERIOR', { direction: [0, 1, -0.08], distanceFactor: 0.105 }),
  gear_shifter: component('gear_shifter', 'Gear shifter and gate', 'INTERIOR', { direction: [0, 1, 0], distanceFactor: 0.125 }),
  infotainment_display: component('infotainment_display', 'Infotainment display', 'INTERIOR', { direction: [0, 0.2, 1], distanceFactor: 0.1 }),
  cd_player: component('cd_player', 'CD player', 'INTERIOR', { direction: [0, 0.15, 1], distanceFactor: 0.085 }),
  instrument_cluster: component('instrument_cluster', 'Instrument cluster', 'INTERIOR', { direction: [0.15, 0.35, 1], distanceFactor: 0.1 }),
  dashboard_speaker_grille: component('dashboard_speaker_grille', 'Dashboard speaker grille', 'INTERIOR', { direction: [0, 1, 0], distanceFactor: 0.085 }),
  rear_view_mirror: component('rear_view_mirror', 'Rear-view mirror', 'INTERIOR', { direction: [0, 1, 0.1], distanceFactor: 0.11 }),
  seats: component('seats', 'Seat assembly', 'INTERIOR', { direction: [0, 1, 0], distanceFactor: 0.12 }, {
    lab: { slotId: 'middle_center', rotation: [0, -0.2, 0], maxSize: 2.05 }
  }),
  steering_wheel: component('steering_wheel', 'Steering wheel', 'INTERIOR', radialX(0.115, 0.38), {
    lab: { slotId: 'front_right', rotation: [0.18, -0.35, -0.08], maxSize: 1.45 }
  }),

  front_left_tire: component('front_left_tire', 'Front left tire', 'WHEELS', radialX(0.25, 0.02), {
    system: 'wheel_front_left', layer: 4,
    lab: { slotId: 'front_left', rotation: [0, 0.38, 0.04], maxSize: 1.65 }
  }),
  front_left_rim: component('front_left_rim', 'Front left rim', 'WHEELS', radialX(0.19, 0.02), { system: 'wheel_front_left', layer: 3 }),
  front_right_tire: component('front_right_tire', 'Front right tire', 'WHEELS', radialX(0.25, 0.02), { system: 'wheel_front_right', layer: 4 }),
  front_right_rim: component('front_right_rim', 'Front right rim', 'WHEELS', radialX(0.19, 0.02), { system: 'wheel_front_right', layer: 3 }),
  rear_left_tire: component('rear_left_tire', 'Rear left tire', 'WHEELS', radialX(0.25, 0.02), { system: 'wheel_rear_left', layer: 4 }),
  rear_left_rim: component('rear_left_rim', 'Rear left rim', 'WHEELS', radialX(0.19, 0.02), { system: 'wheel_rear_left', layer: 3 }),
  rear_right_tire: component('rear_right_tire', 'Rear right tire', 'WHEELS', radialX(0.25, 0.02), { system: 'wheel_rear_right', layer: 4 }),
  rear_right_rim: component('rear_right_rim', 'Rear right rim', 'WHEELS', radialX(0.19, 0.02), { system: 'wheel_rear_right', layer: 3 }),

  front_left_brake_disc: component('front_left_brake_disc', 'Front left brake disc', 'BRAKES', radialX(0.1, 0.04), {
    system: 'wheel_front_left', layer: 1,
    lab: { slotId: 'rear_center', rotation: [0.02, 0.34, 0], maxSize: 1.55 }
  }),
  front_left_brake_caliper: component('front_left_brake_caliper', 'Front left brake caliper', 'BRAKES', radialX(0.145, 0.08), { system: 'wheel_front_left', layer: 2 }),
  front_right_brake_disc: component('front_right_brake_disc', 'Front right brake disc', 'BRAKES', radialX(0.1, 0.04), { system: 'wheel_front_right', layer: 1 }),
  front_right_brake_caliper: component('front_right_brake_caliper', 'Front right brake caliper', 'BRAKES', radialX(0.145, 0.08), { system: 'wheel_front_right', layer: 2 }),
  rear_left_brake_disc: component('rear_left_brake_disc', 'Rear left brake disc', 'BRAKES', radialX(0.1, 0.04), { system: 'wheel_rear_left', layer: 1 }),
  rear_left_brake_caliper: component('rear_left_brake_caliper', 'Rear left brake caliper', 'BRAKES', radialX(0.145, 0.08), { system: 'wheel_rear_left', layer: 2 }),
  rear_right_brake_disc: component('rear_right_brake_disc', 'Rear right brake disc', 'BRAKES', radialX(0.1, 0.04), { system: 'wheel_rear_right', layer: 1 }),
  rear_right_brake_caliper: component('rear_right_brake_caliper', 'Rear right brake caliper', 'BRAKES', radialX(0.145, 0.08), { system: 'wheel_rear_right', layer: 2 }),

  engine_block: component('engine_block', 'Engine block and central assembly', 'ENGINE', { direction: [0, 0.62, -0.78], distanceFactor: 0.1 }, {
    system: 'engine', layer: 1,
    lab: { slotId: 'front_center', rotation: [0.08, -0.18, 0], maxSize: 1.75 }
  }),
  engine_cover_left: component('engine_cover_left', 'Left engine cover', 'ENGINE', { direction: [0.45, 0.72, -0.4], distanceFactor: 0.145 }, { system: 'engine', layer: 3 }),
  engine_cover_right: component('engine_cover_right', 'Right engine cover', 'ENGINE', { direction: [-0.45, 0.72, -0.4], distanceFactor: 0.145 }, { system: 'engine', layer: 3 }),
  engine_rear_panel: component('engine_rear_panel', 'Rear engine panel', 'ENGINE', { direction: [0, 0.35, -1], distanceFactor: 0.12 }, { system: 'engine', layer: 2 }),

  headlight_left_housing: component('headlight_left_housing', 'Left headlight housing', 'LIGHTING', { direction: [0.12, 0.05, 1], distanceFactor: 0.05 }, {
    system: 'headlight_left', layer: 1,
    lab: { slotId: 'middle_left', rotation: [0.04, -0.22, 0], maxSize: 2.05 }
  }),
  headlight_left_emitters: component('headlight_left_emitters', 'Left headlight emitters', 'LIGHTING', { direction: [0.12, 0.07, 1], distanceFactor: 0.085 }, { system: 'headlight_left', layer: 2 }),
  headlight_left_lens: component('headlight_left_lens', 'Left headlight lens', 'LIGHTING', { direction: [0.12, 0.09, 1], distanceFactor: 0.125 }, { system: 'headlight_left', layer: 3 }),
  headlight_right_housing: component('headlight_right_housing', 'Right headlight housing', 'LIGHTING', { direction: [-0.12, 0.05, 1], distanceFactor: 0.05 }, { system: 'headlight_right', layer: 1 }),
  headlight_right_emitters: component('headlight_right_emitters', 'Right headlight emitters', 'LIGHTING', { direction: [-0.12, 0.07, 1], distanceFactor: 0.085 }, { system: 'headlight_right', layer: 2 }),
  headlight_right_lens: component('headlight_right_lens', 'Right headlight lens', 'LIGHTING', { direction: [-0.12, 0.09, 1], distanceFactor: 0.125 }, { system: 'headlight_right', layer: 3 }),
  taillight_left_housing: component('taillight_left_housing', 'Left taillight housing', 'LIGHTING', { direction: [0.12, 0.05, -1], distanceFactor: 0.05 }, { system: 'taillight_left', layer: 1 }),
  taillight_left_emitters: component('taillight_left_emitters', 'Left taillight emitters', 'LIGHTING', { direction: [0.12, 0.07, -1], distanceFactor: 0.085 }, { system: 'taillight_left', layer: 2 }),
  taillight_left_lens: component('taillight_left_lens', 'Left taillight lens', 'LIGHTING', { direction: [0.12, 0.09, -1], distanceFactor: 0.125 }, { system: 'taillight_left', layer: 3 }),
  taillight_right_housing: component('taillight_right_housing', 'Right taillight housing', 'LIGHTING', { direction: [-0.12, 0.05, -1], distanceFactor: 0.05 }, { system: 'taillight_right', layer: 1 }),
  taillight_right_emitters: component('taillight_right_emitters', 'Right taillight emitters', 'LIGHTING', { direction: [-0.12, 0.07, -1], distanceFactor: 0.085 }, { system: 'taillight_right', layer: 2 }),
  taillight_right_lens: component('taillight_right_lens', 'Right taillight lens', 'LIGHTING', { direction: [-0.12, 0.09, -1], distanceFactor: 0.125 }, { system: 'taillight_right', layer: 3 }),
  high_mounted_stop_light: component('high_mounted_stop_light', 'High-mounted stop light', 'LIGHTING', { direction: [0, 0.45, -1], distanceFactor: 0.085 }),
  rear_lower_center_light: component('rear_lower_center_light', 'Rear lower centre light', 'LIGHTING', { direction: [0, -0.08, -1], distanceFactor: 0.085 })
};

export const audiR8ModelConfig = {
  id: 'audi_r8',
  displayName: 'Audi R8',
  modelPath: './assets/models/AudiR8.glb',
  estimatedFileSize: 8497604,
  semanticAudit: {
    sourceMeshCount: 152,
    componentCount: 74,
    highConfidence: 67,
    mediumConfidence: 7,
    lowConfidenceExposed: 0
  },
  normalization: { targetSize: 3.5, center: [0, 0.2, 0], rotation: [0, 0, 0] },
  presentation: { desktopOffset: [0.65, 0, 0], mobileOffset: [0, 0, 0] },
  performance: { shadowCasterMinSizeFactor: 0.14 },
  components
};
