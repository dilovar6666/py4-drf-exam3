import fs from "node:fs";
const token = JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8")).user.access;
const cars = await fetch("http://127.0.0.1:8000/api/cars/?page_size=100", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json());
const car = cars.results.find((row) => /FordGT40\.glb$/.test(row.model_url)) || cars.results[0];
if (!car) throw new Error("No car in catalog");
const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map(), exceptions = [];
function send(method, params = {}) { const current = ++id; return new Promise((resolve, reject) => { pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); }); }
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { const entry = pending.get(data.id); pending.delete(data.id); data.error ? entry.reject(data.error) : entry.resolve(data.result); }
  if (data.method === "Runtime.exceptionThrown") exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
  if (data.method === "Fetch.requestPaused") {
    const source = "export const FilesetResolver={forVisionTasks:async()=>({})}; export const HandLandmarker={createFromOptions:async()=>({detectForVideo:()=>{const s=window.__qaSpread;if(s==null)return {landmarks:[],handednesses:[]};const hand=x=>Array.from({length:21},()=>({x,y:.5}));return {landmarks:[hand(.5-s/2),hand(.5+s/2)],handednesses:[[{score:.99}],[{score:.99}]]}},close:()=>{}})};";
    void send("Fetch.fulfillRequest", { requestId: data.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/javascript" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from(source).toString("base64") });
  }
});
async function evalJS(expression) { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Fetch.enable", { patterns: [{ urlPattern: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm", requestStage: "Request" }] });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  Object.defineProperty(navigator, 'mediaDevices', { configurable:true, value:{ getUserMedia:async()=>{
    const canvas=document.createElement('canvas'); canvas.width=640; canvas.height=480;
    const ctx=canvas.getContext('2d'); let n=0; window.__qaDraw=setInterval(()=>{ctx.fillStyle=n++%2?'#555':'#666';ctx.fillRect(0,0,640,480)},40);
    const stream=canvas.captureStream(15); window.__qaStream=stream; return stream;
  }}});
` });
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(600);
await evalJS(`(localStorage.setItem('auto_anatomy_access_token',${JSON.stringify(token)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8")).user.refresh)}))`);
await send("Page.navigate", { url: `http://127.0.0.1:4174/cars/${car.id}` });
for (let i=0;i<100;i++) { if (await evalJS("!!document.querySelector('.gesture-control button')")) break; await sleep(200); }
await evalJS("document.querySelector('.gesture-control button').click()");
await sleep(2600);
const states = [];
async function state(label) { states.push(await evalJS(`({step:${JSON.stringify(label)},track:window.__qaStream?.getVideoTracks()[0]?.readyState||null,videoMounted:!!document.querySelector('.gesture-control video'),guide:!!document.querySelector('.gesture-guide'),phase:document.querySelector('.gesture-control [role=status]')?.textContent||'',hud:!!document.querySelector('.gesture-hud')})`)); }
await state("enabled");
await evalJS("document.querySelector('.gesture-control button:nth-child(2)').click()"); await sleep(120); await state("guide opened");
await evalJS("document.querySelector('.gesture-guide__head button').click()"); await sleep(120); await state("guide closed");
await evalJS("document.querySelector('.gesture-preview-toggle').click()"); await sleep(120); await state("preview hidden");
fs.mkdirSync("qa/ux-runtime", { recursive: true });
fs.writeFileSync("qa/ux-runtime/gesture-ready.png", Buffer.from((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })).data, "base64"));
await evalJS("window.__qaSpread=.2"); await sleep(450);
await evalJS("window.__qaSpread=.65"); await sleep(1300);
states.push(await evalJS("({step:'spread',explode:Number(document.querySelector('.explode-slider input')?.value),track:window.__qaStream?.getVideoTracks()[0]?.readyState})"));
await evalJS("window.__qaSpread=.12"); await sleep(3000);
states.push(await evalJS("({step:'close',explode:Number(document.querySelector('.explode-slider input')?.value),track:window.__qaStream?.getVideoTracks()[0]?.readyState})"));
await evalJS("window.__qaSpread=null"); await sleep(120);
await evalJS("document.querySelector('.gesture-control__buttons button').click()"); await sleep(120); await state("stopped");
await evalJS("document.querySelector('.gesture-control__buttons button').click()"); await sleep(2000); await state("restarted");
await evalJS("document.querySelector('.site-nav a.wordmark').click()"); await sleep(500); await state("navigated away");
console.log(JSON.stringify({ car: car.id, states, exceptions }, null, 2));
socket.close();
