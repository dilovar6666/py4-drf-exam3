"""Exact face overlap audit for two nodes in an unchanged Blender source file."""
import bpy
import json
import sys
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:]
source, pairs = args[0], args[1:]
bpy.ops.wm.open_mainfile(filepath=str(Path(source)), load_ui=False, use_scripts=False)
deps = bpy.context.evaluated_depsgraph_get()


def face_keys(name, side):
    obj = bpy.data.objects[name]
    evaluated = obj.evaluated_get(deps)
    mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=deps)
    matrix = evaluated.matrix_world
    mesh.calc_loop_triangles()
    keys = set()
    for triangle in mesh.loop_triangles:
        points = [matrix @ mesh.vertices[index].co for index in triangle.vertices]
        center = sum(point[axis] for point in points) / 3
        if side == 'all' or (side == 'low' and center < split) or (side == 'high' and center >= split):
            material = mesh.materials[mesh.polygons[triangle.polygon_index].material_index]
            keys.add((material.name if material else '', tuple(sorted(tuple(round(p[k], 5) for k in range(3)) for p in points))))
    bpy.data.meshes.remove(mesh)
    return keys

results = []
for first_name, second_name, axis, split in zip(pairs[::4], pairs[1::4], pairs[2::4], pairs[3::4]):
    axis, split = int(axis), float(split)
    first, second = face_keys(first_name, 'all'), face_keys(second_name, 'low')
    results.append({'first': first_name, 'second': second_name, 'triangles_first': len(first),
                    'triangles_second_low': len(second), 'identical_faces': len(first & second)})
print(json.dumps(results, indent=2))
