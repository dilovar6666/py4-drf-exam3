import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = 'http://127.0.0.1:4174';
const outDir = 'qa/gt40-deep/browser';
fs.mkdirSync(outDir, { recursive: true });
const glbAudit = JSON.parse(fs.readFileSync('qa/gt40-deep/glb-audit.json', 'utf8'));
const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
const target = targets.find(t => t.type === 'page' && t.url.startsWith(base));
assert.ok(target, 'Headless Edge has no Auto Anatomy page target');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const report = { vehicle: 'ford_gt40', screenshots: [], components: [], raycastTargets: [],
  consoleErrors: [], exceptions: [], statusErrors: [], sequence: [0,25,50,75,100,75,50,25,0] };
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(message.error) : resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') report.exceptions.push(message.params.exceptionDetails.text);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    report.consoleErrors.push(message.params.args.map(a => a.value || a.description).join(' '));
  }
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
    report.statusErrors.push({url: message.params.response.url, status: message.params.response.status});
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, timeout = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch (error) {
      if (!/context|navigation/i.test(error.message)) throw error;
    }
    await wait(200);
  }
  throw Error(`Timed out waiting for ${expression}`);
}
async function screenshot(name) {
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${outDir}/${name}.png`, Buffer.from(result.data, 'base64'));
  report.screenshots.push(name);
}
async function clickAt(point) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
function maxDifference(a, b, key = 'position') {
  let max = 0;
  a.forEach((row, i) => row[key].forEach((value, axis) => {
    max = Math.max(max, Math.abs(value - b[i][key][axis]));
  }));
  return max;
}

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: `${base}/cars/1` });
  await until('window.__AUTO_ANATOMY_3D__?.components.length === 63');
  const model = await evaluate(`(()=>{const a=window.__AUTO_ANATOMY_3D__,r=a.modelAudit;return {
    components:a.components, totalMeshCount:r.totalMeshCount,currentMeshCount:r.currentMeshCount,
    unassigned:r.unassignedMeshes,lost:r.lostMeshes,hidden:r.hiddenMeshes,
    canvasCount:a.getPerformanceSnapshot().activeCanvasCount,
    bounds:(()=>{const b=a.getRenderDiagnostics().modelBounds;return b?[b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z]:null})()
  }})()`);
  report.model = { totalMeshCount: model.totalMeshCount, currentMeshCount: model.currentMeshCount,
    unassigned: model.unassigned.length, lost: model.lost.length, hidden: model.hidden.length,
    canvasCount: model.canvasCount, bounds: model.bounds };
  assert.equal(model.totalMeshCount, glbAudit.runtimeDrawsFromNodes);
  assert.equal(model.currentMeshCount, glbAudit.runtimeDrawsFromNodes);
  assert.deepEqual(model.unassigned, []);
  assert.deepEqual(model.lost, []);
  assert.deepEqual(model.hidden, []);
  assert.equal(model.canvasCount, 1);
  const backend = await fetch(`${base}/api/cars/1/parts/?page_size=100`).then(r => r.json());
  assert.equal(backend.count, 63);
  const ids = model.components.map(c => c.componentId);
  assert.equal(new Set(ids).size, 63);
  assert.deepEqual(new Set(ids), new Set(backend.results.map(p => p.component_id)));
  report.components = model.components.map(c => ({ id: c.componentId, name: c.displayName, meshes: c.meshCount }));
  assert.equal(model.components.reduce((sum, c) => sum + c.meshCount, 0), glbAudit.runtimeDrawsFromNodes);
  await screenshot('assembled');

  // Exercise focus and combined bounds for every registered semantic assembly.
  report.focus = await evaluate(`(()=>{const a=window.__AUTO_ANATOMY_3D__;return a.components.map(c=>{
    const focused=a.focusComponent(c.componentId,false),b=a.getRenderDiagnostics().selectedBounds,
      size=b?[b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z]:[];
    a.reset();return {id:c.componentId,focused,size,hasFiniteSize:size.length===3&&size.every(Number.isFinite)&&size.every(v=>v>=0),meshCount:c.meshCount};
  })})()`);
  assert.equal(report.focus.length, 63);
  assert.ok(report.focus.every(c => c.focused && c.hasFiniteSize && c.meshCount > 0));

  // Raycaster hover/click a newly separated real arch surface.
  const targetPoint = await evaluate(`window.__AUTO_ANATOMY_3D__.getComponentPointerTarget('wheel_arch_front_left')`);
  assert.ok(targetPoint, 'Front left wheel arch has no visible raycast target');
  report.raycastTargets.push('wheel_arch_front_left');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...targetPoint });
  await wait(120);
  report.hover = await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState().hoveredComponentId');
  assert.equal(report.hover, 'wheel_arch_front_left');
  await screenshot('hover-wheel-arch-front-left');
  await clickAt(targetPoint);
  await until(`window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId==='wheel_arch_front_left'`);
  report.selection = await evaluate(`({id:window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId,
    bounds:(()=>{const b=window.__AUTO_ANATOMY_3D__.getRenderDiagnostics().selectedBounds;return b?[b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z]:null})()})`);
  assert.equal(report.selection.id, 'wheel_arch_front_left');
  assert.ok(report.selection.bounds?.every(v => Number.isFinite(v) && v >= 0));
  await screenshot('selected-wheel-arch-front-left');
  await evaluate('window.__AUTO_ANATOMY_3D__.reset();window.__AUTO_ANATOMY_3D__.setStoryProgress(0)');

  // Explode sequence and reverse are absolute interpolation from an immutable base pose.
  const start = await evaluate(`(()=>{const a=window.__AUTO_ANATOMY_3D__;a.setExplodeProgress(0);return a.getComponentTransforms()})()`);
  report.explode = { assembledPoseError: Math.max(...start.flatMap(row => row.position.map((v,axis) => Math.abs(v-row.originalPosition[axis])))) };
  assert.equal(report.explode.assembledPoseError, 0);
  const snapshots = [];
  for (const percent of report.sequence) {
    await evaluate(`window.__AUTO_ANATOMY_3D__.setExplodeProgress(${percent / 100})`);
    snapshots.push(await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()'));
    if ([25, 50, 75, 100].includes(percent)) await screenshot(`explode-${percent}`);
  }
  report.explode = { finalReverseDrift: maxDifference(snapshots[0], snapshots.at(-1)),
    repeat75Drift: maxDifference(snapshots[3], snapshots[5]),
    repeat50Drift: maxDifference(snapshots[2], snapshots[6]),
    repeat25Drift: maxDifference(snapshots[1], snapshots[7]),
    movedAt100: snapshots[4].filter((row, i) => row.position.some((v, axis) => Math.abs(v - snapshots[0][i].position[axis]) > 1e-6)).length };
  assert.equal(report.explode.finalReverseDrift, 0);
  assert.equal(report.explode.repeat75Drift, 0);
  assert.equal(report.explode.repeat50Drift, 0);
  assert.equal(report.explode.repeat25Drift, 0);
  assert.ok(report.explode.movedAt100 > 0);
  const tireAt = percent => snapshots[report.sequence.indexOf(percent)].find(row => row.componentId === 'tire_fl');
  const rimAt = percent => snapshots[report.sequence.indexOf(percent)].find(row => row.componentId === 'rim_fl');
  const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
  report.explode.wheelHierarchy = {
    assemblyOffset25: distance(tireAt(25).assemblyPosition, [0, 0, 0]),
    assemblyOffset50: distance(tireAt(50).assemblyPosition, [0, 0, 0]),
    assemblyOffset100: distance(tireAt(100).assemblyPosition, [0, 0, 0]),
    componentOffset50: distance(tireAt(50).position, tireAt(0).position),
    tireRimSeparation100: distance(tireAt(100).position, rimAt(100).position),
    assemblyStableAfter50: distance(tireAt(50).assemblyPosition, tireAt(100).assemblyPosition),
  };
  assert.ok(report.explode.wheelHierarchy.assemblyOffset25 > 0);
  assert.ok(report.explode.wheelHierarchy.assemblyOffset50 > report.explode.wheelHierarchy.assemblyOffset25);
  assert.equal(report.explode.wheelHierarchy.assemblyStableAfter50, 0);
  assert.equal(report.explode.wheelHierarchy.componentOffset50, 0);
  assert.ok(report.explode.wheelHierarchy.tireRimSeparation100 > 0);
  await evaluate('window.__AUTO_ANATOMY_3D__.setExplodeProgress(0)');

  // OrbitControls changes view through a real pointer drag.
  const canvas = await evaluate(`(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.5,width:r.width,height:r.height}})()`);
  const beforeOrbit = await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: canvas.x, y: canvas.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: canvas.x + 180, y: canvas.y + 35, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canvas.x + 180, y: canvas.y + 35, button: 'left', buttons: 0 });
  await wait(200);
  const afterOrbit = await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()');
  report.orbitControls = beforeOrbit.position.some((v, i) => Math.abs(v - afterOrbit.position[i]) > 0.01);
  assert.ok(report.orbitControls);

  // Deep link and browser component index include the newly mapped names.
  await send('Page.navigate', { url: `${base}/cars/1/components/engine_piston_bank_left` });
  await until(`window.__AUTO_ANATOMY_3D__?.getInteractionState().selectedComponentId==='engine_piston_bank_left' && document.querySelector('.component-info--deep')`);
  report.deepLink = await evaluate('location.pathname');
  assert.equal(report.deepLink, '/cars/1/components/engine_piston_bank_left');

  // Mobile tap path on a real visible mesh.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: `${base}/cars/1` });
  await until('window.__AUTO_ANATOMY_3D__?.components.length===63');
  const mobileTarget = await evaluate(`window.__AUTO_ANATOMY_3D__.getComponentPointerTarget('wheel_arch_front_left')`);
  assert.ok(mobileTarget, 'Mobile target for wheel arch not visible');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [mobileTarget] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await until(`window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId==='wheel_arch_front_left'`);
  report.mobileTap = true;
  report.mobileOverflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
  assert.equal(report.mobileOverflow, false);
  await screenshot('mobile-tap-wheel-arch-front-left');

  report.success = true;
  assert.deepEqual(report.exceptions, []);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.statusErrors, []);
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
  try { await screenshot('failure'); } catch {}
} finally {
  fs.writeFileSync(`${outDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({success: report.success, model: report.model, explode: report.explode, error: report.error}));
  socket.close();
}
