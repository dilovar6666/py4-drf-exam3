import fs from 'node:fs';
import assert from 'node:assert/strict';
const directory = 'qa/final-real-world/components';
fs.mkdirSync(directory, {recursive:true});
const target=(await fetch('http://127.0.0.1:9222/json').then(r=>r.json())).find(r=>r.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let id=0; const pending=new Map();
const report={checked:[],exceptions:[],consoleErrors:[],statusErrors:[],navigation:[]};
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')report.exceptions.push(m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')report.consoleErrors.push(m.params.args.map(a=>a.value||a.description).join(' '));if(m.method==='Network.responseReceived'&&m.params.response.status>=400)report.statusErrors.push({url:m.params.response.url,status:m.params.response.status});});
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function until(expression){const start=Date.now();while(Date.now()-start<30000){if(await evaluate(`Boolean(${expression})`))return;await sleep(100);}throw Error('Timeout: '+expression);}
async function click(selector){const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing element');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`${directory}/${name}.png`,Buffer.from(r.data,'base64'));}
try{
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:4174/cars/4'});
 await until('window.__AUTO_ANATOMY_3D__?.components.length===74');
 const components=await evaluate('window.__AUTO_ANATOMY_3D__.components');
 const backend=await evaluate("(async()=>{let url='/api/cars/4/parts/?page_size=100',rows=[];while(url){const r=await fetch(url).then(r=>r.json());rows.push(...r.results);url=r.next;}return rows;})()");
 for(const [index,component] of components.entries()){
  await click('.vehicle-controls button:first-of-type');
  await until("document.querySelectorAll('.component-index > button').length===74");
  const buttonIndex=await evaluate(`[...document.querySelectorAll('.component-index > button')].findIndex(b=>b.querySelector('span').textContent===${JSON.stringify(component.displayName)})`);
  assert.ok(buttonIndex>=0,component.componentId);
  await click(`.component-index > button:nth-of-type(${buttonIndex+1})`);
  await until(`document.querySelector('.component-id')?.textContent===${JSON.stringify(component.componentId)} && !document.querySelector('.component-info [role=status]')`);
  const state=await evaluate("({id:window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId,name:document.querySelector('.component-info h2').textContent,canvasCount:document.querySelectorAll('canvas').length,error:document.querySelector('.component-info [role=alert]')?.textContent})");
  assert.equal(state.id,component.componentId);assert.equal(state.name,backend.find(r=>r.component_id===component.componentId).name);assert.equal(state.canvasCount,1);assert.ok(!state.error);
  report.checked.push({componentId:component.componentId,meshCount:component.meshCount,backendName:state.name});
  if(index===0||component.componentId==='front_left_brake_disc'||index===73)await shot(`selected-${component.componentId}`);
  if(index%15===0)console.log(`Verified ${index+1}/74 real component index selections`);
 }
 await click('.component-info a[href*="/components/"]');
 await until("location.pathname.includes('/components/') && document.querySelector('.component-info--deep')");report.deepLink=await evaluate('location.pathname');
 await click('.component-info button[aria-label="Return to vehicle"]');await until("location.pathname==='/cars/4' && !document.querySelector('.component-info')");
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:4174/cars/4'});await until('window.__AUTO_ANATOMY_3D__?.components.length===74');
 await evaluate('window.scrollTo(0,0)');await until("document.querySelector('.vehicle-controls').textContent.includes('0% disassembled')");
 const assembled=await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()');
 await evaluate('window.scrollTo(0,document.documentElement.scrollHeight-innerHeight)');
 await until("document.querySelector('.vehicle-controls').textContent.includes('100% disassembled')");await shot('native-scroll-full-explode');
 report.nativeScrollFull=true;
 await evaluate('window.scrollTo(0,0)');await until("document.querySelector('.vehicle-controls').textContent.includes('0% disassembled')");await shot('native-scroll-reassembled');
 const reassembled=await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()');assert.deepEqual(reassembled,assembled);report.nativeScrollReverse=true;
 await click('.site-nav a[href="/parts"]');await until("document.querySelector('.part-card') && !window.__AUTO_ANATOMY_3D__ && document.querySelectorAll('canvas').length===0");report.spaDisposed=true;
 await click('.site-nav a[href="/about"]');await until("location.pathname==='/about'");
 await evaluate('history.back()');await until("location.pathname==='/parts' && document.querySelector('.part-card')");report.historyBack=true;
 await evaluate('history.forward()');await until("location.pathname==='/about'");report.historyForward=true;
 for(const route of ['/','/cars','/parts','/about','/admin']){await click(`.site-nav a[href="${route}"]`);await until(`location.pathname===${JSON.stringify(route)} && !document.querySelector('.loading-line')`);report.navigation.push(route);}
 report.loadedScripts=await evaluate("[...document.scripts].map(s=>s.src)");
 report.obsoleteLoaded=await evaluate("performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\\/(main\\.js|labSystem\\.js|styles\\.css)(\\?|$)/.test(n))");assert.deepEqual(report.obsoleteLoaded,[]);
 assert.equal(report.checked.length,74);assert.deepEqual(report.exceptions,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.statusErrors,[]);report.success=true;
}catch(error){report.error=error.stack;process.exitCode=1;await shot('failure').catch(()=>{});}finally{fs.writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({success:report.success,checked:report.checked.length,error:report.error}));socket.close();}
