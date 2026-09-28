"""Build a geometry-reviewed Mercedes-Benz 560 SEL mapping; no guessed engine parts."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'qa/six-car/car6/source-analysis.json'
OUT = ROOT / 'qa/six-car/car6/review-config.json'
audit = json.loads(AUDIT.read_text(encoding='utf-8'))
meshes = {m['name']: m for m in audit['meshes']}
groups, assigned, separation = [], set(), {}


def add(cid, name, category, nodes, confidence='HIGH'):
    nodes = [n for n in nodes if n in meshes and n not in assigned]
    if nodes:
        assigned.update(nodes)
        groups.append({'id': cid, 'name': name, 'category': category,
                       'sourceNodes': nodes, 'confidence': confidence})


add('body_chassis_fused', 'Main body and chassis (source-fused)', 'BODY',
    ['Body-Chassis-Origine'], 'MEDIUM')
add('door_fl', 'Front left door assembly', 'BODY', ['Cube'], 'HIGH')
add('door_fr', 'Front right door assembly', 'BODY', ['Cube.001'], 'HIGH')
add('door_rl', 'Rear left door assembly', 'BODY', ['Cube.002'], 'HIGH')
add('door_rr', 'Rear right door assembly', 'BODY', ['Cube.003'], 'HIGH')
add('hood', 'Front hood / bonnet panel', 'BODY', ['Plane.001'], 'MEDIUM')
add('front_bumper', 'Front lower body panel', 'BODY', ['Plane.002'], 'MEDIUM')
add('rear_bumper', 'Rear lower body panel', 'BODY', ['Plane.003'], 'MEDIUM')
add('side_chrome', 'Side chrome trim', 'BODY', ['Side-Chrome'], 'HIGH')
add('windshield', 'Front windshield', 'GLASS', ['Window'], 'MEDIUM')
add('rear_window', 'Rear glass', 'GLASS', ['Rear-Glass', 'Rear-Glass-Details'], 'HIGH')
add('roof_panel_detail', 'Roof mounted panel detail', 'BODY', ['Top-Door'], 'MEDIUM')
add('interior_mirror', 'Interior rear-view mirror', 'INTERIOR', ['Inside-Mirror'], 'HIGH')
add('steering_wheel', 'Steering wheel geometry', 'INTERIOR', ['Wheel'], 'MEDIUM')
add('interior_floor', 'Cabin carpets', 'INTERIOR', ['Carpets'], 'HIGH')
add('exhaust', 'Exhaust outlet/system detail', 'EXHAUST', ['Exhaust'], 'HIGH')

wheel_materials = {'Tire_0': 'tire_outer', 'Tire_1': 'tire_inner', 'Rim': 'rim'}
for node, position in [('FL', 'fl'), ('FR', 'fr'), ('BL', 'rl'), ('BR', 'rr')]:
    separation[node] = []
    tire_nodes = []
    for material, role in wheel_materials.items():
        piece = node + '__material_' + material
        separation[node].append({'name': piece, 'materials': [material]})
        if role.startswith('tire'):
            tire_nodes.append(piece)
        else:
            rim_node = piece
    groups.append({'id': 'tire_' + position, 'name': position.upper() + ' tire',
                   'category': 'WHEELS', 'sourceNodes': tire_nodes, 'confidence': 'HIGH'})
    groups.append({'id': 'rim_' + position, 'name': position.upper() + ' rim',
                   'category': 'WHEELS', 'sourceNodes': [rim_node], 'confidence': 'HIGH'})
    assigned.add(node)

# Each side's lamps share a body-mounted source object but remain spatially disconnected.
lamp_islands = meshes['Lights']['topology']['islands']
front_keys = [i['key'] for i in lamp_islands if i['center'][1] < 0]
rear_keys = [i['key'] for i in lamp_islands if i['center'][1] > 0]
assert front_keys and rear_keys and len(front_keys) + len(rear_keys) == len(lamp_islands)
front_piece, rear_piece = 'Lights__island_front', 'Lights__island_rear'
separation['Lights'] = [
    {'name': front_piece, 'islands': front_keys},
    {'name': rear_piece, 'islands': rear_keys},
]
groups.append({'id': 'front_lights', 'name': 'Front lighting assemblies', 'category': 'LIGHTING',
               'sourceNodes': [front_piece], 'confidence': 'HIGH'})
groups.append({'id': 'rear_lights', 'name': 'Rear lighting assemblies', 'category': 'LIGHTING',
               'sourceNodes': [rear_piece, 'Rear-Lights'], 'confidence': 'HIGH'})
assigned.update(['Lights', 'Rear-Lights'])

# This symmetric panel is rearward and centered; source naming alone does not establish
# whether it is a trunk panel or door, so retain it under an explicitly unknown identity.
add('rear_panel_unidentified', 'Unidentified rear body panel', 'OTHER', ['Door.002'], 'UNKNOWN')
removed = ['Plane']  # 11.6 m display ground mesh; it is not part of the 5.16 m vehicle.
remaining = sorted(set(meshes) - assigned - set(removed))
add('unclassified_source_details', 'Unclassified source detail', 'OTHER', remaining, 'UNKNOWN')

for component in groups:
    cid = component['id']
    explode = {'directionMode': 'radial', 'distanceFactor': 0.13, 'sizeFactor': 0}
    if cid == 'body_chassis_fused':
        explode.update(direction=[0, 1, 0], distanceFactor=0.004)
    elif cid in ('door_fl', 'door_rl'):
        explode.update(direction=[1, 0.08, 0], distanceFactor=0.22)
    elif cid in ('door_fr', 'door_rr'):
        explode.update(direction=[-1, 0.08, 0], distanceFactor=0.22)
    elif cid.startswith(('tire_', 'rim_')):
        position = cid.rsplit('_', 1)[-1]
        sign = 1 if position in ('fl', 'rl') else -1
        explode.update(direction=[sign, 0, 0], distanceFactor=0.22 if cid.startswith('tire_') else 0.3)
    elif cid == 'front_lights':
        explode.update(direction=[0, 0.05, 1], distanceFactor=0.1)
    elif cid == 'rear_lights':
        explode.update(direction=[0, 0.05, -1], distanceFactor=0.1)
    elif cid in ('hood', 'front_bumper'):
        explode.update(direction=[0, 0.08, 1], distanceFactor=0.14)
    elif cid == 'rear_bumper':
        explode.update(direction=[0, 0.08, -1], distanceFactor=0.14)
    elif cid == 'exhaust':
        explode.update(direction=[0, -0.4, -1], distanceFactor=0.16)
    elif component.get('confidence') == 'UNKNOWN':
        explode['distanceFactor'] = 0.03
    component['explode'] = explode

config = {
    'id': 'mercedes_benz_560_sel', 'brand': 'Mercedes-Benz', 'name': '560 SEL', 'year': 0,
    'source': 'source_models/car6/Mercedes+Benz+560+SEL.blend/Mercedes Benz 560 SEL.blend',
    'file': 'Mercedes560SEL.glb', 'length': 5.16, 'textureMax': 2048, 'rotation_z': 0,
    'texture_root': str((ROOT.parent / 'source_models/car6').resolve()),
    'work': 'qa/six-car/car6', 'components': groups, 'separation': separation, 'remove': removed,
    'description': 'Identity follows the source filename. Mechanical parts not present as separately identifiable geometry are not represented as components.',
    'review_components': ['body_chassis_fused', 'tire_fl', 'rim_fl', 'front_lights', 'rear_lights',
                          'door_fl', 'steering_wheel', 'rear_window'],
    'review_only': True,
}
OUT.write_text(json.dumps(config, indent=2), encoding='utf-8')
print(json.dumps({'components': len(groups), 'source_meshes': len(meshes),
                  'mapped_source_meshes': len(assigned), 'unclassified': remaining,
                  'lamp_front_islands': len(front_keys), 'lamp_rear_islands': len(rear_keys),
                  'source_triangles': audit['triangles'], 'source_bytes': audit['source_bytes']}, indent=2))
