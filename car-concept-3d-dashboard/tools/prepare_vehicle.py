"""Conservative multi-car preparation: source -> baked world geometry -> semantic GLB.
blender -b --python tools/prepare_vehicle.py -- VEHICLE_KEY [--render-only]
Configuration lives in src/models/vehicles.json. Originals are never modified.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector

FRONTEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(FRONTEND/'tools'))
from vehicle_geometry import load_source, separate_reviewed, coincident_face_review, subset_mesh
from geometry_analysis import connected_islands
args = sys.argv[sys.argv.index('--')+1:]
config = json.loads(Path(args[args.index('--config')+1]).read_text(encoding='utf-8')) if '--config' in args else next(c for c in json.loads((FRONTEND/'src/models/vehicles.json').read_text(encoding='utf-8')) if c['id'] == args[0])
source = (FRONTEND.parent/config['source']).resolve()
out = FRONTEND/'assets/models'/config['file']
work = FRONTEND/config.get('work', 'qa/multi-car/'+config['id'])
work.mkdir(parents=True, exist_ok=True)
load_source(source)
originals = {o.name:o for o in bpy.context.scene.objects if o.type=='MESH'}
deps = bpy.context.evaluated_depsgraph_get()
mapping = {name:component for component in config['components'] for name in component['sourceNodes']}
expected = set(originals)-set(config.get('remove',[]))
generated_piece_sources = {
    piece['name']: source_name
    for source_name, pieces in config.get('separation', {}).items()
    for piece in pieces
}
covered={generated_piece_sources.get(name, name.split('__island_')[0].split('__material_')[0]) for name in mapping}
assert covered==expected, {'unmapped':sorted(expected-covered), 'missing':sorted(covered-expected)}
assert sum(len(c['sourceNodes']) for c in config['components'])==len(mapping), 'Duplicate source assignment'
# Evaluate modifiers in the source world exactly once, then detach all parents.
baked=[]
duplicate_face_evidence=[]
for name in sorted(set(originals)-set(config.get('remove',[]))):
    obj=originals[name]
    evaluated=obj.evaluated_get(deps)
    mesh=bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=deps)
    mesh.transform(evaluated.matrix_world)
    parts = separate_reviewed(mesh,config['separation'][name],name) if name in config.get('separation',{}) else [(name,mesh)]
    for part_name,part_mesh in parts:
        if name in config.get('review_duplicate_faces',[]):
            duplicates=coincident_face_review(part_mesh)
            duplicate_face_evidence.append({'source':name,'piece':part_name,'faces':len(part_mesh.polygons),'coincident_faces':len(duplicates)})
            if config.get('remove_confirmed_duplicate_faces') and duplicates:
                part_mesh=subset_mesh(part_mesh,set(range(len(part_mesh.polygons)))-set(duplicates),part_name+'_deduplicated')
        copy=bpy.data.objects.new('prepared_'+part_name,part_mesh)
        bpy.context.scene.collection.objects.link(copy)
        baked.append((copy,mapping[part_name]))
for obj in list(bpy.context.scene.objects):
    if obj not in [r[0] for r in baked]:
        bpy.data.objects.remove(obj,do_unlink=True)
# Both audited sources: +X front, +Y left, +Z up. Blender->glTF makes +Y up.
rotation=Matrix.Rotation(config.get('rotation_z',-90)*math.pi/180,4,'Z')
for obj,_ in baked:
    obj.data.transform(rotation)
all_vertices=[v.co for obj,_ in baked for v in obj.data.vertices]
lo=Vector([min(v[i] for v in all_vertices) for i in range(3)])
hi=Vector([max(v[i] for v in all_vertices) for i in range(3)])
scale=config['length']/(hi.y-lo.y)
center=(lo+hi)/2
transform=Matrix.Scale(scale,4) @ Matrix.Translation(-center)
roots={};assemblies={}
assembly_ids=sorted({component.get('explode',{}).get('assemblyId') for component in config['components']
                     if component.get('explode',{}).get('assemblyId')})
for assembly_id in assembly_ids:
    assembly=bpy.data.objects.new('Assembly_'+assembly_id,None)
    bpy.context.scene.collection.objects.link(assembly)
    assemblies[assembly_id]=assembly
for component in config['components']:
    root=bpy.data.objects.new('AA_'+component['id'],None)
    root['componentId']=component['id'];root['sourceNodes']=','.join(component['sourceNodes'])
    bpy.context.scene.collection.objects.link(root)
    assembly_id=component.get('explode',{}).get('assemblyId')
    if assembly_id:
        root.parent=assemblies[assembly_id]
        root.matrix_parent_inverse=Matrix.Identity(4)
        root.matrix_basis=Matrix.Identity(4)
    roots[component['id']]=root
for obj,component in baked:
    obj.data.transform(transform)
    obj.parent=roots[component['id']]
    obj.matrix_parent_inverse=Matrix.Identity(4)
    obj.matrix_basis=Matrix.Identity(4)
    obj.name=obj.name.removeprefix('prepared_')
    if config.get('decimate') and len(obj.data.polygons)>10000:
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Conservative web reduction','DECIMATE');mod.ratio=config['decimate']
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.update()

# Retain imported glTF PBR unchanged. Adapt only unsupported legacy Cycles shaders.
converted=[];missing_images=[]
materials={slot.material for obj,_ in baked for slot in obj.material_slots if slot.material}
for material in materials:
    if not material.use_nodes or not any(n.type=='BSDF_PRINCIPLED' for n in material.node_tree.nodes):
        old_nodes=list(material.node_tree.nodes) if material.use_nodes else []
        diffuse=next((n for n in old_nodes if n.type=='BSDF_DIFFUSE'),None)
        color=list(diffuse.inputs['Color'].default_value) if diffuse else list(material.diffuse_color)
        texture=next((n.image for n in old_nodes if n.type=='TEX_IMAGE' and n.image and n.image.size[0]>0),None)
        material.use_nodes=True;nodes=material.node_tree.nodes;nodes.clear()
        p=nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Base Color'].default_value=color
        p.inputs['Roughness'].default_value=.4
        name=material.name.lower()
        if any(word in name for word in ('trim','rim','exhaust','steer2')):p.inputs['Metallic'].default_value=.8
        if 'paint' in name or name=='material':p.inputs['Roughness'].default_value=.23
        if 'glass' in name:
            p.inputs['Base Color'].default_value=(.12,.17,.2,.24);p.inputs['Alpha'].default_value=.24
            p.inputs['Roughness'].default_value=.12
        output=nodes.new('ShaderNodeOutputMaterial');material.node_tree.links.new(p.outputs['BSDF'],output.inputs['Surface'])
        if texture:
            tex=nodes.new('ShaderNodeTexImage');tex.image=texture
            material.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
        converted.append(material.name)
for image in bpy.data.images:
    if not image.packed_file and image.source == 'FILE' and (not Path(bpy.path.abspath(image.filepath)).is_file() or image.size[0]==0):
        search_root = Path(config.get('texture_root',str(source.parent.parent)))
        matches = list(search_root.rglob(Path(image.filepath.replace('\\','/')).name)) if search_root.exists() else []
        if matches:
            image.filepath=str(matches[0]);image.reload()
    if image.size[0]==0 and image.type != 'RENDER_RESULT':missing_images.append(image.name)
    if image.size[0]>config.get('textureMax',2048) or image.size[1]>config.get('textureMax',2048):
        factor=config.get('textureMax',2048)/max(image.size)
        image.scale(round(image.size[0]*factor),round(image.size[1]*factor))
triangles=0
mesh_records=[]
for obj,_ in baked:
    obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
    corners=[Vector(v) for v in obj.bound_box]
    lo=[min(v[i] for v in corners) for i in range(3)]
    hi=[max(v[i] for v in corners) for i in range(3)]
    mesh_records.append({'name':obj.name,'component_id':obj.parent['componentId'],'vertices':len(obj.data.vertices),
        'triangles':len(obj.data.loop_triangles),'geometry_islands':len(connected_islands(obj.data)),
        'center':[(lo[i]+hi[i])*.5 for i in range(3)],'dimensions':[hi[i]-lo[i] for i in range(3)],
        'bounds':[list(Vector(v)) for v in obj.bound_box]})
if '--render-only' not in args and '--review-only' not in args:
    out.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False,export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                              export_draco_position_quantization=16, export_draco_normal_quantization=12, export_draco_texcoord_quantization=14,
                              export_image_format=config.get('image_format','AUTO'),
                              export_jpeg_quality=config.get('jpeg_quality',90))
report={'source':str(source),'source_bytes':source.stat().st_size,'glb':str(out),'bytes':out.stat().st_size if out.exists() else None,
        'runtime_exported': '--render-only' not in args and '--review-only' not in args,
        'duplicate_face_evidence':duplicate_face_evidence,
        'mesh_review': sorted(mesh_records,key=lambda r:r['triangles'],reverse=True),
        'baked_mesh_objects':len(baked),'triangles':triangles,'materials':len(materials),'semantic_components':len(roots),
        'converted_legacy_materials':converted,'missing_source_images':missing_images,'removed':config.get('remove',[]),
        'normalization':{'rotation':'-90 degrees Z in Blender; +Z front/+Y up in Three.js','scale':scale,'length':config['length']},
        'components':config['components'],'decimate':config.get('decimate',False),'texture_max':config.get('textureMax',2048),
        'image_format':config.get('image_format','AUTO'),'jpeg_quality':config.get('jpeg_quality',90),
        'compression':'Draco 16-bit positions, 12-bit normals, 14-bit UVs'}
if '--render-only' not in args and '--review-only' not in args:
    (work/'preparation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
# Deterministic studio render of the actually prepared geometry, not a generated image.
scene=bpy.context.scene;scene.render.engine='CYCLES' if '--review-only' in args else 'BLENDER_EEVEE';scene.render.resolution_x=900;scene.render.resolution_y=650;scene.render.resolution_percentage=100
if scene.render.engine=='CYCLES':
    scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.world=bpy.data.worlds.new('QA World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
for location,energy,size in [((4,-3,6),900,5),((-4,1,4),700,5)]:
    light=bpy.data.lights.new('QA Studio','AREA');light.energy=energy;light.shape='DISK';light.size=size
    obj=bpy.data.objects.new('QA Studio',light);scene.collection.objects.link(obj);obj.location=location;obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('QA Camera');obj=bpy.data.objects.new('QA Camera',camera);scene.collection.objects.link(obj)
obj.location=(4.4,-5.1,2.8);obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=6.5;scene.camera=obj
if '--no-render' not in args:
    views={} if '--semantic-only' in args else ({
        'front':(0,-8,1.5),'rear':(0,8,1.5),'left':(8,0,1.8),'right':(-8,0,1.8),
        'top':(0,-1,9),'front-quarter':(4.4,-5.1,2.8),'rear-quarter':(-4.4,5.1,2.8)
    } if '--review-only' in args else {'prepared-studio':(4.4,-5.1,2.8)})
    for label,location in views.items():
        obj.location=location;obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(work/(label+'.png'));bpy.ops.render.render(write_still=True)
    if '--semantic-only' in args:
        marker=bpy.data.materials.new('QA semantic highlight');marker.diffuse_color=(1,.35,.02,1)
        marker.use_nodes=True;marker.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,.35,.02,1)
        bpy.context.view_layer.update()
        for cid in config.get('review_components',[]):
            objects=[o for o,c in baked if c['id']==cid]
            assert objects, cid
            for o,_ in baked:o.hide_render=o not in objects
            originals_mat={o:list(o.data.materials) for o in objects}
            for o in objects:
                for i in range(len(o.data.materials)):o.data.materials[i]=marker
            corners=[o.matrix_world @ Vector(p) for o in objects for p in o.bound_box]
            minimum=Vector([min(p[i] for p in corners) for i in range(3)]);maximum=Vector([max(p[i] for p in corners) for i in range(3)])
            target=(minimum+maximum)/2;camera.ortho_scale=max((maximum-minimum).length*1.3,.5)
            obj.location=target+Vector((4.4,-5.1,2.8));obj.rotation_euler=(target-obj.location).to_track_quat('-Z','Y').to_euler()
            scene.render.filepath=str(work/('semantic-'+cid+'.png'));bpy.ops.render.render(write_still=True)
            for o,mats in originals_mat.items():
                for i,mat in enumerate(mats):o.data.materials[i]=mat
print(json.dumps({k:report[k] for k in ('bytes','baked_mesh_objects','triangles','materials','semantic_components')}))
