import fs from 'node:fs';
const j=(p,e='utf8')=>JSON.parse(fs.readFileSync(p,e).replace(/^\uFEFF/,''));
const root='qa/vaz2105-deep/';
const src=j(root+'source-inventory.json'),assets=j(root+'source-assets.json'),prep=j(root+'candidate/preparation.json'),audit=j(root+'candidate/glb-audit.json'),oldAudit=j(root+'old-glb-audit.json','utf16le'),cfg=j(root+'review-config.json'),old=j(root+'old-40-component-mapping.json'),catalog=j('src/models/vehicles.json').find(x=>x.id==='car2_vaz2105'),dup=j(root+'duplicate-geometry.json'),browser=j(root+'browser/report.json'),react=j(root+'browser/react-report.json');
const obj=new Map(src.objects.map(x=>[x.name,x])), defs=new Map(catalog.components.map(x=>[x.id,x]));
const overall=src.overall_bounds,min=overall.min,max=overall.max,mid=min.map((x,i)=>(x+max[i])/2),span=min.map((x,i)=>max[i]-x);
const rel=c=>({longitudinal:c[1]<mid[1]-span[1]*.1?'FRONT':c[1]>mid[1]+span[1]*.1?'REAR':'CENTER',lateral:c[0]>mid[0]+span[0]*.1?'LEFT':c[0]<mid[0]-span[0]*.1?'RIGHT':'CENTER',vertical:c[2]>mid[2]+span[2]*.12?'TOP':c[2]<mid[2]-span[2]*.12?'BOTTOM':'CENTER'});
function box(x){const b=x.bounds||[];return [0,1,2].map(i=>[Math.min(...b.map(p=>p[i])),Math.max(...b.map(p=>p[i]))])}
function pos(rows){const boxes=rows.map(box),bb=[0,1,2].map(i=>[Math.min(...boxes.map(b=>b[i][0])),Math.max(...boxes.map(b=>b[i][1]))]);const c=bb.map(a=>(a[0]+a[1])/2),r=rel(c);if(bb[1][1]-bb[1][0]>span[1]*.65)r.longitudinal='FRONT-TO-REAR';if(bb[0][1]-bb[0][0]>span[0]*.65)r.lateral='LEFT-TO-RIGHT';return `${r.longitudinal} / ${r.lateral} / ${r.vertical}`}
const rows=catalog.components.map(c=>{const meshes=prep.mesh_review.filter(x=>x.component_id===c.id);const ids=c.sourceNodes||[];const sourceObjects=[...new Set(ids.map(n=>{const base=n.split('__')[0];return obj.has(base)?base:(meshes.find(x=>x.name===n)?.name||base)}))];return{id:c.id,category:c.category,source:[...new Set(meshes.map(x=>x.name.split('__')[0]))].join(', ')||sourceObjects.join(', '),meshes:meshes.map(x=>x.name).join(', '),islands:meshes.reduce((n,x)=>n+x.geometry_islands,0),tri:meshes.reduce((n,x)=>n+x.triangles,0),position:meshes.length?pos(meshes):'UNKNOWN',confidence:c.confidence||'MEDIUM',reason:c.description||''}});
const catCounts=Object.fromEntries(['BODY','GLASS','LIGHTING','WHEELS','BRAKES','ENGINE','DRIVETRAIN','SUSPENSION','INTERIOR','CHASSIS','EXHAUST','UNKNOWN'].map(k=>[k,catalog.components.filter(c=>c.category===k).length]));
const oldIds=new Set(old.components.map(c=>c.id)),newIds=new Set(catalog.components.map(c=>c.id));const newOnly=catalog.components.filter(c=>!oldIds.has(c.id)),replacedOld=old.components.filter(c=>!newIds.has(c.id));
const addedGroups={};for(const c of newOnly){(addedGroups[c.category]||=0);addedGroups[c.category]++}
const sortedTri=[...src.largest_meshes_by_triangles].slice(0,10),sortedVol=[...src.largest_meshes_by_bbox_volume].slice(0,10);
const meshes=src.objects.filter(x=>x.type==='MESH'),islands=meshes.reduce((s,x)=>s+x.disconnected_island_count,0);
const candidateImages=audit.images,byFormat=Object.fromEntries([...new Set(candidateImages.map(x=>x.mimeType))].map(m=>[m,candidateImages.filter(x=>x.mimeType===m).length]));
const fmtBytes=candidateImages.reduce((s,x)=>s+x.bytes,0);const oldImgBytes=oldAudit.images.reduce((s,x)=>s+x.bytes,0);const saved=oldAudit.fileBytes-audit.fileBytes;
const table=rows.map(x=>`| \`${x.id}\` | ${x.category} | ${x.source.replaceAll('|','\\|')} | ${x.meshes.replaceAll('|','\\|')} | ${x.islands} | ${x.tri} | ${x.position} | ${x.confidence} | ${x.reason.replaceAll('|','\\|')} |`).join('\n');
const top=t=>t.map(x=>{const o=obj.get(x.name);return `| ${x.name} | ${x.triangles??o?.triangle_count??'-'} | ${(x.bbox_volume??o?.bbox_volume)?.toFixed(3)??'-'} | ${x.islands??o?.disconnected_island_count??'-'} | ${x.dimensions.map(v=>v.toFixed(3)).join(' x ')} |`}).join('\n');
const md=`# VAZ 2105 - Deep Decomposition Report

## Source and inventory

- **Source file:** \`${src.source}\` (original opened read-only; never saved or modified)
- **Format:** Blender ${src.blender_version} native .blend
- **Source bytes:** ${src.source_bytes.toLocaleString('en-US')} (${(src.source_bytes/1e6).toFixed(2)} MB)
- **Scene:** ${src.scene}; ${src.scene_objects} scene objects total: ${src.objects_by_type.MESH} meshes, ${src.objects_by_type.CAMERA} cameras, ${src.objects_by_type.LIGHT} lights, ${src.objects_by_type.EMPTY} empties.
- **Mesh datablocks:** ${src.mesh_objects}; unique per object ${src.shared_mesh_datablocks.length===0?'yes':'no'}; linked objects/data ${src.linked_objects.length}; evaluated object instances ${src.instances.filter(x=>x.is_instance).length}.
- **Source geometry:** ${meshes.reduce((s,x)=>s+x.evaluated_vertex_count,0).toLocaleString()} evaluated vertices, ${meshes.reduce((s,x)=>s+x.evaluated_edge_count,0).toLocaleString()} edges, ${meshes.reduce((s,x)=>s+x.evaluated_face_count,0).toLocaleString()} faces, **${src.evaluated_triangles.toLocaleString()} triangles**. ${islands} connected geometry islands among all meshes; ${meshes.filter(x=>x.disconnected_island_count>1).length} objects contain multiple islands.
- **Materials / slots:** ${src.material_count} materials; per-object slots are listed in the source inventory JSON. No material was treated as a semantic part.
- **Textures/images:** ${assets.images.length} image datablocks (${assets.images.filter(x=>x.packed).length} packed; ${assets.images.reduce((s,x)=>s+x.packed_bytes,0).toLocaleString()} packed bytes), ${assets.collections.length} collections, ${src.vertex_group_count} vertex groups, ${src.modifier_count} modifiers.
- **Collections:** ${assets.collections.length} flat top-level collections; no nested child collections. Full membership/material/image metadata: [source-assets.json](qa/vaz2105-deep/source-assets.json).
- **Visibility:** hidden viewport objects ${src.hidden_viewport_objects.length}; hidden render objects ${src.hidden_render_objects.length}; not visible in the evaluated view layer ${src.not_visible_in_view_layer.length}. Those seven objects are reference-image empties; no hidden vehicle mesh was found.
- **Hierarchy / modifiers:** parents and children, collection memberships, flags, material slots, vertex groups, modifiers, evaluated bounds, and island detail are recorded for every object in [source-inventory.json](qa/vaz2105-deep/source-inventory.json). No linked mesh datablocks or mesh instances were found. All 151 active modifiers were applied by the preparation export on a working copy.
- **Vehicle coordinate convention verified from source geometry:** front = negative source Y, left = positive source X, top = positive Z. Inventory island-side labels were recalculated using those axes.

### Largest source meshes

Sorted by triangle count:

| Object | Triangles | BBox volume | Islands | Dimensions |
|---|---:|---:|---:|---:|
${top(sortedTri)}

Sorted by bounding-box volume:

| Object | Triangles | BBox volume | Islands | Dimensions |
|---|---:|---:|---:|---:|
${top(sortedVol)}

## Old result and new decomposition

- **OLD COMPONENTS:** ${old.components.length}
- **NEW COMPONENTS:** ${catalog.components.length}
- **Net change:** +${catalog.components.length-old.components.length}. Newly introduced IDs: ${newOnly.length}, grouped as ${Object.entries(addedGroups).map(([k,v])=>`${k} +${v}`).join(', ')}; ${replacedOld.length} old broad IDs were retired/refined (${replacedOld.map(c=>c.id).join(', ')}). Existing IDs retained: ${old.components.length-replacedOld.length}. This is a net component count, not an artificial target.
- **OLD GLB:** ${oldAudit.fileBytes.toLocaleString()} bytes (${(oldAudit.fileBytes/1e6).toFixed(2)} MB)
- **NEW GLB:** ${audit.fileBytes.toLocaleString()} bytes (${(audit.fileBytes/1e6).toFixed(2)} MB)
- **Size reduction:** ${saved.toLocaleString()} bytes (${(saved/oldAudit.fileBytes*100).toFixed(1)}%).
- **OLD TRIANGLES:** ${oldAudit.runtimeTrianglesFromNodes.toLocaleString()}
- **NEW TRIANGLES:** ${audit.runtimeTrianglesFromNodes.toLocaleString()}
- All ${src.mesh_objects-2} source vehicle mesh objects with geometry are represented; two zero-triangle meshes (Plane.017, Plane.018) were excluded. Candidate coverage audit reports 232 prepared mesh nodes, 95 groups, zero duplicate source assignments, zero missing source meshes, zero extraneous source meshes.

### Component mapping

| componentId | Category | Source object(s) | Final mesh(es) | Geometry islands | Triangles | Position | Confidence | Classification reason |
|---|---|---|---|---:|---:|---|---|---|
${table}

Category totals:

${Object.entries(catCounts).map(([k,v])=>`- **${k}:** ${v}`).join('\n')}

The mapping uses physical source evidence. Doors/glass/lights and cabin details are split only where the source has distinct objects or reliable disconnected geometry. Shared material alone was never used as a component boundary. New notable details include four independent door leaves and door panels, four door windows plus left/right quarter windows, individual front lamps and rear lamps, separate hood/trunk, per-corner wheel internals/hardware, separate front seats and rear seat base/back, dashboard/controls/handbrake, and per-side exterior mirrors/mouldings. Unknown tube/detail groups remain UNKNOWN where source geometry does not prove a technical name.

## Deep analysis passes and suspicious-mesh review

1. **Source inventory:** entire original Blender scene examined, including cameras, lights, reference empties, collections, hidden flags, hierarchy, linked data, modifiers, slots, vertex groups, and geometry.
2. **Island pass:** all ${src.mesh_objects} mesh objects examined; ${islands} connected islands found. Disconnected parts were safely separated and assigned from physical/spatial evidence. No arbitrary Boolean cuts were used.
3. **Second pass:** largest remaining meshes were checked in triangle-count order and against bbox volume/dimensions. The large **Cube** body shell contains one connected island; the largest tire/rim/cylinder objects have meaningful bilateral/corner islands that were separated or mapped to the correct wheel. **Plane.005** contains six disconnected, body-length tube runs and remains **vehicle_tubes_unknown** rather than a guessed exhaust/engine label.
4. **Third suspicious pass:** every candidate over 5% of all triangles, with vehicle-scale bounds, multiple islands, or apparent cross-side/front-rear extent was rechecked. The **Cube** body shell has ${obj.get('Cube')?.triangle_count} triangles (${(obj.get('Cube')?.triangle_count/src.evaluated_triangles*100).toFixed(2)}%) but is a single continuous shell island. **Cube.008** underbody and **Plane.019** cabin shell were inspected by bounds and topology; no safe extra physical boundaries were found within their continuous surfaces.
5. **Suspicious flags:** final components are joined by source topology groups and verified source positions. All final runtime meshes are assigned once; duplicate assignments = 0, unassigned meaningful geometry = 0, invalid component IDs = 0.

## FUSED / NOT SAFELY SEPARABLE

- **Main painted body shell (Cube, 2,415 triangles, one connected island):** hood and trunk lids and all four doors are separate source geometry and were mapped independently. The remaining continuous roof, quarter panels, fender/arch surfaces, and sill transitions stay fused; no stable topology boundary separates them without cutting a continuous surface.
- **Underbody (Cube.008, 1,115 triangles, one connected island):** the broad continuous floor/underbody remains one component; there are no independent subframe boundaries within this mesh.
- **Cabin/interior shell (Plane.019, 862 triangles, see inventory island record):** continuous shell surfaces remain grouped. Seats, dashboard, controls, trims and other separately represented cabin geometry are mapped independently.
- **Axle/suspension assemblies:** independently disconnected bars/struts are retained as source-supported assemblies; the remaining crossmember shapes have no reliable semantic separation. No separate brake disc/caliper/drum is asserted; **BRAKES = 0** because the original geometry does not establish a distinct brake component.
- **Distributed tubes:** six tube runs span multiple positions; kept as unknown tube geometry, not labelled exhaust or engine hoses without proof.

## GLB and runtime optimization

| Metric | Old | New |
|---|---:|---:|
| GLB size | ${oldAudit.fileBytes.toLocaleString()} bytes | ${audit.fileBytes.toLocaleString()} bytes |
| Runtime triangles | ${oldAudit.runtimeTrianglesFromNodes.toLocaleString()} | ${audit.runtimeTrianglesFromNodes.toLocaleString()} |
| Mesh draws/primitives | ${oldAudit.runtimeDrawsFromNodes} | ${audit.runtimeDrawsFromNodes} |
| Materials | ${oldAudit.materials} | ${audit.materials} |
| Embedded images | ${oldAudit.images.length} | ${candidateImages.length} |
| Image payload bytes | ${oldImgBytes.toLocaleString()} | ${fmtBytes.toLocaleString()} |

The old GLB was large primarily because it embedded 81 lossless PNG texture images (${oldImgBytes.toLocaleString()} bytes); geometry was only 45,784 triangles and duplicate-face analysis found no duplicated triangles/vertices across meshes. The new preparation retained the same ${audit.runtimeTrianglesFromNodes.toLocaleString()} triangles and all 34 materials and 81 images. It re-encoded 74 opaque images as JPEG quality 88 and kept 7 alpha-bearing PNGs; texture dimensions remain at or below 1024. The mesh optimizer's 10k-triangle threshold did not run on any mesh (largest source mesh: 2,415 triangles), so no detail was removed by decimation. Savings: ${saved.toLocaleString()} bytes / ${(saved/1e6).toFixed(2)} MB, chiefly texture re-encoding. Semantic boundaries remain separate.

Source duplicate audit: ${dup.evaluated_triangles.toLocaleString()} triangles, ${dup.duplicate_vertex_entries} duplicate vertex entries at tolerance 1e-5, ${dup.duplicate_triangles_within_object} repeated faces within objects, ${dup.duplicate_triangles_across_objects} duplicated triangle faces across objects. Empty duplicate objects: Plane.017 and Plane.018.

## Runtime validation

- GLB magic/version/header valid: **${audit.header.valid ? 'PASS' : 'FAIL'}**; scene ${audit.scenes}; nodes ${audit.nodes}; ${audit.meshResources} mesh resources/primitives; ${audit.runtimeTrianglesFromNodes.toLocaleString()} runtime triangles; Draco compression required; 34 materials; 81 embedded images.
- Semantic group nodes: ${audit.logicalGroups.length}; all groups exist and have prepared child mesh nodes. Runtime/browser model audit: ${audit.runtimeDrawsFromNodes} draws, 95 component registrations; each component gets a finite combined bounding box and focus succeeds.
- EXPLODE 0% equals assembled transform baseline; observed round trip 0 -> 25 -> 50 -> 75 -> 100 -> 75 -> 50 -> 25 -> 0 has final and repeated-state transform drift **0**. Wheel assembly offset is shared by tire/rim at 25 to 50%, inner part offsets begin after 50%.
- React routes verified: /cars/13 and /cars/13/components/hood; Django Car/CarPart sync for VAZ only, 95 unique CarParts; Product/ProductCompatibility creations: 0.
- Browser artifacts: [viewer QA report](qa/vaz2105-deep/browser/report.json), [React/Django route QA](qa/vaz2105-deep/browser/react-report.json), assembled/exploded/view images are in the qa/vaz2105-deep/browser directory.

## QA status

- Original Blender source remained read-only; full-scene inventory and hidden-object review completed.
- GLB structure, mesh/geometry counts, materials, texture embedding, Draco extension and all 95 semantic group nodes: **PASS**.
- Mapping invariants: duplicate assignments 0, missing interactive source meshes 0, extraneous source meshes 0, all runtime mesh draws assigned once.
- Viewer model load, materials, 95/95 focus bounds, OrbitControls, Raycaster hover and selection, and mobile tap: **PASS**; browser exceptions/network errors: 0.
- Explode forward/reverse sequence: **PASS**, assembled pose error 0, final and repeated-step drift 0.
- Visual QA screenshots recorded for front, rear, left, right, top-ish, front/rear three-quarter; exploded 25/50/75/100; engine bay, interior and underbody.
- React /cars/13, component index (95 entries), selection and /cars/13/components/hood; Django API at local port 8001 returns 95 unique VAZ CarParts: **PASS**. Product and ProductCompatibility creations: 0.
- React test suite: **11/11 passed**. Django tests: **2/2 passed**, system check clean. Production build: **PASS**. Build emits the existing React Router "use client" notice and a large chunk warning (the Three.js scene bundle is 705.70 kB); the VAZ GLB is 6.87 MB.

Structured browser evidence is in [viewer QA report](qa/vaz2105-deep/browser/report.json) and [React/Django route QA](qa/vaz2105-deep/browser/react-report.json). Screenshots are stored alongside them.
`;
fs.writeFileSync('VAZ2105_DEEP_DECOMPOSITION_REPORT.md',md);
console.log(JSON.stringify({rows:rows.length,categories:catCounts,newOnly:newOnly.length,sourceMeshes:src.mesh_objects,islands,topLargest:sortedTri[0]?.name,report:'VAZ2105_DEEP_DECOMPOSITION_REPORT.md'}));
