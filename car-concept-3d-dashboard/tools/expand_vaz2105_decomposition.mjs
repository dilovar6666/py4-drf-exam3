import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(root, 'qa', 'vaz2105-deep');
const base = JSON.parse(fs.readFileSync(path.join(root, 'qa/six-car/car2/review-config.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(qa, 'source-inventory.json'), 'utf8'));
const objects = new Map(inventory.objects.map(o => [o.name, o]));
const removedIds = new Set([
  'front_body_supports', 'door_panel_left', 'door_panel_right', 'headlight_assemblies',
  'taillight_assemblies', 'other_lamp_details', 'front_indicators', 'side_glazing_rl',
  'side_glazing_rr', 'seating', 'cabin_trim'
]);
const oldComponents = base.components;
const components = oldComponents.filter(c => !removedIds.has(c.id)).map(c => structuredClone(c));
const piecesBySource = {};
const separation = structuredClone(base.separation || {});
for (const [source, specs] of Object.entries(separation)) for (const spec of specs) piecesBySource[spec.name] = {source};
const expectedVehicleMeshes = new Set(oldComponents.flatMap(c => c.sourceNodes || []));
for (const c of oldComponents) for (const source of c.sourceNodes || []) expectedVehicleMeshes.delete(source);

function add(id, category, sourceNodes, description, confidence = 'MEDIUM', direction = [0, 0, 1], distanceFactor = 0.08) {
  if (!sourceNodes.length) throw new Error(`empty source assignment for ${id}`);
  components.push({
    id, name: id.split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' '), category,
    sourceNodes, description, confidence,
    explode: {direction, distanceFactor, sizeFactor: 0}
  });
}
function takeFrom(componentId, names) {
  const c = components.find(x => x.id === componentId);
  if (!c) return;
  const picked = new Set(names);
  const found = c.sourceNodes.filter(n => picked.has(n));
  c.sourceNodes = c.sourceNodes.filter(n => !picked.has(n));
  if (found.length !== picked.size) throw new Error(`${componentId}: expected ${[...picked]}, found ${found}`);
  if (!c.sourceNodes.length) components.splice(components.indexOf(c), 1);
}
function islandSplit(source, groups, suffixes) {
  const o = objects.get(source);
  if (!o || !o.islands?.length) throw new Error(`No island inventory for ${source}`);
  const assigned = new Set();
  const specs = [];
  for (let g = 0; g < groups.length; g += 1) {
    const indices = groups[g];
    if (!indices.length) throw new Error(`${source}: empty island group ${suffixes[g]}`);
    for (const i of indices) {
      if (assigned.has(i)) throw new Error(`${source}: island ${i} assigned twice`);
      assigned.add(i);
    }
    const name = `${source}__${suffixes[g]}`;
    specs.push({name, islands: indices});
    piecesBySource[name] = {source, group: g};
  }
  if (assigned.size !== o.islands.length) throw new Error(`${source}: only assigned ${assigned.size}/${o.islands.length} islands`);
  separation[source] = specs;
  return specs.map(s => s.name);
}
function allBy(source, predicate) {
  return objects.get(source).islands.filter(predicate).map(island => island.key);
}
function signGroups(source, suffixes = ['right', 'left']) {
  const left = allBy(source, island => island.center[0] >= 0);
  const right = allBy(source, island => island.center[0] < 0);
  return islandSplit(source, suffixes.map(side => side === 'left' ? left : right), suffixes);
}
function sourceNames(id) { return components.find(c => c.id === id)?.sourceNodes || []; }

// Recover doors mislabeled as front body supports; source bounds show four complete, separate leaves.
takeFrom('front_body_supports', ['Cube.002', 'Cube.003', 'Cube.080', 'Cube.081']);
add('front_right_door', 'BODY', ['Cube.002'], 'Independent front door leaf in the right front opening; distinct carcass mesh.', 'HIGH', [-1, 0, 0], 0.12);
add('rear_right_door', 'BODY', ['Cube.003'], 'Independent rear door leaf in the right rear opening; distinct carcass mesh.', 'HIGH', [-1, 0, 0], 0.12);
add('front_left_door', 'BODY', ['Cube.081'], 'Independent front door leaf in the left front opening; distinct carcass mesh.', 'HIGH', [1, 0, 0], 0.12);
add('rear_left_door', 'BODY', ['Cube.080'], 'Independent rear door leaf in the left rear opening; distinct carcass mesh.', 'HIGH', [1, 0, 0], 0.12);

// Split door-card meshes by their measured side and longitudinal location, correcting the old crossed pairing.
takeFrom('door_panel_left', ['Plane.023', 'Plane.063']);
takeFrom('door_panel_right', ['Plane.024', 'Plane.062']);
takeFrom('unclassified_geometry', ['Cube.048', 'Cube.085']);
add('front_right_door_panel', 'INTERIOR', ['Plane.023', 'Cube.048'], 'Front-right door card and its colocated pull/trim geometry.', 'HIGH', [-1, 0, 0], 0.12);
add('rear_right_door_panel', 'INTERIOR', ['Plane.024'], 'Rear-right door card; distinct panel mesh and position.', 'HIGH', [-1, 0, 0], 0.12);
add('front_left_door_panel', 'INTERIOR', ['Plane.062', 'Cube.085'], 'Front-left door card and its colocated pull/trim geometry.', 'HIGH', [1, 0, 0], 0.12);
add('rear_left_door_panel', 'INTERIOR', ['Plane.063'], 'Rear-left door card; distinct panel mesh and position.', 'HIGH', [1, 0, 0], 0.12);

// Rear side-glazing objects each contain one door pane and one quarter pane as separate islands.
takeFrom('side_glazing_rl', ['Plane.034']);
takeFrom('side_glazing_rr', ['Plane.057']);
const leftDoorGlass = islandSplit('Plane.034', [allBy('Plane.034', x => x.center[1] < 1), allBy('Plane.034', x => x.center[1] >= 1)], ['rear_door_glass_left', 'quarter_glass_left']);
const rightDoorGlass = islandSplit('Plane.057', [allBy('Plane.057', x => x.center[1] < 1), allBy('Plane.057', x => x.center[1] >= 1)], ['rear_door_glass_right', 'quarter_glass_right']);
takeFrom('side_glazing_fl', ['Plane.033']);
takeFrom('side_glazing_fr', ['Plane.035']);
add('front_left_door_glass', 'GLASS', ['Plane.035'], 'Front-left door pane from its separate original glass object.', 'HIGH', [1, 0, 0], 0.09);
add('front_right_door_glass', 'GLASS', ['Plane.033'], 'Front-right door pane from its separate original glass object.', 'HIGH', [-1, 0, 0], 0.09);
add('rear_left_door_glass', 'GLASS', [leftDoorGlass[0]], 'Separated rear-left door pane from the source two-island side-glass mesh.', 'HIGH', [1, 0, 0], 0.09);
add('rear_right_door_glass', 'GLASS', [rightDoorGlass[0]], 'Separated rear-right door pane from the source two-island side-glass mesh.', 'HIGH', [-1, 0, 0], 0.09);
add('left_quarter_glass', 'GLASS', [leftDoorGlass[1]], 'Fixed left rear quarter pane, separated by its disconnected source island.', 'HIGH', [1, 0, 0], 0.09);
add('right_quarter_glass', 'GLASS', [rightDoorGlass[1]], 'Fixed right rear quarter pane, separated by its disconnected source island.', 'HIGH', [-1, 0, 0], 0.09);
for (const id of ['windshield', 'rear_window']) {
  const c = components.find(x => x.id === id); if (c) c.category = 'GLASS';
}

// Hood and trunk outer/inner skins are separate meshes in the carcass collection.
takeFrom('unclassified_geometry', ['Cube.005', 'Plane.055', 'Cube.004', 'Plane.056']);
add('hood', 'BODY', ['Cube.005', 'Plane.055'], 'Front bonnet outer panel and colocated inner/support mesh.', 'HIGH', [0, -1, 0], 0.11);
add('trunk_lid', 'BODY', ['Cube.004', 'Plane.056'], 'Rear boot lid outer panel and colocated inner/support mesh.', 'HIGH', [0, 1, 0], 0.11);

// Door handles, mirrors and side mouldings are distinct, repeated source meshes.
takeFrom('unclassified_geometry', ['Cube.046', 'Cube.047', 'Cube.084', 'Cube.087', 'Cube.050', 'Cube.051', 'Cube.082', 'Cube.083',
  'Plane.047', 'Plane.048', 'Plane.049', 'Plane.050', 'Plane.058', 'Plane.059', 'Plane.060', 'Plane.061', 'Plane.054']);
add('front_right_door_handle', 'BODY', ['Cube.046'], 'Exterior handle geometry positioned on the front-right door.', 'HIGH', [-1, 0, 0], 0.06);
add('rear_right_door_handle', 'BODY', ['Cube.047'], 'Exterior handle geometry positioned on the rear-right door.', 'HIGH', [-1, 0, 0], 0.06);
add('front_left_door_handle', 'BODY', ['Cube.084'], 'Exterior handle geometry positioned on the front-left door.', 'HIGH', [1, 0, 0], 0.06);
add('rear_left_door_handle', 'BODY', ['Cube.087'], 'Exterior handle geometry positioned on the rear-left door.', 'HIGH', [1, 0, 0], 0.06);
add('right_side_mirror', 'BODY', ['Cube.050', 'Cube.051'], 'Mirror housing/support pair on the right front door corner.', 'MEDIUM', [-1, 0, 0], 0.08);
add('left_side_mirror', 'BODY', ['Cube.082', 'Cube.083', 'Plane.054'], 'Mirror housing/support and separate face detail on the left front door corner.', 'MEDIUM', [1, 0, 0], 0.08);
add('right_body_moulding', 'BODY', ['Plane.047', 'Plane.048', 'Plane.049', 'Plane.050'], 'Right-side repeated body moulding/end details, grouped by source side and placement.', 'MEDIUM', [-1, 0, 0], 0.06);
add('left_body_moulding', 'BODY', ['Plane.058', 'Plane.059', 'Plane.060', 'Plane.061'], 'Left-side repeated body moulding/end details, grouped by source side and placement.', 'MEDIUM', [1, 0, 0], 0.06);
takeFrom('unclassified_geometry', ['Plane.065']);
const mirrorPieces = islandSplit('Plane.065', [allBy('Plane.065', x => x.center[0] < -0.9), allBy('Plane.065', x => x.center[0] >= -0.9)], ['right_mirror_detail', 'interior_mirror_detail']);
components.find(c => c.id === 'right_side_mirror').sourceNodes.push(mirrorPieces[0]);

// Lighting meshes contain independent left/right islands; split by their measured lateral centers.
takeFrom('headlight_assemblies', sourceNames('headlight_assemblies'));
const frontLeftLight = [], frontRightLight = [];
for (const name of ['Plane.011', 'Plane.037', 'Plane.038', 'Cube.058', 'Cylinder.033']) {
  const ids = signGroups(name, ['right', 'left']);
  frontRightLight.push(ids[0]); frontLeftLight.push(ids[1]);
  if (['Cube.058', 'Cylinder.033'].includes(name)) takeFrom('unclassified_geometry', [name]);
}
add('front_left_headlight', 'LIGHTING', frontLeftLight, 'Left headlamp lenses, housing details and trim split by disconnected source islands.', 'HIGH', [-1, -0.3, 0], 0.1);
add('front_right_headlight', 'LIGHTING', frontRightLight, 'Right headlamp lenses, housing details and trim split by disconnected source islands.', 'HIGH', [1, -0.3, 0], 0.1);

takeFrom('taillight_assemblies', ['Plane.014']);
takeFrom('other_lamp_details', ['Plane.036']);
takeFrom('unclassified_geometry', ['Cube.057']);
const rearLeftLamp = [], rearRightLamp = [];
for (const name of ['Plane.014', 'Plane.036', 'Cube.057']) {
  const ids = signGroups(name, ['right', 'left']);
  rearRightLamp.push(ids[0]); rearLeftLamp.push(ids[1]);
}
add('rear_left_light', 'LIGHTING', rearLeftLamp, 'Left rear-light assembly: lens and colocated disconnected housing/detail islands.', 'HIGH', [-1, 0.5, 0], 0.1);
add('rear_right_light', 'LIGHTING', rearRightLamp, 'Right rear-light assembly: lens and colocated disconnected housing/detail islands.', 'HIGH', [1, 0.5, 0], 0.1);

takeFrom('front_indicators', ['Plane.045', 'Plane.070']);
takeFrom('unclassified_geometry', ['Plane.069']);
const frontLeftIndicator = [], frontRightIndicator = [];
for (const name of ['Plane.045', 'Plane.070', 'Plane.069']) {
  const ids = signGroups(name, ['right', 'left']);
  frontRightIndicator.push(ids[0]); frontLeftIndicator.push(ids[1]);
}
add('front_left_indicator', 'LIGHTING', frontLeftIndicator, 'Left front indicator/lens and matching outer marker island.', 'HIGH', [-1, -0.4, 0], 0.09);
add('front_right_indicator', 'LIGHTING', frontRightIndicator, 'Right front indicator/lens and matching outer marker island.', 'HIGH', [1, -0.4, 0], 0.09);

// Front grille bars are 17 disconnected islands in one front-centered plastic mesh.
takeFrom('unclassified_geometry', ['Plane.012']);
add('front_grille', 'BODY', ['Plane.012'], 'Front grille/slat mesh at the front fascia; internal slats remain one selectable grille assembly.', 'HIGH', [0, -1, 0], 0.08);

// Plates are identifiable by location; dashboard emblems remain with dash trim.
takeFrom('vehicle_badges', ['Plane.026', 'Cube.049', 'Plane.066', 'Plane.067', 'Plane.068']);
add('front_license_plate', 'BODY', ['Plane.026', 'Cube.049'], 'Front plate/plate insert geometry centered at the front fascia.', 'MEDIUM', [0, -1, 0], 0.06);
add('rear_license_plate', 'BODY', ['Plane.066', 'Plane.067', 'Plane.068'], 'Rear plate panel and its backing/edge details at the rear fascia.', 'MEDIUM', [0, 1, 0], 0.06);
const dashboardBadges = ['Plane.016', 'Plane.028', 'Plane.030'];
takeFrom('vehicle_badges', dashboardBadges);

// The old "seating" group was actually dashboard, steering and roof trim. The chair collection held all seats.
const oldSeatSources = sourceNames('seating');
takeFrom('seating', oldSeatSources);
const dashNodes = ['Plane.020', 'Cube.036', 'Plane.021', 'Plane.029', 'Cube.044', 'Cube.045', 'Cube.061',
  'Plane.022', 'Plane.027', 'Cube.042', 'Cube.043', 'Cube.054', ...dashboardBadges];
takeFrom('cabin_trim', ['Plane.029', 'Cube.044', 'Cube.045', 'Cube.061', 'Plane.022', 'Plane.027', 'Cube.042', 'Cube.043', 'Cube.054']);
add('dashboard', 'INTERIOR', dashNodes, 'Instrument fascia/dashboard surfaces and colocated dash trim, grouped from the dashboard source collections.', 'MEDIUM', [0, -1, 0], 0.07);
add('steering_wheel', 'INTERIOR', ['Cylinder.027', 'Cube.037', 'Cube.038'], 'Steering-wheel ring and attached hub/spoke meshes at the driver control position.', 'MEDIUM', [0, -1, 0], 0.08);
add('center_controls', 'INTERIOR', ['Cube.039', 'Cube.059', 'Cylinder.034', 'Cube.060', 'Cube.078', 'Cylinder.041', 'Cube.079'], 'Small grouped center-dashboard/control geometry; exact switch functions are not asserted.', 'MEDIUM', [0, -1, 0], 0.07);
add('sun_visors', 'INTERIOR', ['Cube.075', 'Plane.051'], 'Two source-disconnected overhead visor panels with matching small attachments.', 'MEDIUM', [0, 0, 1], 0.06);
add('headliner_trim', 'INTERIOR', ['Cube.076'], 'Four disconnected overhead cabin trim/rail pieces; retained as one cabin trim assembly.', 'MEDIUM', [0, 0, 1], 0.04);
add('cabin_interior_shell', 'INTERIOR', ['Plane.019'], 'Continuous connected interior shell spanning much of the cabin; no supported panel seams allow safe further separation.', 'MEDIUM', [0, 0, 1], 0.04);
add('rear_cabin_trim', 'INTERIOR', ['Plane.040', 'Cylinder.038', 'Cube.068', 'Plane.052', 'Cube.063', 'Cylinder.036', 'Cube.064'], 'Rear and upper-cabin interior trim meshes grouped by their cabin collection and placement.', 'MEDIUM', [0, 0.5, 0], 0.05);
add('interior_floor_trim', 'INTERIOR', ['Cube.035'], 'Low, thin cabin floor trim panel in the source salon collection.', 'MEDIUM', [0, 0, -1], 0.04);
add('lower_dashboard_trim', 'INTERIOR', ['Cube.040', 'Cube.041'], 'Lower front-cabin/dash trim pair by measured position; exact individual control function is unconfirmed.', 'UNKNOWN', [0, -1, 0], 0.05);

// The chair collection separates front-seat left/right cushion and backrest islands, plus rear bench/base.
takeFrom('unclassified_geometry', ['Cube.031', 'Cube.032', 'Cube.033', 'Cube.034']);
const frontSeatBase = signGroups('Cube.031', ['right', 'left']);
const frontSeatBack = signGroups('Cube.032', ['right', 'left']);
add('front_left_seat', 'INTERIOR', [frontSeatBase[1], frontSeatBack[1]], 'Left front seat cushion and backrest, paired by their separated same-side islands.', 'HIGH', [-1, 0, 0], 0.08);
add('front_right_seat', 'INTERIOR', [frontSeatBase[0], frontSeatBack[0]], 'Right front seat cushion and backrest, paired by their separated same-side islands.', 'HIGH', [1, 0, 0], 0.08);
add('rear_seat_base', 'INTERIOR', ['Cube.033'], 'Continuous rear bench cushion source mesh.', 'HIGH', [0, 0.4, 0], 0.08);
add('rear_seat_back', 'INTERIOR', ['Cube.034'], 'Continuous rear bench backrest source mesh.', 'HIGH', [0, 0.4, 0], 0.08);

// Third-pass review of the remaining multi-region generic objects.
takeFrom('unclassified_geometry', ['Cylinder.039', 'Cylinder.002', 'Cube.028', 'Cube.056', 'Cylinder.028',
  'Cube.062', 'Cylinder.035', 'Cube.086', 'Cube.088', 'Cube.089', 'Cylinder.031', 'Cylinder.003', 'Cylinder.032',
  'Cube.055', 'Cylinder.026', 'Cube.066', 'Cube.067', 'Cylinder.037', 'Cube.065', 'Cube.077', 'Plane.044',
  'Cube.052', 'Cube.053', 'Cube.070', 'Cube.071', 'Cube.072', 'Cube.073', 'Plane.025']);
add('front_headrests', 'INTERIOR', ['Cube.055'], 'Two separate front-seat headrest cushions at the same longitudinal position as the front seats.', 'HIGH', [0, 0, 1], 0.04);
add('front_seat_supports_unknown', 'INTERIOR', ['Cylinder.026', 'Cube.066'], 'Low cabin crossbar/bracket geometry positioned beneath the front-seat region; precise hardware role is unconfirmed.', 'UNKNOWN', [0, 0, -1], 0.04);
add('rear_seat_supports_unknown', 'INTERIOR', ['Cube.067'], 'Disconnected support-like pieces below the rear bench; precise role is unconfirmed.', 'UNKNOWN', [0, 0, -1], 0.04);
add('handbrake', 'INTERIOR', ['Cylinder.037', 'Cube.065'], 'Long lever and base geometry on the center floor, consistent with a handbrake control by shape and position.', 'MEDIUM', [0, 0, 1], 0.05);
add('rear_package_shelf', 'INTERIOR', ['Cube.077'], 'Broad rear-cabin parcel-shelf geometry behind the rear bench, retained as one four-island trim assembly.', 'MEDIUM', [0, 0, 1], 0.04);
const rearQuarterTrim = signGroups('Plane.044', ['left', 'right']);
add('rear_left_quarter_trim', 'INTERIOR', [rearQuarterTrim[0]], 'Left rear-cabin quarter trim island by source lateral position.', 'MEDIUM', [1, 0, 0], 0.04);
add('rear_right_quarter_trim', 'INTERIOR', [rearQuarterTrim[1]], 'Right rear-cabin quarter trim island by source lateral position.', 'MEDIUM', [-1, 0, 0], 0.04);
add('interior_rear_view_mirror', 'INTERIOR', ['Cube.052', 'Cube.053', mirrorPieces[1]], 'Small centered mirror and stem geometry at the upper windshield/cabin center.', 'MEDIUM', [0, 0, 1], 0.04);
add('rear_cabin_roof_trim', 'INTERIOR', ['Cube.056', 'Cylinder.028'], 'Thin disconnected upper-cabin trim pieces grouped by their shared position and source collection.', 'UNKNOWN', [0, 0, 1], 0.04);
add('left_dashboard_side_trim', 'INTERIOR', ['Cube.070', 'Cube.072'], 'Small trim pair at the left outer dashboard end by measured side position.', 'MEDIUM', [1, 0, 0], 0.04);
add('right_dashboard_side_trim', 'INTERIOR', ['Cube.071', 'Cube.073'], 'Small trim pair at the right outer dashboard end by measured side position.', 'MEDIUM', [-1, 0, 0], 0.04);
add('trunk_cavity_panel', 'BODY', ['Plane.025'], 'Large rear luggage-cavity panel inside the trunk region; exact floor/liner role is not provable.', 'MEDIUM', [0, 1, 0], 0.04);
const doorHardware = [
  ['front_right_door_details_unknown', ['Cylinder.035', 'Cube.062']],
  ['front_left_door_details_unknown', ['Cylinder.031', 'Cube.086']],
  ['rear_right_door_details_unknown', ['Cylinder.003', 'Cube.088']],
  ['rear_left_door_details_unknown', ['Cylinder.032', 'Cube.089']],
];
for (const [id, nodes] of doorHardware) {
  const right = id.includes('_right_');
  const front = id.startsWith('front_');
  add(id, 'UNKNOWN', nodes, `Small grouped detail geometry at the ${front ? 'front' : 'rear'} ${right ? 'right' : 'left'} door; function is not confidently identifiable.`, 'UNKNOWN', [right ? -1 : 1, 0, 0], 0.03);
}
add('left_b_pillar_detail_unknown', 'UNKNOWN', ['Cylinder.002'], 'Tiny exterior detail at the left-side B-pillar region; exact function is unknown.', 'UNKNOWN', [1, 0, 0], 0.02);
add('right_b_pillar_detail_unknown', 'UNKNOWN', ['Cylinder.039'], 'Tiny exterior detail at the right-side B-pillar region; exact function is unknown.', 'UNKNOWN', [-1, 0, 0], 0.02);
add('rear_left_body_detail_unknown', 'UNKNOWN', ['Cube.028'], 'Small isolated body-side detail at the left rear quarter; exact function is unknown.', 'UNKNOWN', [1, 0, 0], 0.02);

// The paired axle hardware objects contain independent left/right islands; exact brake function is unconfirmed.
takeFrom('front_wheel_hardware', ['Cylinder.029', 'Cylinder.030']);
takeFrom('rear_wheel_hardware', ['Cylinder.044', 'Cylinder.045']);
const wheelCornerSources = {
  front_right: ['Cylinder.029', 'Cylinder.030'], front_left: ['Cylinder.029', 'Cylinder.030'],
  rear_right: ['Cylinder.044', 'Cylinder.045'], rear_left: ['Cylinder.044', 'Cylinder.045']
};
for (const [corner, names] of Object.entries(wheelCornerSources)) {
  const target = corner.endsWith('right') ? 'right' : 'left';
  const pieces = names.map(name => signGroups(name, ['right', 'left'])[target === 'right' ? 0 : 1]);
  add(`${corner}_wheel_hardware`, 'WHEELS', pieces, 'Wheel-center/hub-side details grouped for this corner; the source does not prove a brake disc, caliper or drum.', 'UNKNOWN', [target === 'right' ? 1 : -1, 0, 0], 0.07);
}

// Small fasteners at the front and rear stay grouped by fascia location, not split into individual screws.
takeFrom('unclassified_geometry', ['Plane.046']);
const frontFasteners = allBy('Plane.046', x => x.center[1] < 0);
const rearFasteners = allBy('Plane.046', x => x.center[1] > 0);
const fastenerPieces = islandSplit('Plane.046', [frontFasteners, rearFasteners], ['front_fascia_fasteners', 'rear_fascia_fasteners']);
add('front_fascia_details', 'BODY', [fastenerPieces[0]], 'Small distributed fastening details at front lamp/fascia positions; kept non-decomposed as a decorative fastener set.', 'UNKNOWN', [0, -1, 0], 0.04);
add('rear_fascia_details', 'BODY', [fastenerPieces[1]], 'Small distributed fastening details at rear-light/fascia positions; kept non-decomposed as a decorative fastener set.', 'UNKNOWN', [0, 1, 0], 0.04);

// Keep the mascot-like object under an honest unconfirmed interior accessory label.
takeFrom('unclassified_geometry', ['Quacker1', 'Cylinder.040']);
add('dashboard_ornament_unknown', 'UNKNOWN', ['Quacker1', 'Cylinder.040'], 'Small dashboard-positioned ornament and base; mesh groups name body parts like head/wings, but the intended object/function is not verified.', 'UNKNOWN', [0, -1, 0], 0.04);

// Remaining geometry is deliberately left for the third-pass review instead of being guessed here.
const unclassified = components.find(c => c.id === 'unclassified_geometry');
if (unclassified) {
  unclassified.name = 'Remaining unconfirmed vehicle geometry';
  unclassified.category = 'UNKNOWN';
  unclassified.confidence = 'UNKNOWN';
  unclassified.description = 'Source meshes whose physical identity remains unconfirmed after geometric and spatial review; see report and per-object inventory.';
}
const tubeGroup = components.find(c => c.id === 'engine_pipework');
if (tubeGroup) {
  tubeGroup.id = 'vehicle_tubes_unknown';
  tubeGroup.name = 'Vehicle Tubes (Function Unconfirmed)';
  tubeGroup.category = 'UNKNOWN';
  tubeGroup.confidence = 'UNKNOWN';
  tubeGroup.description = 'Six disconnected tube runs lie across a large front-to-rear span. Their geometry is preserved as a group; no engine/exhaust/fuel function is asserted.';
}

const assemblyByCorner = {
  fl: {id:'wheel_fl', side:1, parts:['tire_fl','rim_fl','front_left_wheel_hardware']},
  fr: {id:'wheel_fr', side:-1, parts:['tire_fr','rim_fr','front_right_wheel_hardware']},
  rl: {id:'wheel_rl', side:1, parts:['tire_rl','rim_rl','rear_left_wheel_hardware']},
  rr: {id:'wheel_rr', side:-1, parts:['tire_rr','rim_rr','rear_right_wheel_hardware']},
};
for (const [corner, wheel] of Object.entries(assemblyByCorner)) {
  const tire = components.find(c => c.id === `tire_${corner}`);
  const rim = components.find(c => c.id === `rim_${corner}`);
  const hardware = components.find(c => c.id === wheel.parts[2]);
  for (const component of [tire, rim, hardware]) {
    component.explode.assemblyId = wheel.id;
    component.explode.assemblyOffset = [wheel.side * 0.34, 0, 0];
    component.explode.assemblyProgressEnd = 0.5;
    component.explode.componentProgressStart = 0.5;
    component.explode.direction = [wheel.side, 0, 0];
    component.explode.distanceFactor = component === rim ? 0.045 : 0.065;
  }
  rim.explode.direction = [-wheel.side, 0, 0];
  hardware.explode.direction = [0, 1, 0];
}

base.components = components;
base.separation = separation;
base.file = 'VAZ2105-deep-candidate.glb';
base.work = 'qa/vaz2105-deep/candidate';
base.decimate = 0.92;
base.textureMax = 1024;
base.image_format = 'JPEG';
base.jpeg_quality = 88;
base.review_components = ['body_shell', 'hood', 'trunk_lid', 'front_left_door', 'rear_left_door', 'rear_right_door',
  'front_left_headlight', 'rear_right_light', 'front_left_seat', 'rear_seat_back', 'dashboard', 'steering_wheel',
  'front_left_wheel_hardware', 'rear_right_wheel_hardware', 'engine_block', 'engine_pipework', 'underbody'];
base.candidate_old_component_count = oldComponents.length;
base.candidate_added_description = 'Deep VAZ 2105 geometry based review config; not yet promoted to runtime catalog.';

const mapped = new Map();
for (const component of components) for (const name of component.sourceNodes) {
  if (mapped.has(name)) throw new Error(`duplicate source assignment ${name}: ${mapped.get(name)} and ${component.id}`);
  mapped.set(name, component.id);
}
const remove = new Set(base.remove || []);
const sceneMeshes = new Set(inventory.objects.filter(o => o.type === 'MESH').map(o => o.name));
const expected = [...sceneMeshes].filter(name => !remove.has(name));
const represented = new Set([...mapped.keys()].map(name => piecesBySource[name]?.source || name));
const absent = expected.filter(name => !represented.has(name));
const extraneous = [...represented].filter(name => !sceneMeshes.has(name));
if (absent.length || extraneous.length) throw new Error(`coverage: missing ${absent.join(', ')}; extraneous ${extraneous.join(', ')}`);

fs.mkdirSync(qa, {recursive: true});
fs.writeFileSync(path.join(qa, 'review-config.json'), JSON.stringify(base, null, 2));
fs.writeFileSync(path.join(qa, 'coverage.json'), JSON.stringify({
  old_components: oldComponents.length, new_components: components.length,
  mapped_mesh_objects: mapped.size, removed_mesh_objects: [...remove],
  duplicate_assignments: 0, missing_mesh_objects: absent, extraneous_mesh_objects: extraneous,
  components: components.map(c => ({id:c.id,category:c.category,sourceNodes:c.sourceNodes}))
}, null, 2));
console.log(JSON.stringify({components:components.length, mapped: mapped.size, missing:absent.length, extraneous:extraneous.length,
  categories:components.reduce((m,c)=>(m[c.category]=(m[c.category]||0)+1,m),{})}));
