import fs from 'node:fs';
const target=(await fetch('http://127.0.0.1:9222/json').then(r=>r.json())).find(r=>r.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}});
const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);socket.send(JSON.stringify({id,method,params}));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const report=[];
for(const carId of [4,7,8]){
 await send('Page.navigate',{url:`http://127.0.0.1:4174/cars/${carId}`});
 const started=Date.now();while(!await evaluate('Boolean(window.__AUTO_ANATOMY_3D__?.components.length)')){if(Date.now()-started>90000)throw Error('Vehicle load timeout');await sleep(200);}
 await evaluate("window.__AUTO_ANATOMY_3D__.focusComponent('body_shell')");await sleep(1800);
 await sleep(500);
 const image=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`qa/multi-car/browser/focus-settled-${carId}.png`,Buffer.from(image.data,'base64'));
 report.push(await evaluate('(()=>{const a=window.__AUTO_ANATOMY_3D__,p=a.getComponentPointerTarget("body_shell"),r=document.querySelector("canvas").getBoundingClientRect();return {car:location.pathname,viewport:[innerWidth,innerHeight],canvasRect:[r.x,r.y,r.width,r.height],pointer:p,element:p?document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,300):null,camera:a.getCameraState(),diagnostics:a.getRenderDiagnostics(),state:a.getInteractionState()};})()'));
}
fs.writeFileSync('qa/multi-car/browser/focus-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));socket.close();
