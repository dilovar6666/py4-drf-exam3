"""Read-only source geometry audit in Blender; never save over an input model.
blender -b --python tools/analyze_vehicle.py -- SOURCE OUTPUT_JSON
"""
import bpy
import json
import sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from geometry_analysis import topology_report

source, output = [Path(p).resolve() for p in sys.argv[sys.argv.index('--') + 1:]]
if source.suffix.lower() == '.blend':
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
elif source.suffix.lower() in ('.glb', '.gltf'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
elif source.suffix.lower() == '.fbx':
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source))
elif source.suffix.lower() == '.obj':
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.wm.obj_import(filepath=str(source))
else:
    raise ValueError('Unsupported audit source: ' + str(source))
deps = bpy.context.evaluated_depsgraph_get()
records = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    corners = [evaluated.matrix_world @ Vector(p) for p in evaluated.bound_box]
    lo = [min(p[i] for p in corners) for i in range(3)]
    hi = [max(p[i] for p in corners) for i in range(3)]
    records.append({'name': obj.name, 'data': obj.data.name,
                    'parent': obj.parent.name if obj.parent else None,
                    'triangles': len(mesh.loop_triangles), 'vertices': len(mesh.vertices),
                    'materials': [s.material.name if s.material else None for s in obj.material_slots],
                    'bounds': {'min': lo, 'max': hi},
                    'center': [(a+b)/2 for a,b in zip(lo,hi)],
                    'size': [b-a for a,b in zip(lo,hi)],
                    'modifiers': [{'name': m.name, 'type': m.type, 'viewport': m.show_viewport, 'render': m.show_render} for m in obj.modifiers],
                    'topology': topology_report(mesh, evaluated.matrix_world, [s.material.name if s.material else 'UNASSIGNED' for s in obj.material_slots]),
                    'vertex_groups': [g.name for g in obj.vertex_groups],
                    'collections': [c.name for c in obj.users_collection],
                    'visible': not obj.hide_render,
                    'matrix': [list(row) for row in obj.matrix_world]})
    evaluated.to_mesh_clear()
report = {'source': str(source), 'source_bytes': source.stat().st_size,
          'objects': len(bpy.context.scene.objects), 'mesh_objects': len(records),
          'triangles': sum(r['triangles'] for r in records),
          'vertices': sum(r['vertices'] for r in records),
          'geometry_islands': sum(r['topology']['island_count'] for r in records),
          'collections': [{'name': c.name, 'objects': len(c.objects), 'children': [s.name for s in c.children]} for c in bpy.data.collections],
          'animations': [a.name for a in bpy.data.actions],
          'metadata': {str(k): str(v) for k,v in bpy.context.scene.items()},
          'materials': [{'name': m.name, 'nodes': [(n.type, n.name) for n in m.node_tree.nodes] if m.use_nodes else []} for m in bpy.data.materials],
          'images': [{'name': im.name, 'size': list(im.size), 'packed': bool(im.packed_file), 'path': im.filepath} for im in bpy.data.images if im.type != 'RENDER_RESULT'],
          'hierarchy': [{'name': o.name, 'type': o.type, 'parent': o.parent.name if o.parent else None} for o in bpy.context.scene.objects],
          'meshes': records}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({k: report[k] for k in ['source','source_bytes','objects','mesh_objects','triangles']}))
