import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.argv[2] || 9222);
const outputPath = process.argv[3] || null;
const screenshotsDirectory = process.argv[4] || null;
const mobile = process.argv[5] === 'mobile';
const selectedCarId = Number(process.argv[6] || 0);
const endpoint = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTarget(timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const targets = await fetch(`${endpoint}/json`).then((response) => response.json());
      const target = targets.find((entry) => entry.type === 'page');
      if (target) return target;
    } catch {}
    await sleep(250);
  }
  throw new Error(`No browser target found at ${endpoint}.`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.events.get(message.method) || []) listener(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(listener);
  }

  close() {
    this.socket.close();
  }
}

const target = await waitForTarget();
const client = new CdpClient(target.webSocketDebuggerUrl);
await client.connect();
const errors = [];
const failedRequests = [];
client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => errors.push(exceptionDetails.text));
client.on('Log.entryAdded', ({ entry }) => {
  if (entry.level === 'error') errors.push(entry.text);
});
client.on('Network.loadingFailed', ({ errorText, canceled, type }) => {
  if (!canceled) failedRequests.push({ errorText, type });
});

await Promise.all([
  client.send('Page.enable'),
  client.send('Runtime.enable'),
  client.send('Log.enable'),
  client.send('Network.enable'),
  client.send('Performance.enable')
]);
await client.send('Emulation.setDeviceMetricsOverride', {
  width: mobile ? 390 : 1440,
  height: mobile ? 844 : 900,
  deviceScaleFactor: mobile ? 3 : 2,
  mobile,
  screenWidth: mobile ? 390 : 1440,
  screenHeight: mobile ? 844 : 900
});
if (selectedCarId > 0) {
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `localStorage.setItem('auto_anatomy_selected_car_id', ${JSON.stringify(String(selectedCarId))});`
  });
}
await client.send('Page.navigate', { url: 'http://127.0.0.1:4173/?perf=1' });

async function evaluate(expression, awaitPromise = true) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function captureScreenshot(name) {
  if (!screenshotsDirectory) return;
  fs.mkdirSync(screenshotsDirectory, { recursive: true });
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(path.join(screenshotsDirectory, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
}

const frameSampler = `new Promise((resolve) => {
  const samples = [];
  const duration = 2400;
  const started = performance.now();
  let previous = started;
  function tick(now) {
    if (now !== previous) samples.push(now - previous);
    previous = now;
    if (now - started < duration) requestAnimationFrame(tick);
    else {
      samples.sort((a, b) => a - b);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      resolve({
        samples: samples.length,
        averageFrameMs: Number(average.toFixed(2)),
        p95FrameMs: Number(samples[Math.floor(samples.length * 0.95)].toFixed(2)),
        estimatedFps: Number((1000 / average).toFixed(1)),
        framesOver25ms: samples.filter((value) => value > 25).length
      });
    }
  }
  requestAnimationFrame(tick);
})`;

async function captureState(name) {
  const frames = await evaluate(frameSampler);
  const renderer = await evaluate('window.__AUTO_ANATOMY_3D__.getPerformanceSnapshot()');
  const metrics = await client.send('Performance.getMetrics');
  const selected = Object.fromEntries(metrics.metrics
    .filter(({ name: metric }) => ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'JSHeapUsedSize'].includes(metric))
    .map(({ name: metric, value }) => [metric, value]));
  return { name, frames, renderer, browserMetrics: selected };
}

await waitFor("document.querySelector('#loading')");
await sleep(250);
await captureScreenshot('loading');
await waitFor('window.__AUTO_ANATOMY_3D__');
await waitFor("!document.body.classList.contains('is-loading')");
await evaluate('window.scrollTo(0, 0)');
await sleep(1400);
await captureScreenshot('intro');
const states = [];
const validation = {};
states.push(await captureState('intro'));

validation.explodeInterpolation = await evaluate(`(() => {
  const api = window.__AUTO_ANATOMY_3D__;
  const snapshot = () => Object.fromEntries(api.getComponentTransforms().map((component) => [component.componentId, component]));
  const maxDelta = (left, right) => Math.max(...left.map((value, index) => Math.abs(value - right[index])));
  api.setExplodeProgress(0);
  const assembled = snapshot();
  api.setExplodeProgress(0.01);
  const onePercent = snapshot();
  api.setExplodeProgress(1);
  const exploded = snapshot();
  api.setExplodeProgress(0.01);
  const onePercentAgain = snapshot();
  api.setExplodeProgress(0);
  const restored = snapshot();
  const components = Object.values(assembled).map((component) => {
    const id = component.componentId;
    const expectedOnePercent = component.originalPosition.map((value, index) => value + (component.explodedPosition[index] - value) * 0.01);
    return {
      componentId: id,
      category: component.category,
      system: component.system,
      layer: component.layer,
      meshCount: api.components.find((entry) => entry.componentId === id)?.meshCount || 0,
      displacement: Math.hypot(...component.explodedPosition.map((value, index) => value - component.originalPosition[index])),
      onePercentError: maxDelta(onePercent[id].position, expectedOnePercent),
      deterministicError: maxDelta(onePercent[id].position, onePercentAgain[id].position),
      restoreError: maxDelta(restored[id].position, component.originalPosition),
      explodedError: maxDelta(exploded[id].position, component.explodedPosition)
    };
  });
  const layeredSystems = components
    .filter((component) => component.layer > 0)
    .reduce((groups, component) => {
      (groups[component.system] ||= []).push(component);
      return groups;
    }, {});
  const hierarchy = Object.entries(layeredSystems).map(([system, members]) => {
    const ordered = members.slice().sort((left, right) => left.layer - right.layer);
    return {
      system,
      members: ordered.map(({ componentId, layer, displacement }) => ({ componentId, layer, displacement })),
      outwardOrder: ordered.every((member, index) => index === 0 || member.displacement > ordered[index - 1].displacement)
    };
  });
  return {
    components,
    hierarchy,
    hierarchyPass: hierarchy.every((system) => system.outwardOrder),
    maxOnePercentError: Math.max(...components.map((component) => component.onePercentError)),
    maxDeterministicError: Math.max(...components.map((component) => component.deterministicError)),
    maxRestoreError: Math.max(...components.map((component) => component.restoreError)),
    maxExplodedError: Math.max(...components.map((component) => component.explodedError))
  };
})()`);
validation.componentMapping = await evaluate(`(() => ({
  configured: window.__AUTO_ANATOMY_3D__.components.map((component) => ({
    componentId: component.componentId,
    meshCount: component.meshCount,
    missingNodes: component.missingNodes
  })),
  unassignedMeshes: window.__AUTO_ANATOMY_3D__.modelAudit.unassignedMeshes,
  lostMeshes: window.__AUTO_ANATOMY_3D__.modelAudit.lostMeshes
}))()`);

const scrollFrames = await evaluate(`new Promise((resolve) => {
  const samples = [];
  const duration = 2400;
  const startTime = performance.now();
  const startY = window.scrollY;
  const targetY = (document.documentElement.scrollHeight - innerHeight) * 0.58;
  let previous = startTime;
  function tick(now) {
    if (now !== previous) samples.push(now - previous);
    previous = now;
    const progress = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, startY + (targetY - startY) * progress);
    if (progress < 1) requestAnimationFrame(tick);
    else {
      samples.sort((a, b) => a - b);
      const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      resolve({samples: samples.length, averageFrameMs: Number(average.toFixed(2)), p95FrameMs: Number(samples[Math.floor(samples.length * .95)].toFixed(2)), estimatedFps: Number((1000 / average).toFixed(1)), framesOver25ms: samples.filter((value) => value > 25).length});
    }
  }
  requestAnimationFrame(tick);
})`);
states.push({ name: 'scroll', frames: scrollFrames, renderer: await evaluate('window.__AUTO_ANATOMY_3D__.getPerformanceSnapshot()') });
await captureScreenshot('scroll-mid');

await evaluate('window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.72)');
await sleep(1200);
await captureScreenshot('exploded');
states.push(await captureState('exploded'));

await evaluate('window.scrollTo(0, 0)');
await waitFor("document.querySelector('#explode-percent').textContent === '000%'");
await sleep(350);
validation.reverseExplode = await evaluate(`(() => {
  const values = window.__AUTO_ANATOMY_3D__.getComponentTransforms();
  const maxDelta = (left, right) => Math.max(...left.map((value, index) => Math.abs(value - right[index])));
  return {
    componentCount: values.length,
    maxPositionError: Math.max(...values.map((value) => maxDelta(value.position, value.originalPosition))),
    maxQuaternionError: Math.max(...values.map((value) => maxDelta(value.quaternion, value.originalQuaternion))),
    maxScaleError: Math.max(...values.map((value) => maxDelta(value.scale, value.originalScale)))
  };
})()`);

await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
await sleep(500);
await evaluate("document.querySelector('#enter-lab').click()");
await waitFor('window.__AUTO_ANATOMY_3D__.getInteractionState().labActive');
await sleep(400);
await captureScreenshot('lab');
states.push(await captureState('lab'));

const pointerTarget = mobile ? null : await evaluate(`window.__AUTO_ANATOMY_3D__.getLabPointerTargets().find((entry) => entry.target) || null`);
if (pointerTarget) {
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pointerTarget.target.x, y: pointerTarget.target.y });
  await waitFor('window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId');
  validation.pointerHoverComponentId = await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId');
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pointerTarget.target.x, y: pointerTarget.target.y, button: 'left', clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pointerTarget.target.x, y: pointerTarget.target.y, button: 'left', clickCount: 1 });
} else {
  await evaluate("document.querySelector('#parts-list button').click()");
}
await waitFor('window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId');
await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().interactionLocked');
await captureScreenshot('inspection');
states.push(await captureState('inspection'));

await evaluate("document.querySelector('#back-to-lab').click()");
await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId');
await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().interactionLocked');
const componentIds = await evaluate('window.__AUTO_ANATOMY_3D__.availableComponents');
validation.componentFocus = [];
validation.pointerMapping = [];
for (const componentId of componentIds) {
  const target = mobile ? null : await evaluate(`window.__AUTO_ANATOMY_3D__.getLabPointerTargets().find((entry) => entry.componentId === '${componentId}')?.target || null`);
  let hoveredComponentId = null;
  if (target) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
    await waitFor(`window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId === '${componentId}'`);
    hoveredComponentId = await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId');
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });
  } else {
    await evaluate(`document.querySelector('[data-component-id="${componentId}"]').click()`);
  }
  await waitFor(`window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId === '${componentId}'`);
  await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().interactionLocked');
  validation.pointerMapping.push({
    componentId,
    targetFound: Boolean(target),
    hoveredComponentId,
    clickedComponentId: await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId')
  });
  validation.componentFocus.push({
    componentId,
    camera: await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()')
  });
  await evaluate("document.querySelector('#back-to-lab').click()");
  await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId');
  await waitFor('!window.__AUTO_ANATOMY_3D__.getInteractionState().interactionLocked');
}
validation.labExhibits = await evaluate('window.__AUTO_ANATOMY_3D__.verifyLabExhibits()');

const result = {
  timestamp: new Date().toISOString(),
  runtime: await evaluate(`({
    modelId: window.__AUTO_ANATOMY_3D__.modelId,
    modelPath: window.__AUTO_ANATOMY_3D__.modelPath,
    selectedCarId: Number(localStorage.getItem('auto_anatomy_selected_car_id')),
    selectedCarLabel: document.querySelector('#selected-car-label').textContent.trim()
  })`),
  states,
  validation,
  errors: [...new Set(errors)],
  failedRequests
};
const json = JSON.stringify(result, null, 2);
if (outputPath) fs.writeFileSync(outputPath, json);
console.log(json);
client.close();
