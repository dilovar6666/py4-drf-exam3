"""Exhaustive, read-only inventory of the original GT40 Blender scene."""
import bpy, json, sys
from collections import Counter, defaultdict
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from geometry_analysis import connected_islands

source, output = [Path(v).resolve() for v in sys.argv[sys.argv.index('--') + 1:]]
assert source.suffix.lower() == '.blend'
bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
scene = bpy.context.scene
depsgraph = bpy.context.evaluated_depsgraph_get()
V = lambda values: [float(x) for x in values]

def collection_tree(c):
    return {'name': c.name, 'hide_viewport': bool(c.hide_viewport), 'hide_render': bool(c.hide_render),
            'objects': [o.name for o in c.objects], 'children': [collection_tree(x) for x in c.children]}

objects = list(bpy.data.objects)
records, shared, points = [], defaultdict(list), []
for obj in objects:
    try:
        visible = bool(obj.visible_get(view_layer=bpy.context.view_layer))
    except Exception:
        visible = not obj.hide_viewport
    r = {'name': obj.name, 'type': obj.type, 'data_name': obj.data.name if obj.data else None,
         'data_library': obj.data.library.filepath if obj.data and obj.data.library else None,
         'object_library': obj.library.filepath if obj.library else None,
         'collections': [c.name for c in obj.users_collection], 'parent': obj.parent.name if obj.parent else None,
         'children': [c.name for c in obj.children], 'instance_type': obj.instance_type,
         'instance_collection': obj.instance_collection.name if obj.instance_collection else None,
         'hide_viewport': bool(obj.hide_viewport), 'hide_render': bool(obj.hide_render),
         'visible_in_view_layer': visible, 'world_position': V(obj.matrix_world.translation),
         'matrix_world': [V(row) for row in obj.matrix_world],
         'modifiers': [{'name': m.name, 'type': m.type, 'show_viewport': bool(m.show_viewport),
                        'show_render': bool(m.show_render)} for m in obj.modifiers],
         'constraints': [{'name': c.name, 'type': c.type, 'mute': bool(c.mute)} for c in obj.constraints]}
    if obj.type == 'MESH':
        shared[obj.data.name_full].append(obj.name)
        r['material_slots'] = [{'slot': s.name, 'material': s.material.name if s.material else None} for s in obj.material_slots]
        r['vertex_groups'] = [g.name for g in obj.vertex_groups]
        r.update(raw_vertex_count=len(obj.data.vertices), raw_edge_count=len(obj.data.edges), raw_face_count=len(obj.data.polygons))
        ev = obj.evaluated_get(depsgraph)
        mesh = ev.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            mesh.calc_loop_triangles()
            world = ev.matrix_world
            corners = [world @ Vector(p) for p in ev.bound_box]
            lo = [min(p[i] for p in corners) for i in range(3)]
            hi = [max(p[i] for p in corners) for i in range(3)]
            center = [(lo[i]+hi[i])*.5 for i in range(3)]
            points.extend(corners)
            mats = [s.material.name if s.material else 'UNASSIGNED' for s in obj.material_slots]
            islands = []
            for key, vi, fi in connected_islands(mesh):
                ip = [world @ mesh.vertices[i].co for i in vi]
                ilo = [min(p[i] for p in ip) for i in range(3)] if ip else [0.0]*3
                ihi = [max(p[i] for p in ip) for i in range(3)] if ip else [0.0]*3
                ic = [(ilo[i]+ihi[i])*.5 for i in range(3)]
                counts = Counter(mesh.polygons[f].material_index for f in fi)
                islands.append({'key': key, 'vertex_count': len(vi), 'face_count': len(fi),
                    'triangle_count': sum(max(0,len(mesh.polygons[f].vertices)-2) for f in fi),
                    'bounds_min': ilo, 'bounds_max': ihi, 'center': ic,
                    'dimensions': [ihi[i]-ilo[i] for i in range(3)],
                    'materials': {mats[j] if j < len(mats) else f'SLOT_{j}': n for j,n in sorted(counts.items())}})
            counts = Counter(p.material_index for p in mesh.polygons)
            r.update(evaluated_vertex_count=len(mesh.vertices), evaluated_edge_count=len(mesh.edges),
                evaluated_face_count=len(mesh.polygons), triangle_count=len(mesh.loop_triangles),
                bounds_min=lo, bounds_max=hi, center=center, dimensions=[hi[i]-lo[i] for i in range(3)],
                bbox_volume=(hi[0]-lo[0])*(hi[1]-lo[1])*(hi[2]-lo[2]),
                material_face_counts={mats[j] if j < len(mats) else f'SLOT_{j}': n for j,n in sorted(counts.items())},
                disconnected_island_count=len(islands), islands=islands)
        finally:
            ev.to_mesh_clear()
    records.append(r)

overall_min = [min(p[i] for p in points) for i in range(3)] if points else [0.0]*3
overall_max = [max(p[i] for p in points) for i in range(3)] if points else [0.0]*3
def side(center, lo, hi):
    mid=[(lo[i]+hi[i])*.5 for i in range(3)]; span=[max(hi[i]-lo[i],1e-8) for i in range(3)]
    return {'longitudinal':'FRONT' if center[0]>mid[0]+span[0]*.1 else 'REAR' if center[0]<mid[0]-span[0]*.1 else 'CENTER',
            'lateral':'LEFT' if center[1]>mid[1]+span[1]*.1 else 'RIGHT' if center[1]<mid[1]-span[1]*.1 else 'CENTER',
            'vertical':'TOP' if center[2]>mid[2]+span[2]*.12 else 'BOTTOM' if center[2]<mid[2]-span[2]*.12 else 'CENTER'}
for r in records:
    r['collection_paths'] = r['collections']
    if 'center' in r:
        r['vehicle_relative_position'] = side(r['center'], overall_min, overall_max)
        for island in r.get('islands', []): island['relative_position'] = side(island['center'], overall_min, overall_max)

instances=[]
for inst in depsgraph.object_instances:
    o=inst.object.original
    instances.append({'object':o.name,'data':o.data.name if o.data else None,'is_instance':bool(inst.is_instance),
        'parent':inst.parent.original.name if inst.parent else None,'matrix_world':[V(row) for row in inst.matrix_world]})
meshes=[r for r in records if r['type']=='MESH']
by_tri=sorted(meshes,key=lambda r:r['triangle_count'],reverse=True)
by_vol=sorted(meshes,key=lambda r:r['bbox_volume'],reverse=True)
pattern=('object','mesh','body','car','combined','merged','interior','engine','chassis')
report={'source':str(source),'source_bytes':source.stat().st_size,'source_mtime_ns':source.stat().st_mtime_ns,
    'blender_version':bpy.app.version_string,'scene':scene.name,'scene_objects':len(scene.objects),
    'all_datablock_objects':len(objects),'objects_by_type':dict(Counter(o.type for o in objects)),
    'mesh_objects':len(meshes),'evaluated_triangles':sum(r['triangle_count'] for r in meshes),
    'materials':[{'name':m.name,'users':m.users,'node_types':[n.type for n in m.node_tree.nodes] if m.use_nodes else []} for m in bpy.data.materials],
    'material_count':len(bpy.data.materials),'images':[{'name':i.name,'size':list(i.size),'packed':bool(i.packed_file),
    'source':i.source,'filepath':i.filepath} for i in bpy.data.images if i.type!='RENDER_RESULT'],
    'collections':[collection_tree(c) for c in scene.collection.children],'collection_count':len(bpy.data.collections),
    'vertex_group_count':sum(len(o.vertex_groups) for o in bpy.data.objects if o.type=='MESH'),
    'modifier_count':sum(len(o.modifiers) for o in objects),
    'hidden_viewport_objects':[o.name for o in objects if o.hide_viewport],
    'hidden_render_objects':[o.name for o in objects if o.hide_render],
    'not_visible_in_view_layer':[r['name'] for r in records if not r['visible_in_view_layer']],
    'linked_objects':[r['name'] for r in records if r['object_library'] or r['data_library']],
    'shared_mesh_datablocks':[{'data':k,'objects':v} for k,v in shared.items() if len(v)>1],
    'instances':instances,'overall_bounds':{'min':overall_min,'max':overall_max,'dimensions':[overall_max[i]-overall_min[i] for i in range(3)]},
    'largest_meshes_by_triangles':[{'name':r['name'],'triangles':r['triangle_count'],'dimensions':r['dimensions'],
         'center':r['center'],'islands':r['disconnected_island_count']} for r in by_tri[:25]],
    'largest_meshes_by_bbox_volume':[{'name':r['name'],'bbox_volume':r['bbox_volume'],'dimensions':r['dimensions'],
         'triangles':r['triangle_count']} for r in by_vol[:25]],
    'generic_or_suspicious_names':[r['name'] for r in meshes if any(x in r['name'].lower() for x in pattern)],
    'objects':records}
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:report[k] for k in ('source','source_bytes','scene_objects','all_datablock_objects','objects_by_type',
    'mesh_objects','evaluated_triangles','material_count','collection_count','hidden_viewport_objects',
    'hidden_render_objects','vertex_group_count','modifier_count','instances')}))
