const target=(await fetch('http://127.0.0.1:9222/json').then(r=>r.json())).find(r=>r.type==='page');
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
socket.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id===1){console.log(JSON.stringify(r.result,null,2));socket.close();}});
socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:process.argv[2]||"({camera:window.__AUTO_ANATOMY_3D__?.getCameraState(),body:window.__AUTO_ANATOMY_3D__?.components.find(c=>c.componentId==='body_shell'),state:window.__AUTO_ANATOMY_3D__?.getInteractionState()})",returnByValue:true,awaitPromise:true}}));
