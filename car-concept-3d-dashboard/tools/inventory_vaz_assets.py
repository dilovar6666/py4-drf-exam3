"""Read-only image and collection inventory for the original VAZ .blend."""
import bpy, hashlib, json, sys
from pathlib import Path

output = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
images = []
for image in bpy.data.images:
    packed = image.packed_file
    data = bytes(packed.data) if packed else b''
    images.append({
        'name': image.name, 'size': list(image.size), 'channels': image.channels,
        'packed': bool(packed), 'packed_bytes': len(data),
        'packed_md5': hashlib.md5(data).hexdigest() if data else None,
        'users': image.users, 'source': image.source, 'filepath': image.filepath,
    })
collections = [{
    'name': c.name, 'users': c.users, 'hide_viewport': bool(c.hide_viewport),
    'hide_render': bool(c.hide_render), 'objects': [o.name for o in c.objects],
    'children': [x.name for x in c.children],
} for c in bpy.data.collections]
materials = []
for material in bpy.data.materials:
    nodes = []
    if material.use_nodes and material.node_tree:
        for node in material.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                nodes.append({'image': node.image.name, 'role': node.label or node.name})
    materials.append({'name': material.name, 'users': material.users, 'images': nodes})
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({
    'source': bpy.data.filepath,
    'images': images, 'collections': collections, 'materials': materials,
}, indent=2), encoding='utf-8')
print(json.dumps({'source': bpy.data.filepath, 'images': len(images),
                  'packed_bytes': sum(i['packed_bytes'] for i in images),
                  'collections': len(collections), 'materials': len(materials),
                  'output': str(output)}))
