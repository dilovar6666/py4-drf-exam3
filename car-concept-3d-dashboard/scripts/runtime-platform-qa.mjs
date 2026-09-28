import fs from "node:fs";
import path from "node:path";

const frontend = process.env.AUTO_ANATOMY_QA_URL || "http://127.0.0.1:4174";
const output = path.resolve("qa/runtime-audit");
fs.mkdirSync(output, { recursive: true });
const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((row) => row.type === "page");
if (!target) throw new Error("No isolated Edge CDP page is available on port 9222.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const report = { frontend, backend: "http://127.0.0.1:8000", routes: [], consoleErrors: [], exceptions: [], failedRequests: [], httpErrors: [], models: {} };
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const entry = pending.get(message.id);
    pending.delete(message.id);
    message.error ? entry.reject(message.error) : entry.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") report.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") report.consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description || "").join(" "));
  if (message.method === "Network.loadingFailed" && !message.params.canceled) report.failedRequests.push({ error: message.params.errorText, type: message.params.type });
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) report.httpErrors.push({ url: message.params.response.url, status: message.params.response.status });
});

function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitUntil(expression, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch (error) {
      if (!/context|navigation/i.test(error.message || "")) throw error;
    }
    await sleep(150);
  }
  throw new Error(`Browser wait timed out: ${expression}`);
}
async function navigate(route, readyExpression, timeout = 30000) {
  await send("Page.navigate", { url: `${frontend}${route}` });
  await waitUntil(readyExpression, timeout);
  await sleep(400);
  const row = await evaluate(`(()=>({path:location.pathname,title:document.title,heading:document.querySelector('main h1, h1')?.textContent?.trim()||'',bodyText:document.body.innerText.slice(0,240),apiBase:window.__AUTO_ANATOMY_CONFIG__?.apiUrl||'',images:[...document.images].filter(x=>!x.complete||x.naturalWidth===0).map(x=>x.currentSrc||x.src),scrollWidth:document.documentElement.scrollWidth,width:innerWidth,canvas:document.querySelectorAll('canvas').length,viewer:!!window.__AUTO_ANATOMY_3D__}))()`) ;
  report.routes.push(row);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(output, `${route.replaceAll("/", "_") || "home"}.png`), Buffer.from(screenshot.data, "base64"));
  return row;
}

try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });

  await navigate("/", "document.querySelector('.home-hero h1') || document.querySelector('.state-view')");
  await navigate("/cars", "document.querySelector('.cars-page h1, .page h1') || document.querySelector('.state-view')");
  const catalog = await fetch(`${frontend}/api/cars/?page_size=100`).then(async (response) => ({ status: response.status, body: await response.json() }));
  report.catalog = { status: catalog.status, count: catalog.body.count, cars: (catalog.body.results || []).map((car) => ({ id: car.id, model_url: car.model_url })) };
  const definitions = JSON.parse(fs.readFileSync("src/models/vehicles.json", "utf8"));
  const audi = catalog.body.results?.find((row) => /AudiR8\.glb$/.test(row.model_url));
  if (audi) {
    await navigate(`/cars/${audi.id}`, "document.querySelector('.vehicle-page') || document.querySelector('.state-view--error')", 90000);
    await waitUntil("window.__AUTO_ANATOMY_3D__ || document.querySelector('.state-view--error')", 90000);
    report.models.audi = await evaluate("(()=>({viewer:!!window.__AUTO_ANATOMY_3D__,componentCount:window.__AUTO_ANATOMY_3D__?.getInteractionState?.().componentCount||0,error:document.querySelector('.state-view--error')?.innerText||''}))()");
    const configured = fs.readFileSync("src/models/audiR8.js", "utf8");
    report.models.audi.mappingConfigured = configured.includes("audiR8ModelConfig");
    report.models.audi.backendComponentCount = await fetch(`${frontend}/api/cars/${audi.id}/parts/?page_size=100`).then((response) => response.json()).then((payload) => payload.count);
  }
  const car = catalog.body.results?.find((row) => /FordGT40\.glb$/.test(row.model_url));
  if (car) {
    const vehicle = await navigate(`/cars/${car.id}`, "document.querySelector('.vehicle-page') || document.querySelector('.vehicle-loading') || document.querySelector('.state-view')", 90000);
    await waitUntil("window.__AUTO_ANATOMY_3D__ || document.querySelector('.state-view--error')", 90000);
    report.models.gt40 = await evaluate("(()=>({viewer:!!window.__AUTO_ANATOMY_3D__,componentCount:window.__AUTO_ANATOMY_3D__?.getInteractionState?.().componentCount||0,modelUrl:document.querySelector('canvas')?'loaded':null,errors:document.querySelector('.state-view--error')?.innerText||''}))()");
    const modelRequest = report.httpErrors.find((item) => item.url.includes("FordGT40.glb"));
    report.models.gt40.assetHttpError = modelRequest || null;
    const parts = await fetch(`${frontend}/api/cars/${car.id}/parts/?page_size=100`).then((response) => response.json());
    const definition = definitions.find((row) => row.file === "FordGT40.glb");
    const runtimeIds = new Set(definition?.components.map((row) => row.id) || []);
    const databaseIds = new Set((parts.results || []).map((row) => row.component_id));
    report.models.gt40.mapping = { configured: runtimeIds.size, database: parts.count, missingDatabaseIds: [...runtimeIds].filter((id) => !databaseIds.has(id)), extraDatabaseIds: [...databaseIds].filter((id) => !runtimeIds.has(id)) };
    const pointerTarget = await evaluate("(()=>{const id=window.__AUTO_ANATOMY_3D__?.availableComponents?.[0];return id?{id,...window.__AUTO_ANATOMY_3D__.getComponentPointerTarget(id)}:null})()");
    if (pointerTarget?.x != null) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pointerTarget.x, y: pointerTarget.y });
      await sleep(150);
      report.models.gt40.raycasterHover = await evaluate("window.__AUTO_ANATOMY_3D__?.getInteractionState?.().hoveredComponentId||null");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pointerTarget.x, y: pointerTarget.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pointerTarget.x, y: pointerTarget.y, button: "left", clickCount: 1 });
      await sleep(250);
      report.models.gt40.raycasterSelection = await evaluate("window.__AUTO_ANATOMY_3D__?.getInteractionState?.().selectedComponentId||null");
      report.models.gt40.pointerTarget = pointerTarget.id;
      const cameraBeforeOrbit = await evaluate("window.__AUTO_ANATOMY_3D__?.getCameraState?.()||null");
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pointerTarget.x + 120, y: pointerTarget.y + 20, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pointerTarget.x + 155, y: pointerTarget.y + 32, button: "left", buttons: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pointerTarget.x + 155, y: pointerTarget.y + 32, button: "left", clickCount: 1 });
      await sleep(250);
      const cameraAfterOrbit = await evaluate("window.__AUTO_ANATOMY_3D__?.getCameraState?.()||null");
      report.models.gt40.orbitControlsMovedCamera = JSON.stringify(cameraBeforeOrbit) !== JSON.stringify(cameraAfterOrbit);
    }
    const start = await evaluate("window.__AUTO_ANATOMY_3D__?.getComponentTransforms?.()||null");
    if (start) {
      for (const progress of [0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]) await evaluate(`window.__AUTO_ANATOMY_3D__.setExplodeProgress(${progress})`);
      const end = await evaluate("window.__AUTO_ANATOMY_3D__.getComponentTransforms()");
      report.models.gt40.explodeExact = JSON.stringify(start) === JSON.stringify(end);
      report.models.gt40.selectable = await evaluate("window.__AUTO_ANATOMY_3D__.availableComponents.every(id=>window.__AUTO_ANATOMY_3D__.focusComponent(id,false))");
    }
  }
  const store = await navigate("/store", "document.querySelector('.store-page') || document.querySelector('.state-view')");
  report.store = { heading: store.heading, forms: await evaluate("({search:!!document.querySelector('input[type=search],input[placeholder*=Search]'),filters:document.querySelectorAll('select').length,empty:!!document.querySelector('.state-view--empty'),error:!!document.querySelector('.state-view--error')})") };
  await navigate("/profile", "document.querySelector('.profile-page') || document.querySelector('.login-page') || document.querySelector('.state-view')");
  await navigate("/admin", "document.querySelector('.admin-layout') || document.querySelector('.login-page') || document.querySelector('.state-view')");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate("/cars", "document.querySelector('.cars-page h1, .page h1') || document.querySelector('.state-view')");
  report.mobile = await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth})");
  if (car) {
    await navigate(`/cars/${car.id}`, "document.querySelector('.vehicle-page') || document.querySelector('.state-view')", 90000);
    await waitUntil("window.__AUTO_ANATOMY_3D__ || document.querySelector('.state-view--error')", 90000);
    const target = await evaluate("(()=>{const id=window.__AUTO_ANATOMY_3D__?.availableComponents?.[0];return id?{id,...window.__AUTO_ANATOMY_3D__.getComponentPointerTarget(id)}:null})()");
    if (target?.x != null) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: target.x, y: target.y, id: 1 }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(300);
      report.mobile.gt40Tap = { target: target.id, selected: await evaluate("window.__AUTO_ANATOMY_3D__?.getInteractionState?.().selectedComponentId||null") };
    }
  }
  report.success = report.exceptions.length === 0;
} catch (error) {
  report.success = false;
  report.error = error.stack || String(error);
} finally {
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  socket.close();
}
