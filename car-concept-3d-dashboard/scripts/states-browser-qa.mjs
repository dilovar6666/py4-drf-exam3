import fs from 'node:fs';
import assert from 'node:assert/strict';
const target = (await fetch('http://127.0.0.1:9222/json').then(r=>r.json())).find(r=>r.type==='page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=1;const pending=new Map();let held=null;const exceptions=[];
socket.addEventListener('message', e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Fetch.requestPaused')held=m.params.requestId;if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=id++;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;}
async function until(expression){const start=Date.now();while(Date.now()-start<30000){try{if(await evaluate(`Boolean(${expression})`))return;}catch{}await sleep(200);}throw new Error(expression);}
async function shot(name){await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`qa/react-light/${name}.png`,Buffer.from(r.data,'base64'));}
async function navigate(route,condition){await send('Page.navigate',{url:`http://127.0.0.1:4174${route}`});await sleep(300);await until(condition);}
async function stage(progress,name){await evaluate(`window.scrollTo(0,${progress}*(document.documentElement.scrollHeight-innerHeight))`);await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await evaluate(`window.__AUTO_ANATOMY_3D__.setStoryProgress(${progress})`);await shot(name);}
const report={exceptions};
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Fetch.enable',{patterns:[{urlPattern:'*AudiR8.glb*'}]});
  await navigate('/cars/4',"document.querySelector('.vehicle-loading')");await until('document.querySelector(".vehicle-loading")');await shot('loading-vehicle');
  if(held)await send('Fetch.continueRequest',{requestId:held});await send('Fetch.disable');
  await until('window.__AUTO_ANATOMY_3D__?.components.length===74');
  await stage(.2,'engine-close-up');
  report.performanceCamera=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()');assert.ok(report.performanceCamera.position[2]<0);
  await stage(.4,'brake-close-up');
  await stage(.68,'partial-explode');
  await stage(1,'full-explode');
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});
  await stage(0,'tablet-audi');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await navigate('/cars/4','window.__AUTO_ANATOMY_3D__?.components.length===74');await shot('mobile-audi');
  const p=await evaluate("window.__AUTO_ANATOMY_3D__.getComponentPointerTarget('front_left_tire')");assert.ok(p);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await until("window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId==='front_left_tire'");await sleep(1300);await shot('mobile-tap');report.mobileTap=true;
  report.touchScroll=await evaluate("document.querySelector('canvas').style.touchAction");assert.equal(report.touchScroll,'pan-y');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/cars/4','window.__AUTO_ANATOMY_3D__?.components.length===74');
  const before=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');await stage(1,'mobile-reduced-motion');
  const after=await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');assert.ok(before.every((v,i)=>Math.abs(v-after[i])<1e-8));report.reducedMotion=true;
  await navigate('/parts?sku=NO_SUCH_CATALOG_REFERENCE',"document.querySelector('.state-view')&&!document.querySelector('.loading-line')");await shot('empty-parts');
  await navigate('/parts/999999999',"document.querySelector('.state-view--error')");await shot('not-found-product');
  await navigate('/cars/1/components/engine',"document.querySelector('.static-vehicle-page .component-info')&&!document.querySelector('.component-info p[role=status]')");await shot('catalog-component');report.nonAudiComponent=true;
  assert.equal(exceptions.length,0);
  report.success=true;
}catch(error){report.success=false;report.error=error.stack;process.exitCode=1;}
finally{if(held){try{await send('Fetch.continueRequest',{requestId:held});}catch{}}await send('Fetch.disable');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});fs.writeFileSync('qa/react-light/states-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));socket.close();}
