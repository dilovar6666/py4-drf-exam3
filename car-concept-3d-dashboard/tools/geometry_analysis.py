"""Read-only connected topology evidence; islands are NOT semantic components."""
from collections import Counter, defaultdict
from mathutils import Vector


def connected_islands(mesh):
    parents = list(range(len(mesh.vertices)))

    def find(v):
        while parents[v] != v:
            parents[v] = parents[parents[v]]
            v = parents[v]
        return v

    for edge in mesh.edges:
        a, b = (find(v) for v in edge.vertices)
        if a != b:
            parents[max(a, b)] = min(a, b)
    groups = defaultdict(list)
    for v in mesh.vertices:
        groups[find(v.index)].append(v.index)
    faces = defaultdict(list)
    for p in mesh.polygons:
        faces[find(p.vertices[0])].append(p.index)
    return [(min(v), v, faces[k]) for k, v in sorted(groups.items())]


def uv_island_count(mesh):
    if not mesh.uv_layers:
        return None
    layer=mesh.uv_layers.active.data
    parents=list(range(len(mesh.polygons)))
    def find(v):
        while parents[v]!=v:
            parents[v]=parents[parents[v]];v=parents[v]
        return v
    edges=defaultdict(list)
    for polygon in mesh.polygons:
        loops=list(polygon.loop_indices)
        for n,loop in enumerate(loops):
            next_loop=loops[(n+1)%len(loops)]
            a,b=mesh.loops[loop].vertex_index,mesh.loops[next_loop].vertex_index
            key=(min(a,b),max(a,b))
            sample={a:tuple(layer[loop].uv),b:tuple(layer[next_loop].uv)}
            edges[key].append((polygon.index,sample))
    eps=1e-5
    for samples in edges.values():
        if len(samples)<2:continue
        base,other=samples[0]
        for face,uv in samples[1:]:
            if all(abs(uv[k][i]-other[k][i])<eps for k in other for i in (0,1)):
                a,b=find(base),find(face)
                if a!=b:parents[max(a,b)]=min(a,b)
    return len({find(i) for i in range(len(parents))})


def topology_report(mesh, matrix, materials):
    records = []
    for key, indices, faces in connected_islands(mesh):
        points = [matrix @ mesh.vertices[i].co for i in indices]
        lo = [min(p[i] for p in points) for i in range(3)]
        hi = [max(p[i] for p in points) for i in range(3)]
        counts = Counter(mesh.polygons[i].material_index for i in faces)
        records.append({'key': key, 'vertices': len(indices), 'faces': len(faces),
                        'triangles': sum(len(mesh.polygons[i].vertices)-2 for i in faces),
                        'min': lo, 'max': hi, 'center': [(a+b)/2 for a,b in zip(lo,hi)],
                        'size': [b-a for a,b in zip(lo,hi)],
                        'materials': {materials[k] if k < len(materials) else str(k): v for k,v in counts.items()}})
    edge_faces = Counter()
    for p in mesh.polygons:
        for pair in p.edge_keys:
            edge_faces[tuple(sorted(pair))] += 1
    return {'island_count': len(records), 'islands': records,
            'material_face_counts': dict(Counter(p.material_index for p in mesh.polygons)),
            'uv_layers': [layer.name for layer in mesh.uv_layers],
            'uv_island_count': uv_island_count(mesh),
            'uv_seam_edges': sum(e.use_seam for e in mesh.edges),
            'boundary_edges': sum(v == 1 for v in edge_faces.values()),
            'nonmanifold_edges': sum(v > 2 for v in edge_faces.values()),
            'has_custom_normals': mesh.has_custom_normals,
            'loose_vertices': sum(not r['faces'] for r in records)}
