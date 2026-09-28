import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {preparedVehicles,vehicleConfigs,getVehicleConfig} from '../src/models/vehicleCatalog.js';
import {storyPose} from '../src/three/story.js';
import {resolveVehicleModelUrl} from '../src/three/modelUrl.js';

for(const definition of preparedVehicles) test(`${definition.id}: independent exhaustive semantic hierarchy`,()=>{
 const bytes=fs.readFileSync(new URL('../assets/models/'+definition.file,import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const config=getVehicleConfig({model_url:'http://localhost:4173/assets/models/'+definition.file});
 assert.equal(config.id,definition.id);
 assert.equal(Object.keys(config.components).length,definition.components.length);
 assert.notEqual(definition.components.length,74);
 const sourceNames=definition.components.flatMap(c=>c.sourceNodes);
 assert.equal(new Set(sourceNames).size,sourceNames.length);
 assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
 for(const component of definition.components){
   assert.match(component.id,/^[a-z][a-z0-9_]+$/);
   const node=gltf.nodes.find(n=>n.name==='AA_'+component.id);
   assert.ok(node,component.id);assert.ok(node.children?.length,component.id);
   assert.equal(node.extras.componentId,component.id);
 }
 assert.ok(gltf.images.length>0);
 assert.equal(storyPose(1,config.storyStages).explode,1);
 assert.equal(storyPose(0,config.storyStages).explode,0);
 assert.equal(resolveVehicleModelUrl('http://localhost:4173/assets/models/'+definition.file,'http://localhost:4174'),config.modelPath);
});
test('unknown models never acquire Audi mappings',()=>{
 assert.equal(getVehicleConfig({model_url:'https://example.org/unprepared.glb'}),null);
 assert.equal(getVehicleConfig({model_url:'/assets/models/AudiR8.glb'}).components,vehicleConfigs[0].components);
});
