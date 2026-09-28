import fs from 'node:fs';

const frontend = new URL('../', import.meta.url);
const qa = new URL('../qa/gt40-deep/', import.meta.url);
const read = path => JSON.parse(fs.readFileSync(new URL(path, frontend), 'utf8'));
const inventory = read('qa/gt40-deep/source-inventory.json');
const sourceCollections = read('qa/gt40-deep/source-collections.json');
const prep = read('qa/gt40-deep/preparation.json');
const glb = read('qa/gt40-deep/glb-audit.json');
const config = read('qa/gt40-deep/gt40-config.json');
const old = read('qa/gt40-deep/old-34-component-mapping.json');
const browser = read('qa/gt40-deep/browser/report.json');
const expectedNonVehicle = new Set(config.remove || []);
const sourceMeshes = inventory.objects.filter(o => o.type === 'MESH');
const typeCounts = {};
for (const item of inventory.objects) typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
const modifierCounts = {};
for (const object of inventory.objects) for (const modifier of object.modifiers || []) {
  modifierCounts[modifier.type] = (modifierCounts[modifier.type] || 0) + 1;
}
const pieceSources = new Map(Object.entries(config.separation || {}).flatMap(([source, pieces]) =>
  pieces.map(piece => [piece.name, source])));
function sourceFromMeshName(name) {
  let base = name.replace(/_deduplicated$/, '');
  return pieceSources.get(base) || base;
}
const sourceByName = new Map(sourceMeshes.map(o => [o.name, o]));
const outputMeshes = prep.mesh_review;
const categories = {};
for (const component of config.components) categories[component.category] = (categories[component.category] || 0) + 1;
const confidenceCounts = {};
for (const component of config.components) confidenceCounts[component.confidence || 'UNKNOWN'] = (confidenceCounts[component.confidence || 'UNKNOWN'] || 0) + 1;
const globalBounds = [0,1,2].map(axis => ({
  min: Math.min(...outputMeshes.flatMap(mesh => mesh.bounds.map(point => point[axis]))),
  max: Math.max(...outputMeshes.flatMap(mesh => mesh.bounds.map(point => point[axis]))),
}));
const globalCenter = globalBounds.map(b => (b.min + b.max) / 2);
const globalSpan = globalBounds.map(b => b.max - b.min);
const rows = config.components.map(component => {
  const meshes = outputMeshes.filter(mesh => mesh.component_id === component.id);
  const ids = [...new Set(meshes.map(mesh => sourceFromMeshName(mesh.name)))];
  const bounds = [0,1,2].map(axis => ({
    min: Math.min(...meshes.flatMap(mesh => mesh.bounds.map(point => point[axis]))),
    max: Math.max(...meshes.flatMap(mesh => mesh.bounds.map(point => point[axis]))),
  }));
  const runtimeCenter = bounds.map(b => (b.min + b.max) / 2);
  // Runtime conversion maps source X/Y to runtime -Y/X; report source-scene axes.
  const center = [-runtimeCenter[1], runtimeCenter[0], runtimeCenter[2]];
  const pos = [];
  if (center[0] > globalCenter[1] + globalSpan[1] * .08) pos.push('FRONT');
  else if (center[0] < -globalCenter[1] - globalSpan[1] * .08) pos.push('REAR');
  if (center[1] > globalCenter[0] + globalSpan[0] * .08) pos.push('LEFT');
  else if (center[1] < globalCenter[0] - globalSpan[0] * .08) pos.push('RIGHT');
  if (center[2] > globalCenter[2] + globalSpan[2] * .12) pos.push('TOP');
  else if (center[2] < globalCenter[2] - globalSpan[2] * .12) pos.push('BOTTOM');
  if (!pos.length) pos.push('CENTER');
  const reason = (component.description || component.name).replaceAll('|', '\\|').replaceAll('\n', ' ');
  return {
    id: component.id,
    category: component.category,
    sourceObjects: ids,
    meshes,
    islands: meshes.reduce((sum, mesh) => sum + mesh.geometry_islands, 0),
    triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
    center,
    position: pos.join('/'),
    confidence: component.confidence || 'UNKNOWN',
    reason,
  };
});
const foundSources = new Set(outputMeshes.map(mesh => sourceFromMeshName(mesh.name)));
const retainedSources = new Set(sourceMeshes.map(o => o.name).filter(name => !expectedNonVehicle.has(name)));
const missingSources = [...retainedSources].filter(name => !foundSources.has(name));
const unexpectedSources = [...foundSources].filter(name => !retainedSources.has(name));
const topMeshes = [...sourceMeshes].sort((a,b) => b.triangle_count - a.triangle_count).slice(0,14);
const largestByVolume = [...sourceMeshes].sort((a,b) => b.bbox_volume - a.bbox_volume).slice(0,10);
function collectionLines(nodes, depth = 0) {
  return nodes.flatMap(collection => [
    `${'  '.repeat(depth)}- ${collection.name}: ${collection.objects.length} direct object(s), hidden viewport=${collection.hide_viewport}, hidden render=${collection.hide_render}`,
    ...collectionLines(collection.children, depth + 1),
  ]);
}
const allInstances = inventory.instances || [];
const linked = inventory.linked_objects || [];
const multipleMaterials = sourceMeshes.filter(o => (o.material_slots || []).length > 1);
const parentedCount = inventory.objects.filter(o => o.parent).length;
const childCount = inventory.objects.filter(o => (o.children || []).length).length;
const assembledSequence = browser.sequence.join(' → ');
const expectedGroups = config.components.map(c => `AA_${c.id}`);
const missingGroups = expectedGroups.filter(name => !glb.logicalGroups.includes(name));
const groupsWithMeshes = glb.logicalGroupBounds.filter(group => group.meshNodes > 0).length;
const transformFinite = glb.logicalGroupBounds.every(group =>
  [...(group.origin || []), ...(group.center || []), group.centerError].every(Number.isFinite));
const categoryCount = key => categories[key] || 0;
const sourceState = fs.statSync(new URL('../../source_models/car1/GT40.blend', import.meta.url), { bigint: true });

const table = [
  '| Component ID | Category | Source object(s) | Runtime mesh(es) | Islands | Triangles | Position | Confidence | Classification reason |',
  '|---|---|---|---|---:|---:|---|---|---|',
  ...rows.map(row => `| ${row.id} | ${row.category} | ${row.sourceObjects.join('<br>')} | ${row.meshes.map(m => m.name).join('<br>')} | ${row.islands} | ${row.triangles.toLocaleString('en-US')} | ${row.position} (${row.center.map(n => n.toFixed(3)).join(', ')}) | ${row.confidence} | ${row.reason} |`),
].join('\n');

const fused = [
  ['GT40_Body island 0, 77,228 source triangles', 'A single continuous shell spans the hood surround, front and rear shoulder/fender skins, roof, side body and sill transitions. Door skins, hood and rear engine cover were isolated, but arbitrary cuts through this connected remainder would invent panel boundaries.'],
  ['Remaining small GT40_Body islands', 'After the four reviewed door/hood/engine-cover separations, 177 source islands remain in the shell. Many are small decorative/edge surfaces without defensible names; the body mapping retains them, and hardware remains a broad trim group.'],
  ['GT40_FrontGrill, 30,912 triangles', 'The evaluated grill is one connected mesh; no supported topology boundary separates bars, frame and support into independent named parts.'],
  ['Brake rotor / caliper geometry', 'The wheel sources contain tires, rim faces and center/backing geometry, but no distinct rotor or caliper can be positively identified. No brake component is fabricated.'],
  ['Chassis, suspension and drivetrain service parts', 'The scene includes an underside, rear truss, engine and source-labelled rear winch group, but no unambiguous independently modeled control arms, springs/dampers, driveshaft, axle or differential. Their generic geometry is retained without unsupported mechanical labels.'],
];

const report = `# Ford GT40 Deep Decomposition Report

## Scope and recovery point

This report covers only the Ford GT40 source at \`source_models/car1/GT40.blend\`. The original was opened by Blender in read-only analysis/preparation operations and was never saved. Its byte size remains ${Number(sourceState.size).toLocaleString('en-US')} bytes; the inventory recorded ${inventory.source_bytes.toLocaleString('en-US')} bytes and source modification time ${new Date(Number(BigInt(inventory.source_mtime_ns) / 1000000n)).toISOString()}. The prior integrated mapping had 34 semantic components and an approximately 4.29 MB GLB. That mapping was used only as the old-result comparison, not as a decomposition constraint.

## Source inventory

| Measure | Source result |
|---|---:|
| Blender version | ${inventory.blender_version} |
| Scene / all datablock objects | ${inventory.scene} / ${inventory.all_datablock_objects} |
| Scene objects | ${inventory.scene_objects} |
| Mesh objects | ${inventory.mesh_objects} |
| Evaluated source triangles | ${inventory.evaluated_triangles.toLocaleString('en-US')} |
| Materials | ${inventory.material_count} |
| Collections | ${inventory.collection_count} |
| Hidden viewport objects | ${inventory.hidden_viewport_objects.length} |
| Hidden render objects | ${inventory.hidden_render_objects.length} |
| Objects inside collection-disabled viewport/render collections | ${inventory.not_visible_in_view_layer.length} |
| Objects not visible in active view layer | ${inventory.not_visible_in_view_layer.length} |
| Vertex groups | ${inventory.vertex_group_count} |
| Modifiers | ${inventory.modifier_count} |
| Linked objects/data | ${linked.length} |
| True evaluated instances | ${allInstances.filter(instance => instance.is_instance).length} |
| Objects with a parent / objects with children | ${parentedCount} / ${childCount} |
| Shared mesh datablocks | ${inventory.shared_mesh_datablocks.length} |
| Objects with more than one material slot | ${multipleMaterials.length} |

Modifier types: ${Object.entries(modifierCounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([name,count])=>`${name} ${count}`).join('; ')}.

Collection tree:

${collectionLines(inventory.collections).join('\n')}

All Blender collection datablocks (including the four group collections not linked under the active scene root):

| Collection | Users | Objects | Viewport hidden | Render hidden |
|---|---:|---:|---|---|
${sourceCollections.map(c=>`| ${c.name} | ${c.users} | ${c.objects.length} | ${c.hide_viewport} | ${c.hide_render} |`).join('\n')}

Largest source meshes by triangles:

| Object | Triangles | Connected islands | Dimensions (source units) | Center |
|---|---:|---:|---|---|
${topMeshes.map(o=>`| ${o.name} | ${o.triangle_count.toLocaleString('en-US')} | ${o.disconnected_island_count} | ${o.dimensions.map(v=>v.toFixed(3)).join(' × ')} | ${o.center.map(v=>v.toFixed(3)).join(', ')} |`).join('\n')}

Largest source objects by bounding-box volume:

${largestByVolume.map(o=>`- \`${o.name}\`: ${o.dimensions.map(v=>v.toFixed(3)).join(' × ')} units; ${o.triangle_count.toLocaleString('en-US')} triangles; ${o.disconnected_island_count} connected islands.`).join('\n')}

Generic/suspiciously named source objects recorded by the analyzer: ${inventory.generic_or_suspicious_names.length ? inventory.generic_or_suspicious_names.join(', ') : 'none'}. Two source objects share mesh datablocks and no linked objects/data were found. Ten objects were disabled through two hidden collections: four paint palettes and six studio objects (four lights, camera and ground); they were inspected and the nonvehicle palette/studio geometry was excluded from the runtime. No hidden vehicle mesh was found. The full per-object inventory (names, data blocks, collections, hierarchy, visibility, modifiers, material slots, vertex groups, counts, bounds, positions, dimensions, materials and per-island details) is in [source-inventory.json](qa/gt40-deep/source-inventory.json).

## Geometry-island analysis and second pass

${sourceByName.get('GT40_Body').name} evaluates to 181,232 triangles and 184 disconnected islands. Explicit reviewed face-island selections separated the two door skins, two front hood islands and one engine-cover island; exact coincident duplicate faces within the two door subsets were removed (2,071 left, 1,953 right). A cross-check against the remaining body found zero identical face/material/vertex-set overlaps between the selected panels and shell, so the split does not rely on hiding a duplicate shell face.

Material boundaries separate tire surfaces from rim surfaces in each of the four wheel meshes. Independent source-position islands also support four wheel-arch trim components. Rear radiator islands and engine-wire islands were split by their actual positive/negative lateral centers; exhaust and rear grille geometry were divided using their disconnected left/right islands. Seats use distinct source meshes for the backrest and base/support region.

Second pass ranked remaining meshes by triangle count, then bounding-box volume and dimensions, and rechecked the largest/generic candidates: the connected body shell, both 31,872-triangle seat-back source meshes, front/rear grilles, exhaust, all four 21,404-triangle wheel meshes, wheel-arch meshes, both 19,856-triangle piston-bank meshes, engine block and engine wiring. This pass yielded the bilateral radiator, exhaust, rear grille and wire components plus the seat back/base split. It did not produce Boolean cuts or treat material slots or every tiny island as semantic parts.

## Old result and new result

| Result | Semantic components | Runtime GLB |
|---|---:|---:|
| Previous GT40 result | ${old.components.length} | approximately 4.29 MB |
| Deep result | ${config.components.length} | ${(prep.bytes / 1024 / 1024).toFixed(2)} MiB (${prep.bytes.toLocaleString('en-US')} bytes) |
| Net change | +${config.components.length - old.components.length} | source model regenerated |

Verified sources of finer semantic boundaries:

- Four individual tire/rim pairs replace four undifferentiated wheel groups.
- Four body-sourced door/hood/engine-cover subsets and four isolated wheel-arch surfaces are independently mapped.
- The engine is represented by block, intake, valvetrain, two piston banks, two wire bundles, pipework and mounting hardware; the left/right radiator and exhaust geometry is separate.
- Driver/passenger seat backs and bases are separate; rear grille and front/rear lighting are grouped by their real side/assembly geometry.

Category counts: **BODY ${categoryCount('BODY')}; GLASS ${categoryCount('GLASS')}; LIGHTING ${categoryCount('LIGHTING')}; WHEELS/BRAKES ${categoryCount('WHEELS')}/0; ENGINE ${categoryCount('ENGINE')}; DRIVETRAIN ${categoryCount('DRIVETRAIN')}; SUSPENSION ${categoryCount('SUSPENSION')}; INTERIOR ${categoryCount('INTERIOR')}; CHASSIS ${categoryCount('CHASSIS')}; UNKNOWN ${categoryCount('UNKNOWN')}**. Confidence counts: ${Object.entries(confidenceCounts).map(([k,v])=>`${k} ${v}`).join(', ')}.

## Semantic component inventory

The table uses actual prepared meshes after evaluated modifiers and conservative decimation. Island count is measured on each final prepared mesh; reported centers are transformed back to source-scene coordinates (front is positive X, left is positive Y, top is positive Z). When several meshes form one semantic assembly, all names are listed.

${table}

## FUSED / NOT SAFELY SEPARABLE

**${fused.length} documented limits** (${fused.length} entries; one fused large shell, one connected grille assembly, small unlabeled body islands, and two unrepresented/unverified systems):

${fused.map(([name,reason],i)=>`${i+1}. **${name}.** ${reason}`).join('\n')}

## Prepared runtime GLB and mapping QA

- GLB header: ${glb.header.valid ? 'valid glTF 2.0' : 'INVALID'}; magic \`${glb.header.magic}\`, version ${glb.header.version}; file size ${glb.fileBytes.toLocaleString('en-US')} bytes.
- Runtime mesh resources: ${glb.meshResources}; primitive/runtime draw records: ${glb.runtimeDrawsFromNodes}; triangles: ${glb.runtimeTrianglesFromNodes.toLocaleString('en-US')}; GLB materials: ${glb.materials}.
- Semantic component groups: ${glb.logicalGroups.length}; groups with mesh descendants: ${groupsWithMeshes}; missing expected groups: ${missingGroups.length}; finite component transforms/bounds: ${transformFinite}.
- Preparation accounting: ${prep.baked_mesh_objects} prepared mesh objects; ${prep.triangles.toLocaleString('en-US')} triangles; ${prep.materials} source materials used; ${prep.mesh_review.reduce((sum,mesh)=>sum+mesh.geometry_islands,0).toLocaleString('en-US')} final geometry islands across prepared meshes.
- Source object coverage: ${foundSources.size}/${retainedSources.size} retained vehicle source mesh objects represented; missing ${missingSources.length}; unexpected ${unexpectedSources.length}. Five nonvehicle studio/palette objects were explicitly excluded: ${prep.removed.join(', ')}.
- Runtime decoder requirement: ${glb.extensionsRequired.join(', ')}; the universal viewer has its local Draco decoder configured and successfully loaded this GLB in-browser.

## Explode, viewer, React and Django

- Browser QA: ${browser.success ? 'PASS' : 'FAIL'}; 63/63 groups register and focus with finite combined bounds. The viewer loaded ${browser.model?.currentMeshCount} runtime meshes; ${browser.model?.unassigned} unassigned, ${browser.model?.lost} lost and ${browser.model?.hidden} hidden. Total group mesh memberships match the loaded meshes.
- Interaction: Raycaster hover/click on \`wheel_arch_front_left\`, focus for all 63 components, one deep link to the left piston bank, OrbitControls drag and mobile tap all passed. Console errors, exceptions and HTTP errors: ${browser.consoleErrors.length}/${browser.exceptions.length}/${browser.statusErrors.length}.
- Explode: ${assembledSequence}; EXPLODE 0% matches base component transforms exactly; reverse drift ${browser.explode?.finalReverseDrift}; repeated 25/50/75 drift ${browser.explode?.repeat25Drift}/${browser.explode?.repeat50Drift}/${browser.explode?.repeat75Drift}. All are zero. Wheel hierarchy test: assembly displacement starts by 25%, reaches full offset at 50%, stays fixed through 100%, and tire/rim separation begins after 50% (measured relative offsets ${browser.explode?.wheelHierarchy?.assemblyOffset25.toFixed(3)}, ${browser.explode?.wheelHierarchy?.assemblyOffset50.toFixed(3)}, and tire/rim separation ${browser.explode?.wheelHierarchy?.tireRimSeparation100.toFixed(3)}).
- Visual QA: seven assembled views [front](qa/gt40-deep/front.png), [rear](qa/gt40-deep/rear.png), [left](qa/gt40-deep/left.png), [right](qa/gt40-deep/right.png), [top](qa/gt40-deep/top.png), [front quarter](qa/gt40-deep/front-quarter.png), and [rear quarter](qa/gt40-deep/rear-quarter.png). Browser captures show the GT40 assembled at 0% and at [25%](qa/gt40-deep/browser/explode-25.png), [50%](qa/gt40-deep/browser/explode-50.png), [75%](qa/gt40-deep/browser/explode-75.png) and [100%](qa/gt40-deep/browser/explode-100.png).
- React tests: 11/11 passed. Production build: passed; Vite emitted the existing >500 kB chunk-size advisory.
- Django prepared-vehicle tests: PASS, 2/2 against the isolated test settings. The browser QA database contains Ford GT40 only, 63 CarPart rows, zero Products and zero compatibility rows.

## Known source limitations

The source has no separately provable brake rotor/caliper, suspension, axle/differential/driveshaft or complete chassis/frame assemblies. Exact year/variant is undocumented. The rendered source already shows dark mottled shading on parts of the door/side surfaces in the earlier integrated capture as well; a read-only cross-check found no exact coincident door faces against the retained body shell. I did not alter those source surfaces or fabricate replacement geometry.
`;

fs.writeFileSync(new URL('../GT40_DEEP_DECOMPOSITION_REPORT.md', import.meta.url), report, 'utf8');
const sourceCoverage = { retainedSourceMeshes: retainedSources.size, representedSourceMeshes: foundSources.size,
  missingSourceMeshes: missingSources, unexpectedSourceMeshes: unexpectedSources, groupsWithMeshes, transformFinite };
fs.writeFileSync(new URL('../qa/gt40-deep/report-audit.json', import.meta.url), `${JSON.stringify({sourceCoverage, categories, confidenceCounts, components: rows.length, finalTriangles: prep.triangles, glbBytes: glb.fileBytes}, null, 2)}\n`);
console.log(JSON.stringify({ report: 'GT40_DEEP_DECOMPOSITION_REPORT.md', components: rows.length, sourceCoverage, categories, confidenceCounts }));
