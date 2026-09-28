"""Read-only exact-coordinate duplicate geometry audit for the original VAZ scene."""
import bpy, hashlib, json, sys
from collections import Counter, defaultdict
from pathlib import Path
from mathutils import Vector

output = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
depsgraph = bpy.context.evaluated_depsgraph_get()
triangle_owners = defaultdict(list)
within_object_duplicate_triangles = Counter()
vertex_duplicate_counts = Counter()
mesh_fingerprints = defaultdict(list)
triangle_total = 0
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    ev = obj.evaluated_get(depsgraph)
    mesh = ev.to_mesh()
    try:
        mesh.calc_loop_triangles()
        points = [tuple(round(float(x), 5) for x in ev.matrix_world @ v.co) for v in mesh.vertices]
        vertex_duplicate_counts[obj.name] = len(points) - len(set(points))
        local_seen = set()
        fingerprint = hashlib.sha256()
        for tri in mesh.loop_triangles:
            triangle_total += 1
            coords = tuple(sorted(points[i] for i in tri.vertices))
            triangle_owners[coords].append(obj.name)
            if coords in local_seen:
                within_object_duplicate_triangles[obj.name] += 1
            local_seen.add(coords)
            fingerprint.update(repr(coords).encode('ascii'))
        mesh_fingerprints[fingerprint.hexdigest()].append(obj.name)
    finally:
        ev.to_mesh_clear()
cross_object = {repr(k): sorted(set(v)) for k, v in triangle_owners.items() if len(set(v)) > 1}
identical_meshes = [names for names in mesh_fingerprints.values() if len(names) > 1]
result = {
    'source': bpy.data.filepath,
    'evaluated_triangles': triangle_total,
    'coordinate_precision': 5,
    'duplicate_vertex_entries': sum(vertex_duplicate_counts.values()),
    'objects_with_duplicate_vertex_positions': {k:v for k,v in vertex_duplicate_counts.items() if v},
    'duplicate_triangles_within_object': sum(within_object_duplicate_triangles.values()),
    'duplicate_triangles_across_objects': len(cross_object),
    'cross_object_duplicate_triangle_examples': list(cross_object.values())[:100],
    'identical_evaluated_meshes': identical_meshes,
}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ('cross_object_duplicate_triangle_examples','objects_with_duplicate_vertex_positions')}))
