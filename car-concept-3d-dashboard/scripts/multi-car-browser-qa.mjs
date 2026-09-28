import fs from 'node:fs';
import assert from 'node:assert/strict';
import {preparedVehicles,vehicleConfigs} from '../src/models/vehicleCatalog.js';
const base=process.env.AUTO_ANATOMY_QA_URL||'http://127.0.0.1:4174';
const smoke=process.env.AUTO_ANATOMY_QA_SMOKE==='1';
const directory=process.argv[2]||'qa/multi-car/browser';fs.mkdirSync(directory,{recursive:true});
const target=(await fetch('http://127.0.0.1:9222/json').then(r=>r.json())).find(r=>r.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();const report={base,cars:[],exceptions:[],consoleErrors:[],statusErrors:[],failedRequests:[]};
const requests=new Map();
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
 if(m.method==='Runtime.exceptionThrown')report.exceptions.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.consoleErrors.push(m.params.args.map(a=>a.value||a.description).join(' '));
 if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,m.params.request.url);
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.statusErrors.push({url:m.params.response.url,status:m.params.response.status});
 if(m.method==='Network.loadingFailed'&&!m.params.canceled)report.failedRequests.push({url:requests.get(m.params.requestId),error:m.params.errorText});
});
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression,timeout=90000){const start=Date.now();while(Date.now()-start<timeout){try{if(await evaluate(`Boolean(${expression})`))return;}catch(e){if(!/context|navigation/i.test(e.message))throw e;}await sleep(200);}throw Error('Timeout: '+expression);}
async function navigate(route,expression){await send('Page.navigate',{url:base+route});await sleep(300);await until(expression);}
async function shot(name){await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${directory}/${name}.png`,Buffer.from(r.data,'base64'));}
async function click(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});}
async function pointerClick(p,touch=false){if(touch){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await sleep(200);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});}}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const catalog=await fetch(base+'/api/cars/?page_size=100').then(r=>r.json());
 await navigate('/cars',"document.querySelectorAll('.vehicle-card').length>=6");await shot('catalog-six-prepared-vehicles');
 const selectedVehicles=new Set((process.env.AUTO_ANATOMY_QA_VEHICLES||'').split(',').filter(Boolean));
 const cases=vehicleConfigs.filter(config=>!selectedVehicles.size||selectedVehicles.has(config.id)).map(config=>({config,car:catalog.results.find(car=>car.model_url.endsWith(config.modelPath.split('/').pop()))}));
 for(const {config,car} of cases){
  assert.ok(car,config.id);const count=Object.keys(config.components).length;
  const result={key:config.id,carId:car.id,expectedComponents:count,checked:[]};report.cars.push(result);
  await navigate(`/cars/${car.id}`,`window.__AUTO_ANATOMY_3D__?.components.length===${count}`);await shot(config.id+'-assembled');
  result.performanceAssembled=await evaluate('window.__AUTO_ANATOMY_3D__.getPerformanceSnapshot()');
  result.audit=await evaluate("(()=>{const a=window.__AUTO_ANATOMY_3D__.modelAudit;return {totalMeshCount:a.totalMeshCount,currentMeshCount:a.currentMeshCount,missing:a.components.flatMap(c=>c.missingNodes),lost:a.lostMeshes,unassigned:a.unassignedMeshes}})()");
  assert.deepEqual(result.audit.missing,[]);assert.deepEqual(result.audit.lost,[]);assert.deepEqual(result.audit.unassigned,[]);
  const parts=await fetch(`${base}/api/cars/${car.id}/parts/?page_size=100`).then(r=>r.json());assert.equal(parts.count,count);
  result.explode=await evaluate("(()=>{const a=window.__AUTO_ANATOMY_3D__;a.setExplodeProgress(0);const start=a.getComponentTransforms();a.setExplodeProgress(.5);const mid=a.getComponentTransforms();a.setExplodeProgress(1);const full=a.getComponentTransforms();a.setExplodeProgress(.5);const mid2=a.getComponentTransforms();a.setExplodeProgress(0);const end=a.getComponentTransforms();let reverse=0,deterministic=0;start.forEach((r,i)=>r.position.forEach((v,j)=>{reverse=Math.max(reverse,Math.abs(v-end[i].position[j]));deterministic=Math.max(deterministic,Math.abs(mid[i].position[j]-mid2[i].position[j]));}));return {reverse,deterministic,moved:full.filter((r,i)=>r.position.some((v,j)=>Math.abs(v-start[i].position[j])>1e-6)).length};})()");
  assert.equal(result.explode.reverse,0);assert.equal(result.explode.deterministic,0);
  const before=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:740,y:480,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:880,y:500,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:880,y:500,button:'left',buttons:0});await sleep(200);
  const after=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');result.orbit=before.some((v,i)=>Math.abs(v-after[i])>.01);assert.equal(result.orbit,true);
  await evaluate('window.__AUTO_ANATOMY_3D__.reset();window.__AUTO_ANATOMY_3D__.setExplodeProgress(.5)');await shot(config.id+'-partial');
  await evaluate('window.__AUTO_ANATOMY_3D__.setExplodeProgress(1)');await shot(config.id+'-exploded');
  let pointer=null,pointerId=null;
  for(const key of Object.keys(config.components)){const p=await evaluate(`window.__AUTO_ANATOMY_3D__.getComponentPointerTarget(${JSON.stringify(key)})`);if(p&&p.x>420&&p.x<1200&&p.y>260&&p.y<830){pointer=p;pointerId=key;break;}}
  assert.ok(pointer,'Visible actual Raycaster target');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...pointer});await sleep(200);
  result.hover=await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId');assert.equal(result.hover,pointerId);await shot(config.id+'-hover');
  await pointerClick(pointer);await until(`document.querySelector('.component-id')?.textContent===${JSON.stringify(pointerId)}`);result.selection=pointerId;await shot(config.id+'-selected');
  await click('.component-info button[aria-label="Return to vehicle"]');
  const components=await evaluate('window.__AUTO_ANATOMY_3D__.components');
  for(const component of components.filter(c=>!smoke||['body_shell','engine'].includes(c.componentId))){await click('.vehicle-controls button:first-of-type');await until(`document.querySelectorAll('.component-index > button').length===${count}`);
   const index=await evaluate(`[...document.querySelectorAll('.component-index > button')].findIndex(b=>b.querySelector('span').textContent===${JSON.stringify(component.displayName)})`);
   assert.ok(index>=0);await click(`.component-index > button:nth-of-type(${index+1})`);
   await until(`document.querySelector('.component-id')?.textContent===${JSON.stringify(component.componentId)} && !document.querySelector('.component-info [role=status]')`);
   const info=await evaluate("({id:window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId,name:document.querySelector('.component-info h2').textContent,error:document.querySelector('.component-info [role=alert]')?.textContent})");
   assert.equal(info.id,component.componentId);assert.equal(info.name,parts.results.find(r=>r.component_id===component.componentId).name);assert.ok(!info.error);result.checked.push(component.componentId);
  }
  const deepId=Object.keys(config.components).find(id=>id==='engine')||Object.keys(config.components)[0];
  await navigate(`/cars/${car.id}/components/${deepId}`,`window.__AUTO_ANATOMY_3D__?.getInteractionState().selectedComponentId===${JSON.stringify(deepId)} && document.querySelector('.component-info--deep')`);await shot(config.id+'-deep-link');result.deepLink=true;
  result.performance=await evaluate('window.__AUTO_ANATOMY_3D__.getPerformanceSnapshot()');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await navigate(`/cars/${car.id}`,`window.__AUTO_ANATOMY_3D__?.components.length===${count}`);
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await until("document.querySelector('.vehicle-controls > span:nth-child(2)')?.textContent==='0% disassembled'");
  const initialTransforms=await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()');
  result.scrollCamera={};
  for(const [name,amount] of [['engine',.2],['wheel',.4],['partial',.7],['full',1]]){
    await evaluate(`window.scrollTo({top:${amount}*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'})`);await sleep(350);
    result.scrollCamera[name]=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()');await shot(config.id+'-story-'+name);
  }
  await until("document.querySelector('.vehicle-controls > span:nth-child(2)')?.textContent==='100% disassembled'");
  assert.notDeepEqual(result.scrollCamera.engine,result.scrollCamera.wheel);
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');await until("document.querySelector('.vehicle-controls > span:nth-child(2)')?.textContent==='0% disassembled'");
  assert.deepEqual(await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()'),initialTransforms);result.nativeScrollReverse=true;await shot(config.id+'-reassembled');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate(`/cars/${car.id}`,`window.__AUTO_ANATOMY_3D__?.components.length===${count}`);
  await until("document.querySelector('canvas') && Math.abs(document.querySelector('canvas').clientWidth-innerWidth)<2 && Math.abs(document.querySelector('canvas').clientHeight-innerHeight)<2");
  let touch=null,touchId=null;
  const mobileTargets=[...new Set(['body_shell','engine',...Object.keys(config.components)])].filter(key=>config.components[key]);
  for(const key of mobileTargets){const p=await evaluate(`window.__AUTO_ANATOMY_3D__.getComponentPointerTarget(${JSON.stringify(key)})`);if(p&&p.x>20&&p.x<370&&p.y>270&&p.y<710){touch=p;touchId=key;break;}}
  assert.ok(touch);await pointerClick(touch,true);await until(`window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId===${JSON.stringify(touchId)}`);result.mobileTap=true;
  result.mobileOverflow=await evaluate('document.documentElement.scrollWidth>innerWidth');assert.equal(result.mobileOverflow,false);await shot(config.id+'-mobile-tap');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  console.log(config.id+': '+result.checked.length+' component selections PASS');
  fs.writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));
 }
 assert.deepEqual(report.exceptions,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.statusErrors,[]);
 assert.equal(report.failedRequests.filter(r=>r.url?.startsWith(base)).length,0);
 report.success=true;
}catch(error){report.error=error.stack;process.exitCode=1;await shot('failure').catch(()=>{});}finally{fs.writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({success:report.success,error:report.error,cars:report.cars.map(c=>({key:c.key,checked:c.checked.length}))}));socket.close();}
