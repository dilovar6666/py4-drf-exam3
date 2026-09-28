import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const qaRoot = new URL('../qa/gt40-deep/', import.meta.url);
const candidatePath = new URL('../qa/six-car/car1/review-config.json', import.meta.url);
const catalogPath = new URL('../src/models/vehicles.json', import.meta.url);
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(new URL('../qa/gt40-deep/source-inventory.json', import.meta.url), 'utf8'));
const sourceByName = new Map(inventory.objects.map(object => [object.name, object]));

// The original scene audit found distinct left/right wheel arch meshes and
// two separately placed piston banks. Split only the topology/source objects
// verified in source-inventory.json.
candidate.work = 'qa/gt40-deep';
candidate.separation.GT40_WheelTrimF = [
  { name: 'GT40_WheelTrimF__arch_front_left', islands: [0] },
  { name: 'GT40_WheelTrimF__arch_front_right', islands: [400] },
];
candidate.separation.GT40_WheelTrimB = [
  { name: 'GT40_WheelTrimB__arch_rear_left', islands: [0] },
  { name: 'GT40_WheelTrimB__arch_rear_right', islands: [383] },
];
candidate.separation.GT40_RearGrill = [
  { name: 'GT40_RearGrill__left', islands: [0] },
  { name: 'GT40_RearGrill__right', islands: [5854] },
];
candidate.separation.GT40_RearExhaust = [
  { name: 'GT40_RearExhaust__left', islands: [48, 0, 8, 73] },
  { name: 'GT40_RearExhaust__right', islands: [480, 432, 440, 505] },
];
for (const [sourceName, leftName, rightName] of [
  ['GT40_Radiator1', 'GT40_Radiator1__left', 'GT40_Radiator1__right'],
  ['GT40_EngineWires', 'GT40_EngineWires__left', 'GT40_EngineWires__right'],
]) {
  const islands = sourceByName.get(sourceName).islands;
  candidate.separation[sourceName] = [
    { name: leftName, islands: islands.filter(island => island.center[1] > 0).map(island => island.key) },
    { name: rightName, islands: islands.filter(island => island.center[1] < 0).map(island => island.key) },
  ];
}

// Split two-seat geometry into the separately modeled backrests and bases.
candidate.components = candidate.components.filter(c => !['seat_left', 'seat_right'].includes(c.id));
candidate.components.push(
  ...[
    ['seat_back_left', 'Driver seat backrest', 'GT40_DriverSeat2', [-0.15, 0.4, 0.3]],
    ['seat_base_left', 'Driver seat base and supports', 'GT40_DriverSeat1,GT40_DriverSeatBar,GT40_DriverSeatMount', [-0.15, 0.4, -0.3]],
    ['seat_back_right', 'Passenger seat backrest', 'GT40_PassengerSeat2', [-0.15, -0.4, 0.3]],
    ['seat_base_right', 'Passenger seat base and supports', 'GT40_PassengerSeat1,GT40_PassengerSeatBar,GT40_PassengerSeatMount', [-0.15, -0.4, -0.3]],
  ].map(([id, name, sourceNodes, direction]) => ({
    id, name, category: 'INTERIOR', sourceNodes: sourceNodes.split(','),
    explode: { direction, distanceFactor: 0.08, sizeFactor: 0 },
    description: 'Separated by source mesh boundary: seat backrest versus cushion/base and attachment bars. Driver/passenger side follows source position.',
    confidence: 'MEDIUM',
  })),
);
for (const [oldId, newComponents] of [
  ['radiator', [
    ['radiator_left', 'Left engine bay radiator', 'GT40_Radiator1__left', [0, 0, 1]],
    ['radiator_right', 'Right engine bay radiator', 'GT40_Radiator1__right', [0, 0, 1]],
  ]],
  ['exhaust', [
    ['exhaust_left', 'Left rear exhaust assembly', 'GT40_RearExhaust__left', [0, 1, 0]],
    ['exhaust_right', 'Right rear exhaust assembly', 'GT40_RearExhaust__right', [0, -1, 0]],
  ]],
  ['rear_grille', [
    ['rear_grille_left', 'Left rear grille panel', 'GT40_RearGrill__left', [0, 1, 0]],
    ['rear_grille_right', 'Right rear grille panel', 'GT40_RearGrill__right', [0, -1, 0]],
  ]],
  ['engine_wiring', [
    ['engine_wiring_left', 'Left engine wire bundle', 'GT40_EngineWires__left', [0, 1, 0]],
    ['engine_wiring_right', 'Right engine wire bundle', 'GT40_EngineWires__right', [0, -1, 0]],
  ]],
]) {
  const old = candidate.components.find(c => c.id === oldId);
  const category = old.category;
  candidate.components = candidate.components.filter(c => c.id !== oldId);
  candidate.components.push(...newComponents.map(([id, name, sourceNode, direction]) => ({
    id, name, category, sourceNodes: [sourceNode],
    explode: { direction, distanceFactor: 0.08, sizeFactor: 0 },
    description: `Disconnected left/right ${category.toLowerCase()} geometry islands split by source vehicle position; semantic identity follows the source object's name and placement.`,
    confidence: 'MEDIUM',
  })));
}

// Wheel tire/rim groups share an assembly parent. The assembly leaves the
// chassis during the first half of explode; tire and rim separate afterward.
for (const component of candidate.components.filter(c => /^(tire|rim)_(fl|fr|rl|rr)$/.test(c.id))) {
  const suffix = component.id.slice(-2);
  const side = ['fl', 'rl'].includes(suffix) ? 1 : -1;
  const assemblyId = `wheel_${suffix}`;
  const tire = component.id.startsWith('tire_');
  component.explode = {
    direction: [side, 0, 0],
    distanceFactor: tire ? 0.13 : 0.06,
    sizeFactor: 0,
    assemblyId,
    assemblyOffset: [side * 0.42, 0, 0],
    assemblyProgressEnd: 0.5,
    componentProgressStart: 0.5,
  };
}
candidate.components = candidate.components.filter(c => c.id !== 'engine_internal_linkage');
candidate.components.find(c => c.id === 'exterior_hardware').description =
  'Remaining trims, hinges, fasteners, handles, hooks, caps and small wheel arch details; the four large independent arch surfaces are mapped separately.';
candidate.components.push(
  ...[
    ['wheel_arch_front_left', 'Front left wheel arch trim', 'GT40_WheelTrimF__arch_front_left', [-1, -0.1, 0]],
    ['wheel_arch_front_right', 'Front right wheel arch trim', 'GT40_WheelTrimF__arch_front_right', [1, -0.1, 0]],
    ['wheel_arch_rear_left', 'Rear left wheel arch trim', 'GT40_WheelTrimB__arch_rear_left', [-1, 0.1, 0]],
    ['wheel_arch_rear_right', 'Rear right wheel arch trim', 'GT40_WheelTrimB__arch_rear_right', [1, 0.1, 0]],
  ].map(([id, name, sourceNode, direction]) => ({
    id,
    name,
    category: 'BODY',
    sourceNodes: [sourceNode],
    explode: { direction, distanceFactor: 0.11, sizeFactor: 0 },
    description: 'One large source-connected wheel arch surface isolated from GT40_WheelTrimF/B; nearby small fasteners remain mapped with exterior hardware.',
    confidence: 'MEDIUM',
  })),
  ...[
    ['engine_piston_bank_left', 'Left engine piston bank', 'GT40_Pistons1', [0, 1, -0.2]],
    ['engine_piston_bank_right', 'Right engine piston bank', 'GT40_Pistons2', [0, -1, -0.2]],
  ].map(([id, name, sourceNode, direction]) => ({
    id,
    name,
    category: 'ENGINE',
    sourceNodes: [sourceNode],
    explode: { direction, distanceFactor: 0.12, sizeFactor: 0 },
    description: 'One of the two independently modeled, spatially separated piston banks in the rear engine; internal repeated islands are retained as a grouped assembly.',
    confidence: 'MEDIUM',
  })),
);
candidate.review_components = [
  'body_shell', 'door_left', 'door_right', 'hood', 'engine_cover',
  'wheel_arch_front_left', 'wheel_arch_front_right',
  'wheel_arch_rear_left', 'wheel_arch_rear_right',
  'tire_fl', 'rim_fl', 'engine_block', 'seat_back_left', 'seat_base_left',
  'radiator_left', 'radiator_right', 'exhaust_left', 'exhaust_right',
  'rear_grille_left', 'rear_grille_right', 'engine_wiring_left', 'engine_wiring_right',
  'engine_piston_bank_left', 'engine_piston_bank_right',
];

const originalCar = catalog.find(c => c.id === 'ford_gt40');
const rearMechanical = candidate.components.find(c => c.id === 'rear_mechanical_assembly');
rearMechanical.category = 'UNKNOWN';
rearMechanical.confidence = 'UNKNOWN';
rearMechanical.description = 'Source-labelled rear winch assembly, including motor and supports. The vehicle subsystem role is not confirmed by geometry, so it remains UNKNOWN.';
const old34Ids = [
  'body_shell','wheel_fl','wheel_fr','wheel_rl','wheel_rr','windshield','side_window_left',
  'side_window_right','rear_window','wiper','door_trim_left','door_trim_right','seat_left',
  'seat_right','steering_wheel','pedals','gear_selector','handbrake','instrument_cluster',
  'interior_controls','interior_ducts','interior_bracing','engine','radiator','exhaust','headlights',
  'indicators','taillights','front_grille','rear_grille','underbody','rear_bracing',
  'rear_mechanical_assembly','exterior_hardware',
];
const old34 = { id: originalCar.id, components: old34Ids.map(id => ({ id })) };
fs.writeFileSync(new URL('old-34-component-mapping.json', qaRoot), `${JSON.stringify(old34, null, 2)}\n`);
originalCar.components = candidate.components;
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
fs.writeFileSync(new URL('gt40-config.json', qaRoot), `${JSON.stringify(candidate, null, 2)}\n`);
console.log(JSON.stringify({ oldComponents: old34.components.length, newComponents: candidate.components.length,
  additions: candidate.components.slice(-6).map(c => c.id), config: 'qa/gt40-deep/gt40-config.json' }, null, 2));
