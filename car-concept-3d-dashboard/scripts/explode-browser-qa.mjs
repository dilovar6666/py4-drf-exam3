import fs from 'node:fs';
import assert from 'node:assert/strict';
import { preparedVehicles, vehicleConfigs } from '../src/models/vehicleCatalog.js';

const base = process.env.AUTO_ANATOMY_QA_URL || 'http://127.0.0.1:4174';
const target = (await fetch('http://127.0.0.1:9222/json').then((r) => r.json())).find((t) => t.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(message.error) : resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++nextId, { resolve, reject });
  socket.send(JSON.stringify({ id: nextId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(expression, timeout = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(250);
  }
  throw Error(`Timed out waiting for ${expression}`);
}
function maxPositionDifference(left, right) {
  let maximum = 0;
  left.forEach((row, index) => row.position.forEach((value, axis) => {
    maximum = Math.max(maximum, Math.abs(value - right[index].position[axis]));
  }));
  return maximum;
}

const report = { sequence: [0, 25, 50, 75, 100, 75, 50, 25, 0], vehicles: [], success: false };
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const catalog = await fetch(`${base}/api/cars/?page_size=100`).then((r) => r.json());
  for (const config of vehicleConfigs) {
    const definition = preparedVehicles.find((vehicle) => vehicle.id === config.id);
    const filename = definition?.file || 'AudiR8.glb';
    const car = catalog.results.find((item) => item.model_url.endsWith(filename));
    assert.ok(car, `Missing Django catalog record for ${config.id}`);
    await send('Page.navigate', { url: `${base}/cars/${car.id}` });
    await until(`window.__AUTO_ANATOMY_3D__?.components.length===${Object.keys(config.components).length}`);
    const snapshots = [];
    for (const percent of report.sequence) {
      await evaluate(`window.__AUTO_ANATOMY_3D__.setExplodeProgress(${percent / 100})`);
      snapshots.push(await evaluate('window.__AUTO_ANATOMY_3D__.getComponentTransforms()'));
    }
    const assembled = snapshots[0];
    const full = snapshots[4];
    let interpolationError = 0;
    for (let step = 0; step < report.sequence.length; step += 1) {
      const progress = report.sequence[step] / 100;
      snapshots[step].forEach((row, index) => row.position.forEach((value, axis) => {
        const expected = assembled[index].position[axis] + (full[index].position[axis] - assembled[index].position[axis]) * progress;
        interpolationError = Math.max(interpolationError, Math.abs(value - expected));
      }));
    }
    const result = {
      id: config.id,
      componentCount: snapshots[0].length,
      sequence: report.sequence,
      maximumInterpolationError: interpolationError,
      reverseDrift: maxPositionDifference(assembled, snapshots.at(-1)),
      repeat75Drift: maxPositionDifference(snapshots[3], snapshots[5]),
      repeat50Drift: maxPositionDifference(snapshots[2], snapshots[6]),
      repeat25Drift: maxPositionDifference(snapshots[1], snapshots[7]),
    };
    assert.equal(result.reverseDrift, 0, `${config.id} did not return to exact assembled transforms`);
    assert.equal(result.repeat75Drift, 0, `${config.id} 75% reverse transform drift`);
    assert.equal(result.repeat50Drift, 0, `${config.id} 50% reverse transform drift`);
    assert.equal(result.repeat25Drift, 0, `${config.id} 25% reverse transform drift`);
    assert.ok(result.maximumInterpolationError < 1e-6, `${config.id} explode interpolation is not linear/deterministic`);
    report.vehicles.push(result);
  }
  report.success = true;
} catch (error) {
  report.error = error.stack;
  process.exitCode = 1;
} finally {
  fs.writeFileSync('qa/six-car/browser/explode-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  socket.close();
}
