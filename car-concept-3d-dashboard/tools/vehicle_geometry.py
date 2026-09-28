"""Source import and reviewed, lossless face subsets; no Boolean cutting."""
import bpy
from pathlib import Path
from geometry_analysis import connected_islands


def load_source(source):
    source = Path(source)
    if source.suffix.lower() == '.blend':
        bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if source.suffix.lower() in ('.glb', '.gltf'):
            bpy.ops.import_scene.gltf(filepath=str(source))
        elif source.suffix.lower() == '.fbx':
            bpy.ops.import_scene.fbx(filepath=str(source))
        elif source.suffix.lower() == '.obj':
            bpy.ops.wm.obj_import(filepath=str(source))
        else:
            raise ValueError('Unsupported format: ' + str(source))


def subset_mesh(mesh, face_indices, name):
    """Preserve original vertex positions, winding, UV loops and corner normals."""
    faces = [mesh.polygons[i] for i in sorted(face_indices)]
    vertices = sorted({v for f in faces for v in f.vertices})
    remap = {v: i for i, v in enumerate(vertices)}
    out = bpy.data.meshes.new(name)
    out.from_pydata([mesh.vertices[v].co for v in vertices], [],
                    [[remap[v] for v in f.vertices] for f in faces])
    for material in mesh.materials:
        out.materials.append(material)
    loops = [i for f in faces for i in f.loop_indices]
    for old, new in zip(faces, out.polygons):
        new.material_index = old.material_index
        new.use_smooth = old.use_smooth
    for layer in mesh.uv_layers:
        target = out.uv_layers.new(name=layer.name)
        for i, old in enumerate(loops):
            target.data[i].uv = layer.data[old].uv
    # Preserve authored hard/smooth boundaries, including glTF custom normals.
    out.normals_split_custom_set([mesh.corner_normals[i].vector for i in loops])
    out.update()
    return out


def separate_reviewed(mesh, spec, name):
    islands = connected_islands(mesh)
    assigned = set()
    result = []
    for piece in spec:
        faces = set()
        if 'islands' in piece:
            wanted = set(piece['islands'])
            faces = {f for key, _, group in islands if key in wanted for f in group}
        elif 'materials' in piece:
            slots = {i for i,m in enumerate(mesh.materials) if m and m.name in piece['materials']}
            faces = {p.index for p in mesh.polygons if p.material_index in slots}
        assert faces, (name, piece)
        assert not assigned.intersection(faces), 'Overlapping reviewed face selectors'
        assigned.update(faces)
        result.append((piece['name'], subset_mesh(mesh, faces, piece['name'])))
    rest = set(range(len(mesh.polygons))) - assigned
    if rest:
        result.append((name, subset_mesh(mesh, rest, name)))
    assert sum(len(m.polygons) for _,m in result) == len(mesh.polygons)
    return result


def coincident_face_review(mesh, precision=5):
    """Evidence only: identical material and vertex-position sets, not proximity cuts."""
    seen=set();duplicates=[]
    for face in mesh.polygons:
        key=(face.material_index,tuple(sorted(tuple(round(v,precision) for v in mesh.vertices[i].co) for i in face.vertices)))
        if key in seen:duplicates.append(face.index)
        else:seen.add(key)
    return duplicates
