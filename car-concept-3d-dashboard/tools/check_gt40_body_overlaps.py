"""Read-only check for exact duplicate faces across GT40 body/door subsets."""
import bpy, json, sys
from pathlib import Path
from collections import defaultdict
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from geometry_analysis import connected_islands

source, output = [Path(v).resolve() for v in sys.argv[sys.argv.index('--') + 1:]]
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
obj = bpy.data.objects['GT40_Body']
deps = bpy.context.evaluated_depsgraph_get()
ev = obj.evaluated_get(deps)
mesh = ev.to_mesh(preserve_all_data_layers=True, depsgraph=deps)
try:
    islands = connected_islands(mesh)
    face_island = {face: key for key, _, faces in islands for face in faces}
    door_groups = {
        'door_left': {2312, 4995},
        'door_right': {2011, 5296},
        'hood': {2613, 2617},
        'engine_cover': {72},
    }
    selected = {name: {f for f, key in face_island.items() if key in keys} for name, keys in door_groups.items()}
    rest = set(face_island) - set().union(*selected.values())
    def face_key(face_index):
        face = mesh.polygons[face_index]
        coords = tuple(sorted(tuple(round(float(v), 5) for v in mesh.vertices[i].co) for i in face.vertices))
        return face.material_index, coords
    rest_keys = defaultdict(list)
    for face in rest:
        rest_keys[face_key(face)].append(face)
    results = {}
    for name, faces in selected.items():
        matches = []
        for face in faces:
            key = face_key(face)
            if key in rest_keys:
                matches.append({'selected_face': face, 'rest_faces': rest_keys[key]})
        results[name] = {'source_faces': len(faces), 'exact_face_matches_against_body_remainder': len(matches),
                         'matching_face_indices': matches[:100]}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(json.dumps({k: {'source_faces':v['source_faces'], 'matches':v['exact_face_matches_against_body_remainder']} for k,v in results.items()}))
finally:
    ev.to_mesh_clear()
