import fs from "node:fs";

const token = JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8")).user.access;
console.error("QA_START");
const catalog = await fetch("http://127.0.0.1:8000/api/cars/?page_size=100", {
  headers: { Authorization: `Bearer ${token}` },
}).then((response) => response.json());
console.error("QA_CATALOG", catalog.results?.length);
const audi = catalog.results.find((car) => /AudiR8\.glb$/.test(car.model_url));
const gt40 = catalog.results.find((car) => /FordGT40\.glb$/.test(car.model_url));
if (!audi || !gt40) throw new Error("Audi or GT40 is missing from the API catalog");

const target = (await fetch("http://127.0.0.1:9222/json").then((response) => response.json())).filter((item) => item.type === "page").at(-1);
console.error("QA_TARGET");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
console.error("QA_SOCKET");
let serial = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const packet = JSON.parse(event.data);
  if (!packet.id || !pending.has(packet.id)) return;
  const item = pending.get(packet.id);
  pending.delete(packet.id);
  packet.error ? item.reject(packet.error) : item.resolve(packet.result);
});
function send(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable");
console.error("QA_RUNTIME");
await send("Page.enable");
console.error("QA_PAGE");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
console.error("QA_METRICS");
await send("Page.navigate", { url: "http://127.0.0.1:4174/" });
console.error("QA_HOME");
await sleep(400);
const refresh = JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8")).user.refresh;
await evaluate(`(localStorage.setItem('auto_anatomy_access_token',${JSON.stringify(token)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(refresh)}))`);
console.error("QA_AUTH");
const results = [];
for (const car of [audi, gt40]) {
  console.error("QA_NAVIGATE", car.model_url);
  await send("Page.navigate", { url: `http://127.0.0.1:4174/cars/${car.id}` });
  let loaded = false;
  for (let i = 0; i < 180; i += 1) {
    loaded = await evaluate("Boolean(window.__AUTO_ANATOMY_3D__?.availableComponents.length)");
    if (loaded) break;
    await sleep(250);
  }
  if (!loaded) throw new Error(`Viewer timed out for ${car.model_url}`);
  console.error("QA_LOADED", car.model_url);
  const row = await evaluate(`(async () => {
    const scene = window.__AUTO_ANATOMY_3D__;
    const ids = scene.availableComponents;
    scene.setExplodeProgress(0);
    const first = scene.getComponentTransforms();
    let pick = null;
    for (const id of ids.slice(0, 12)) { const point=scene.getComponentPointerTarget(id); if(point){pick={id,point};break;} }
    if (pick) {
      const canvas = document.querySelector('.vehicle-canvas canvas');
      for (const name of ['pointerdown','pointerup']) canvas.dispatchEvent(new PointerEvent(name, { bubbles:true, clientX:pick.point.x, clientY:pick.point.y, pointerType:'mouse' }));
    }
    const selected = scene.getInteractionState().selectedComponentId;
    const focused = selected ? scene.focusComponent(selected) : false;
    for (const percent of [25,50,75,100,75,50,25,0]) scene.setExplodeProgress(percent/100);
    const last = scene.getComponentTransforms();
    let drift = 0;
    for (let i=0;i<first.length;i++) for (let axis=0;axis<3;axis++) drift=Math.max(drift,Math.abs(first[i].position[axis]-last[i].position[axis]));
    return {path:location.pathname,count:ids.length,meshes:scene.modelAudit?.meshCount||null,raycastTarget:pick?.id||null,selected,focused,drift,canvas:!!document.querySelector('.vehicle-canvas canvas')};
  })()`);
  console.error("QA_DONE", car.model_url);
  results.push({ model: car.model_url, ...row });
}
console.log(JSON.stringify(results, null, 2));
socket.close();
