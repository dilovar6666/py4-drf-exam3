import fs from "node:fs";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:4174";
const api = "http://127.0.0.1:8002";
const output = process.argv[2] || "qa/platform-browser";
fs.mkdirSync(output, { recursive: true });
const page = (await fetch("http://127.0.0.1:9222/json").then((response) => response.json())).find((item) => item.type === "page");
assert.ok(page, "A Chrome DevTools page target is required");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const report = { base, routes: [], vehicle: {}, errors: [], responses: [] };
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) {
    const item = pending.get(message.id); pending.delete(message.id);
    message.error ? item.reject(message.error) : item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") report.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") report.errors.push(message.params.args.map((arg) => arg.value || arg.description).join(" "));
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) report.responses.push({ url: message.params.response.url, status: message.params.response.status });
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(200);
  }
  throw Error(`Timeout: ${expression}`);
}
async function route(path, expression) {
  await send("Page.navigate", { url: base + path });
  await until(expression);
  report.routes.push({ path, title: await evaluate("document.title"), heading: await evaluate("document.querySelector('h1')?.textContent?.trim() || ''") });
}
async function screenshot(name) {
  const image = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, "base64"));
}

try {
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__AUTO_ANATOMY_CONFIG__={apiUrl:'${api}'};` });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  await route("/", "document.querySelector('.home-hero h1')"); await screenshot("home-desktop");
  await route("/store", "document.querySelector('.store-page h1') && !document.querySelector('.state-view--error')");
  report.store = await evaluate("({search:!!document.querySelector('input[placeholder=\"Search products and parts\"]'),carFilter:!!document.querySelector('.store-filters select'),externalToggle:!!document.querySelector('.check-filter input')})");
  assert.ok(report.store.search && report.store.carFilter && report.store.externalToggle);
  await evaluate("(()=>{const e=document.querySelector('input[placeholder=\"Search products and parts\"]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,'auto-anatomy-no-match-qa');e.dispatchEvent(new Event('input',{bubbles:true}));return true})()");
  await until("document.body.textContent.includes('Nothing found') || document.body.textContent.includes('No matching items') || document.querySelector('.store-card')");
  await screenshot("store-desktop");

  await route("/profile", "document.querySelector('.profile-page h1')");
  assert.equal(await evaluate("Boolean(document.querySelector('input[type=email]'))"), true);
  await screenshot("profile-desktop");
  await route("/admin/3d-import", "document.querySelector('.login-page') || document.querySelector('.admin-import-layout')");
  report.adminGate = await evaluate("({login:!!document.querySelector('.login-page'),wizard:!!document.querySelector('.admin-import-layout')})");
  assert.ok(report.adminGate.login || report.adminGate.wizard);

  const cars = await fetch(`${api}/api/cars/?page_size=100`).then((response) => response.json());
  const gt40 = cars.results.find((car) => car.model_url.endsWith("FordGT40.glb"));
  assert.ok(gt40, "Prepared Ford GT40 must exist in the QA catalog");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await route(`/cars/${gt40.id}`, "document.querySelector('.explode-slider')");
  await until("window.__AUTO_ANATOMY_3D__?.getInteractionState()?.componentCount===63");
  report.vehicle = await evaluate("(()=>{const viewer=window.__AUTO_ANATOMY_3D__;return {componentCount:viewer.getInteractionState().componentCount,modelId:viewer.modelId,modelAudit:viewer.modelAudit?.unassignedMeshes?.length,explodeControl:!!document.querySelector('.explode-slider input'),gestureButton:[...document.querySelectorAll('.gesture-control button')].some(x=>x.textContent.includes('Enable gesture control'))}})()");
  assert.equal(report.vehicle.componentCount, 63);
  assert.equal(report.vehicle.modelAudit, 0);
  assert.ok(report.vehicle.explodeControl && report.vehicle.gestureButton);
  const start = await evaluate("window.__AUTO_ANATOMY_3D__.getComponentTransforms()");
  await evaluate("(()=>{const input=document.querySelector('.explode-slider input');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'75');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until("document.querySelector('.vehicle-controls > span:nth-child(2)')?.textContent==='75% disassembled'");
  await evaluate("(()=>{const input=document.querySelector('.explode-slider input');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'0');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until("document.querySelector('.vehicle-controls > span:nth-child(2)')?.textContent==='0% disassembled'");
  const end = await evaluate("window.__AUTO_ANATOMY_3D__.getComponentTransforms()");
  report.vehicle.explodeRoundTripExact = JSON.stringify(start) === JSON.stringify(end);
  assert.ok(report.vehicle.explodeRoundTripExact);
  await screenshot("gt40-desktop-assembled");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await route(`/cars/${gt40.id}`, "document.querySelector('.explode-slider')");
  await until("window.__AUTO_ANATOMY_3D__?.getInteractionState()?.componentCount===63");
  report.mobile = await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvas:!!document.querySelector('canvas'),cameraOff:document.querySelector('.gesture-control')?.textContent.includes('Camera off')})");
  assert.ok(report.mobile.scrollWidth <= report.mobile.width);
  assert.ok(report.mobile.canvas && report.mobile.cameraOff);
  await screenshot("gt40-mobile");
  await route("/profile", "document.querySelector('.profile-page h1')");
  report.mobile.profileNoOverflow = await evaluate("document.documentElement.scrollWidth<=innerWidth");
  assert.ok(report.mobile.profileNoOverflow);
  assert.deepEqual(report.errors, []);
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { socket.close(); }
