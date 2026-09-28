"""Keep the audited CSR2 vehicle geometry; discard garage/set dressing only."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'qa/six-car/car5/source-analysis.json'
OUT = ROOT / 'qa/six-car/car5/review-config.json'
audit = json.loads(AUDIT.read_text(encoding='utf-8'))
meshes = {m['name']: m for m in audit['meshes']}
groups, assigned = [], set()


def add(cid, name, category, nodes, confidence='HIGH'):
    nodes = [n for n in nodes if n in meshes and n not in assigned]
    if nodes:
        assigned.update(nodes)
        groups.append({'id': cid, 'name': name, 'category': category,
                       'sourceNodes': nodes, 'confidence': confidence})


wheel_materials = {'rim': 'CSR2_Wheel1A_Rim', 'tire': 'CSR2_Wheel1A_Tire',
                   'brake_disc': 'CSR2_Wheel1A_Rotor'}
separation = {}
for position, suffix in [('rr', 'RR'), ('fr', 'RF'), ('rl', 'LR'), ('fl', 'LF')]:
    source_name = 'Wheel_01_' + suffix
    separation[source_name] = []
    for role, material in wheel_materials.items():
        cid = role + '_' + position
        piece_name = source_name + '__material_' + material
        groups.append({'id': cid, 'name': f'{position.upper()} {role.replace("_", " ")}',
                       'category': 'BRAKES' if role == 'brake_disc' else 'WHEELS',
                       'sourceNodes': [piece_name], 'confidence': 'HIGH'})
        separation[source_name].append({'name': piece_name, 'materials': [material]})
    assigned.add(source_name)

add('body_shell', 'Painted and carbon exterior shell (source-fused)', 'BODY',
    ['Paint', 'Coloured', 'Carbon1'], 'MEDIUM')
add('chassis', 'Underbody base geometry', 'CHASSIS', ['Base'], 'MEDIUM')
add('lighting', 'Combined front/rear light geometry', 'LIGHTING', ['Light.002'], 'MEDIUM')
add('glazing', 'Body glass and glazing', 'GLASS', ['Glass', 'GlassInside'], 'HIGH')
add('interior', 'Cabin and interior trim', 'INTERIOR', ['Interior', 'InteriorZone2', 'InteriorEmissive', 'SeatBelt'], 'MEDIUM')
add('steering_wheel', 'Steering wheel assembly', 'INTERIOR',
    [n for n in meshes if n.startswith('SteeringWheel_')], 'HIGH')
add('trunk_lid', 'Trunk lid assembly', 'BODY', [n for n in meshes if n.startswith('Trunk_')], 'HIGH')
add('front_grille', 'Front and rear grille geometry', 'BODY',
    [n for n in meshes if n.startswith('Grille')], 'MEDIUM')
add('rear_spoiler_hardware', 'Rear spoiler hinge/linkage details', 'BODY',
    [n for n in meshes if n.startswith('Spoiler_Hinge')], 'MEDIUM')
add('door_fr', 'Front right door assembly', 'BODY', [n for n in meshes if n.startswith('DoorRF_')], 'HIGH')
add('door_fl', 'Front left door assembly', 'BODY', [n for n in meshes if n.startswith('DoorLF_')], 'HIGH')
for position, suffix in [('rr', 'RR'), ('fr', 'RF'), ('rl', 'LR'), ('fl', 'LF')]:
    add('brake_caliper_' + position, position.upper() + ' brake caliper', 'BRAKES',
        ['Caliper' + suffix], 'HIGH')

# Review found CaliperLR/LF contain two spatially separate meshes, one largely duplicated
# against the single-side RR/RF node. Split only by connected islands at the audited vehicle
# midline; keep coincident remainder assigned to the same physical side instead of discarding it.
for node, right_id, left_id in [('CaliperLR', 'brake_caliper_rr', 'brake_caliper_rl'),
                                ('CaliperLF', 'brake_caliper_fr', 'brake_caliper_fl')]:
    source_group = meshes[node]['topology']['islands']
    right_keys = [i['key'] for i in source_group if i['center'][0] < 3.67]
    left_keys = [i['key'] for i in source_group if i['center'][0] >= 3.67]
    assert right_keys and left_keys and len(right_keys) + len(left_keys) == len(source_group)
    right_piece, left_piece = node + '__island_low', node + '__island_high'
    separation[node] = [{'name': right_piece, 'islands': right_keys},
                        {'name': left_piece, 'islands': left_keys}]
    right_component = next(c for c in groups if c['id'] == right_id)
    right_component['sourceNodes'].append(right_piece)
    right_component['confidence'] = 'MEDIUM'
    left_component = next(c for c in groups if c['id'] == left_id)
    left_component['sourceNodes'] = [left_piece]
    left_component['confidence'] = 'MEDIUM'
add('badges', 'Vehicle badge geometry', 'BODY', [n for n in meshes if n.startswith('Badge')], 'HIGH')
add('unidentified_car_detail', 'Unidentified vehicle detail', 'OTHER', ['_CSB'], 'UNKNOWN')

vehicle_names = set(assigned)
# Garage pipes, wall strips, lights, props, floor and machinery stay in the untouched source
# scene and are deliberately omitted from the runtime vehicle asset.
removed = sorted(set(meshes) - vehicle_names)
unknown_car_nodes = [n for n in vehicle_names if n not in assigned and n not in meshes]
assert not unknown_car_nodes
assert len(vehicle_names) == len(assigned)

for component in groups:
    cid = component['id']
    explode = {'directionMode': 'radial', 'distanceFactor': 0.15, 'sizeFactor': 0}
    if cid == 'body_shell':
        explode.update(direction=[0, 1, 0], distanceFactor=0.006)
    elif cid in ('door_fl', 'door_rl'):
        explode.update(direction=[1, 0.08, 0], distanceFactor=0.22)
    elif cid in ('door_fr', 'door_rr'):
        explode.update(direction=[-1, 0.08, 0], distanceFactor=0.22)
    elif cid.startswith(('tire_', 'rim_', 'brake_disc_', 'brake_caliper_')):
        position = cid.rsplit('_', 1)[-1]
        sign = 1 if position in ('fl', 'rl') else -1
        role_factor = 0.3 if cid.startswith('rim_') else (0.12 if cid.startswith('brake_') else 0.22)
        explode.update(direction=[sign, 0, 0], distanceFactor=role_factor)
    elif cid in ('chassis', 'rear_spoiler_hardware'):
        explode.update(direction=[0, -0.25, -1], distanceFactor=0.12)
    elif cid == 'lighting':
        explode.update(direction=[0, 1, 0], distanceFactor=0.07)
    elif cid == 'glazing':
        explode.update(direction=[0, 1, 0], distanceFactor=0.11)
    elif component.get('confidence') == 'UNKNOWN':
        explode['distanceFactor'] = 0.03
    component['explode'] = explode

config = {
    'id': 'car5_unidentified', 'brand': 'Unknown', 'name': 'Car 5 (identity unconfirmed)', 'year': 0,
    'source': 'source_models/car5/uploads_files_4478463_Underground+Garage+Scene.blend',
    'file': 'Car5.glb', 'length': 4.5, 'textureMax': 2048, 'rotation_z': 0,
    'work': 'qa/six-car/car5', 'components': groups, 'remove': removed,
    'separation': separation,
    'description': 'Vehicle appears inside an underground-garage scene. A missing source texture path refers to Bugatti Chiron Super Sport WRE 2020, but the actual vehicle identity remains unverified.',
    'review_components': ['body_shell', 'tire_fl', 'rim_fl', 'brake_disc_fl', 'brake_caliper_fl',
                          'door_fl', 'lighting', 'interior'],
    'review_only': True,
}
OUT.write_text(json.dumps(config, indent=2), encoding='utf-8')
print(json.dumps({'components': len(groups), 'vehicle_meshes': len(vehicle_names),
                  'removed_environment_meshes': len(removed), 'removed_names': removed,
                  'source_triangles_including_environment': audit['triangles'],
                  'source_bytes': audit['source_bytes']}, indent=2))
