"""Build a review mapping for the generic hatchback from audited FBX node names."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'qa/six-car/car4/source-analysis.json'
OUT = ROOT / 'qa/six-car/car4/review-config.json'
audit = json.loads(AUDIT.read_text(encoding='utf-8'))
meshes = {m['name']: m for m in audit['meshes']}
groups = []
assigned = set()


def add(cid, name, category, nodes, confidence='HIGH'):
    nodes = [n for n in nodes if n in meshes and n not in assigned]
    if not nodes:
        return
    assigned.update(nodes)
    groups.append({'id': cid, 'name': name, 'category': category,
                   'sourceNodes': nodes, 'confidence': confidence})


add('body_shell', 'Fused hatchback body shell', 'BODY', ['Bodywork'], 'HIGH')
add('exterior_trim', 'Exterior plastic and grille trim', 'BODY',
    ['Bodywork Plastic', 'Bodywork Plastic.003', 'grid Metalic'], 'MEDIUM')
add('front_lights', 'Front light assemblies', 'LIGHTING', ['Front Light', 'Interior HeadLight'])
add('rear_lights', 'Rear light assemblies', 'LIGHTING',
    ['Rear Light', 'Interior Rear Light', 'Interior Rear Light.003', 'Interior Rear Light.004',
     'breaking rear light', 'BL_reverse Light', 'BL_Signal light', 'BR_reverse Light', 'BR_Signallight'])
add('windshield', 'Windshield and front glazing', 'GLASS', ['Windshield'])
add('rear_window', 'Rear hatch glazing', 'GLASS', ['Window', 'Trunk.001'])
add('side_glass', 'Side window glazing', 'GLASS',
    [n for n in meshes if 'Window_Glass' in n or n.endswith('_Glass') or 'GlassInside' in n])
add('windshield_wiper', 'Windshield wiper', 'BODY', ['Windshield wiper'])
add('antenna', 'Roof antenna', 'BODY', ['Antenna'])

# The source labels use Right on both mirrored door sets. World X distinguishes sides;
# each panel's shell, glazing, interior and handle pieces stay together per real door.
front_left = [n for n, m in meshes.items() if ('Right Front Door' in n or n.startswith('Door Handle'))
              and (m['bounds']['min'][0] + m['bounds']['max'][0]) / 2 > 0]
front_right = [n for n, m in meshes.items() if ('Right Front Door' in n or n.startswith('Door Handle'))
               and (m['bounds']['min'][0] + m['bounds']['max'][0]) / 2 < 0]
rear_left = [n for n, m in meshes.items() if ('Right Back Door' in n or n.startswith('Door handle'))
             and (m['bounds']['min'][0] + m['bounds']['max'][0]) / 2 > 0]
rear_right = [n for n, m in meshes.items() if ('Right Back Door' in n or n.startswith('Door handle'))
              and (m['bounds']['min'][0] + m['bounds']['max'][0]) / 2 < 0]
add('door_fl', 'Front left door assembly', 'BODY', front_left)
add('door_fr', 'Front right door assembly', 'BODY', front_right)
add('door_rl', 'Rear left door assembly', 'BODY', rear_left)
add('door_rr', 'Rear right door assembly', 'BODY', rear_right)

# Three source meshes per wheel carry separately named tire, metallic rim and color detail.
for key, prefix in [('fl', 'Left Front Tire'), ('rl', 'Left back Tire'),
                    ('fr', 'Right Front Tire'), ('rr', 'Right Back Tire')]:
    add('tire_' + key, key.upper() + ' tire', 'WHEELS', [prefix + '.001'])
    add('rim_' + key, key.upper() + ' metallic rim', 'WHEELS', [prefix])
    add('hub_' + key, key.upper() + ' wheel center detail', 'WHEELS', [prefix + '.002'], 'MEDIUM')

add('trunk_lid', 'Rear hatch / trunk assembly', 'BODY', ['Trunk', 'Trunk.002', 'Trunk.003', 'Trunk Lid Rubber Seal'])
add('seat_fl', 'Front left seat', 'INTERIOR', [n for n in meshes if n.startswith('Left Front Seat')])
add('seat_fr', 'Front right seat', 'INTERIOR', [n for n in meshes if n.startswith('Right Front Seat')])
add('seats_rear', 'Rear seating assembly', 'INTERIOR', [n for n in meshes if n.startswith('Rear Seat')])
add('steering_wheel', 'Steering wheel and spokes', 'INTERIOR', [n for n in meshes if n.startswith('Steering Wheel')])
add('steering_column', 'Steering column and adjustment', 'INTERIOR', ['Steering Column Adjustment'])
add('pedals', 'Clutch, brake and accelerator pedals', 'INTERIOR', ['clutch pedal', 'brake pedal', 'acelerator pedal'])
add('gear_selector', 'Gear selector and hand brake', 'INTERIOR', [n for n in meshes if n.startswith('gear shift') or n.startswith('hand brake')])
add('dashboard', 'Dashboard and instrument panel', 'INTERIOR',
    ['Panel', 'Panel metalic', 'Panel White', 'Details Panel', 'Instrument Panel 1', 'Instrument Panel 2',
     'Panel.001', 'Panel.002', 'Panel.003', 'Panel.008', 'Left air outlet cover', 'Left air outlet cover.001',
     'Right air outlet cover', 'Right air outlet cover.001', 'Console 1', 'Console 2', 'Console 3',
     'Console 3.001', 'Console 3.002', 'Console 3.003', 'Cover 2', 'Ventilation Button', 'Hazard Light Button',
     'Ar Conditioning Buttton 1', 'Ar Conditioning Buttton 2', 'Ar Conditioning Buttton 3', 'Button', 'Button.001',
     'Button.002', 'Button.003', 'Button.004', 'Button.005', 'palette 1 Left', 'palette 2 Left', 'palette 3 Left',
     'palette 1 Right', 'palette 2 Right', 'palette 3 Right'])
add('interior_trim', 'Cabin lining, mats and trim', 'INTERIOR',
    [n for n in meshes if n.startswith('inner lining') or n.startswith('Mat ') or n.startswith('mat ')] +
    ['Rubbers', 'Cover', 'Safety Strap 1', 'Safety Strap 2', 'Front Wheel Protect', 'Back Wheel Protect',
     'Plastic', 'Panel.008', 'Interior fog light', 'Light', 'Ceiling Light', 'Ceiling Light 2',
     'Interior Front Light', 'Rear View Mirror', 'Rear View Mirror.001', 'rear view mirror glass',
     'Sun Protection', 'Sun Protection.001', 'Sun Protection.002', 'Sun Protection.003'])
add('exterior_indicators', 'Turn indicators and exterior small lighting', 'LIGHTING',
    ['Direction Indicator 2', 'Direction Indicator 2.001', 'RF_turn signal', 'LF_turn signal'])
add('hinges', 'Door hinge hardware', 'BODY', ['Hinge'])

# Keep any remaining genuine source geometry in one explicitly uncertain selectable group;
# no guessed engine, brake, drivetrain, suspension, or panel IDs are manufactured.
remaining = sorted(set(meshes) - assigned - {'Circle'})
for node in remaining:
    slug = re.sub(r'[^a-z0-9]+', '_', node.lower()).strip('_')
    add('unknown_' + slug, 'Unidentified source detail: ' + node, 'OTHER', [node], 'UNKNOWN')

for component in groups:
    cid = component['id']
    explode = {'directionMode': 'radial', 'distanceFactor': 0.14, 'sizeFactor': 0}
    if cid == 'body_shell':
        explode.update(direction=[0, 1, 0], distanceFactor=0.006)
    elif cid in ('door_fl', 'door_rl'):
        explode.update(direction=[1, 0.08, 0], distanceFactor=0.22)
    elif cid in ('door_fr', 'door_rr'):
        explode.update(direction=[-1, 0.08, 0], distanceFactor=0.22)
    elif cid.startswith(('tire_', 'rim_', 'hub_')):
        position = cid.rsplit('_', 1)[-1]
        sign = 1 if position in ('fl', 'rl') else -1
        factor = 0.25 if cid.startswith('rim_') else (0.12 if cid.startswith('hub_') else 0.18)
        explode.update(direction=[sign, 0, 0], distanceFactor=factor)
    elif cid.startswith('brake_disc_') or cid.startswith('brake_caliper_'):
        explode.update(direction=[0, 0.12, 1], distanceFactor=0.16)
    elif cid in ('hood', 'trunk_lid'):
        explode.update(direction=[0, 1, 0], distanceFactor=0.14)
    elif cid == 'chassis':
        explode.update(direction=[0, -1, 0], distanceFactor=0.1)
    elif cid == 'front_lights':
        explode.update(direction=[0, 0.06, 1], distanceFactor=0.08)
    elif cid == 'rear_lights':
        explode.update(direction=[0, 0.06, -1], distanceFactor=0.08)
    elif component.get('confidence') == 'UNKNOWN':
        explode['distanceFactor'] = 0.035
    component['explode'] = explode

config = {
    'id': 'car4_generic_hatchback', 'brand': 'Unknown', 'name': 'Generic Hatchback', 'year': 0,
    'source': 'car-concept-3d-dashboard/qa/six-car/car4/source-copy/Car/Model/Car.fbx',
    'file': 'GenericHatchback.glb', 'length': 4.1, 'textureMax': 2048, 'rotation_z': 0,
    'texture_root': str((ROOT / 'qa/six-car/car4/source-copy').resolve()),
    'work': 'qa/six-car/car4', 'components': groups, 'remove': ['Circle'],
    'description': 'Source asset identifies only a generic hatchback; brand and model are not established.',
    'review_components': ['body_shell', 'tire_fl', 'rim_fl', 'door_fl', 'dashboard', 'front_lights', 'rear_lights'],
    'review_only': True,
}
OUT.write_text(json.dumps(config, indent=2), encoding='utf-8')
print(json.dumps({'components': len(groups), 'mapped_meshes': len(assigned), 'unknown_meshes': remaining,
                  'source_triangles': audit['triangles'], 'source_bytes': audit['source_bytes']}, indent=2))
