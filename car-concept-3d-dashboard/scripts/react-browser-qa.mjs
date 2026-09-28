import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const directory = path.resolve(process.argv[2] || 'qa/react-light');
fs.mkdirSync(directory, { recursive: true });
const base = process.env.AUTO_ANATOMY_QA_URL || 'http://127.0.0.1:4174';
const target = (await fetch('http://127.0.0.1:9222/json').then((r) => r.json())).find((r) => r.type === 'page');
if (!target) throw new Error('No CDP browser page found on port 9222.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let id = 1;
const pending = new Map(), exceptions = [], failedRequests = [], statusErrors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); message.error ? item.reject(message.error) : item.resolve(message.result); }
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Network.loadingFailed' && !message.params.canceled) failedRequests.push({ error: message.params.errorText, type: message.params.type });
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) statusErrors.push({ url: message.params.response.url, status: message.params.response.status });
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = id++; pending.set(n, { resolve, reject }); socket.send(JSON.stringify({ id: n, method, params })); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}
async function until(expression, timeout = 25000) { const start = Date.now(); while (Date.now() - start < timeout) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch (error) { if (!/context|navigation/i.test(error.message || JSON.stringify(error))) throw error; } await sleep(150); } throw new Error(`Timed out: ${expression}`); }
async function screenshot(name) { await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); const image = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(directory, `${name}.png`), Buffer.from(image.data, 'base64')); }
async function navigate(route, expression = "document.querySelector('main') && !document.querySelector('.loading-line')") {
  await send('Page.navigate', { url: `${base}${route}` }); await sleep(350); await until(expression); await sleep(350);
}
async function clickText(text) { return evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!button) return false; button.click(); return true;})()`); }
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const report = { screenshots: [], regression: {}, admin: {}, exceptions, failedRequests, statusErrors };
try {
  await navigate('/', "document.querySelector('canvas') && !document.querySelector('.vehicle-loading')"); await screenshot('home');
  await navigate('/cars', "document.querySelectorAll('.vehicle-card').length > 0"); await screenshot('cars');
  const carIds = await evaluate("[...document.querySelectorAll('.vehicle-card')].map(a=>a.getAttribute('href'))");
  report.regression.realCars = carIds;
  await navigate('/cars/4', "window.__AUTO_ANATOMY_3D__?.components.length===74"); await sleep(500); await screenshot('audi-assembled');
  report.regression.audit = await evaluate("(()=>{const a=window.__AUTO_ANATOMY_3D__.modelAudit;return {totalMeshCount:a.totalMeshCount,currentMeshCount:a.currentMeshCount,componentCount:a.components.length,missing:a.components.flatMap(c=>c.missingNodes),lost:a.lostMeshes,unassigned:a.unassignedMeshes}})()");
  assert.equal(report.regression.audit.componentCount, 74); assert.equal(report.regression.audit.totalMeshCount, 152);
  assert.equal(report.regression.audit.missing.length, 0); assert.equal(report.regression.audit.lost.length, 0); assert.equal(report.regression.audit.unassigned.length, 0);
  report.regression.backendMapping = await evaluate("(async()=>{let url='/api/cars/4/parts/?page_size=100',rows=[];while(url){const p=await fetch(url).then(r=>r.json());rows.push(...(p.results||p));url=p.next||null;}const ids=window.__AUTO_ANATOMY_3D__.availableComponents;return {records:rows.length,missing:ids.filter(id=>!rows.some(r=>r.component_id===id))};})()");
  assert.equal(report.regression.backendMapping.missing.length, 0);
  const beforeOrbit = await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 780, y: 480, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 920, y: 500, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 920, y: 500, button: 'left', buttons: 0 });
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  const afterOrbit = await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState().position');
  report.regression.orbitDrag = beforeOrbit.some((value,i)=>Math.abs(value-afterOrbit[i])>.01);
  assert.equal(report.regression.orbitDrag, true);
  await evaluate('window.__AUTO_ANATOMY_3D__.reset()');
  report.regression.explode = await evaluate("(()=>{const a=window.__AUTO_ANATOMY_3D__;a.setExplodeProgress(0);const start=a.getComponentTransforms();a.setExplodeProgress(.371);const mid=a.getComponentTransforms();a.setExplodeProgress(1);const full=a.getComponentTransforms();a.setExplodeProgress(.371);const mid2=a.getComponentTransforms();a.setExplodeProgress(0);const end=a.getComponentTransforms();let reverse=0,deterministic=0;start.forEach((r,i)=>r.position.forEach((v,j)=>{reverse=Math.max(reverse,Math.abs(v-end[i].position[j]));deterministic=Math.max(deterministic,Math.abs(mid[i].position[j]-mid2[i].position[j]));}));return {reverse,deterministic,moved:full.filter((r,i)=>r.position.some((v,j)=>Math.abs(v-start[i].position[j])>1e-6)).length};})()");
  assert.equal(report.regression.explode.reverse, 0); assert.equal(report.regression.explode.deterministic, 0);
  for (const [name, progress] of [['engine-close-up', .2], ['brake-close-up', .4], ['partial-explode', .68], ['full-explode', 1]]) {
    await evaluate(`window.scrollTo(0,${progress}*(document.documentElement.scrollHeight-innerHeight))`); await sleep(250);
    await evaluate(`window.__AUTO_ANATOMY_3D__.setStoryProgress(${progress})`); await sleep(150); await screenshot(name);
    report.regression[name] = await evaluate('window.__AUTO_ANATOMY_3D__.getCameraState()');
  }
  report.regression.allComponentsFocusable = await evaluate("window.__AUTO_ANATOMY_3D__.availableComponents.every(id=>window.__AUTO_ANATOMY_3D__.focusComponent(id,false))");
  assert.equal(report.regression.allComponentsFocusable, true);
  await evaluate("window.__AUTO_ANATOMY_3D__.reset();window.__AUTO_ANATOMY_3D__.setStoryProgress(1)"); await sleep(150);
  let pointerTarget = null, pointerId = null;
  for (const componentId of ['door_left', 'front_left_tire', 'front_left_brake_disc', 'body_shell']) {
    pointerTarget = await evaluate(`window.__AUTO_ANATOMY_3D__.getComponentPointerTarget(${JSON.stringify(componentId)})`);
    if (pointerTarget) { pointerId = componentId; break; }
  }
  report.regression.pointer = { componentId: pointerId, target: pointerTarget };
  if (pointerTarget) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pointerTarget.x, y: pointerTarget.y }); await sleep(200);
    report.regression.pointer.hover = await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState()'); await screenshot('component-hover');
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pointerTarget.x, y: pointerTarget.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pointerTarget.x, y: pointerTarget.y, button: 'left', clickCount: 1 });
    await sleep(1400); report.regression.pointer.selection = await evaluate('window.__AUTO_ANATOMY_3D__.getInteractionState()'); await screenshot('component-selected');
    assert.equal(report.regression.pointer.hover.hoveredComponentId, pointerId);
    assert.equal(report.regression.pointer.selection.selectedComponentId, pointerId);
  } else throw new Error('No actual raycast pointer target found.');
  await navigate('/cars/4/components/front_left_brake_disc', "window.__AUTO_ANATOMY_3D__?.getInteractionState().selectedComponentId==='front_left_brake_disc'"); await sleep(1300); await screenshot('component-deep-link');
  report.regression.performance = await evaluate('window.__AUTO_ANATOMY_3D__.getPerformanceSnapshot()');
  await navigate('/parts', "document.querySelectorAll('.part-card').length>0"); await screenshot('parts');
  const productPath = await evaluate("document.querySelector('.part-card').getAttribute('href')");
  await navigate(productPath, "document.querySelector('.product-layout')"); await screenshot('product');
  report.regression.productPath = productPath;
  report.regression.canvasReleased = await evaluate("document.querySelectorAll('canvas').length===0 && !window.__AUTO_ANATOMY_3D__");
  assert.equal(report.regression.canvasReleased, true);
  await navigate('/about'); await screenshot('about');
  await navigate('/admin', "document.querySelector('.login-form') || document.querySelector('.admin-content')"); await screenshot('admin-login');
  if (process.env.AUTO_ANATOMY_QA_TOKEN) {
    await evaluate(`localStorage.setItem('auto_anatomy_access_token',${JSON.stringify(process.env.AUTO_ANATOMY_QA_TOKEN)})`);
    await navigate('/admin', "document.querySelector('.admin-counts')"); await screenshot('admin-overview');
    for (const resource of ['cars', 'components', 'products', 'compatibility']) {
      await navigate(`/admin/${resource}`, "document.querySelector('.admin-table')"); await screenshot(`admin-${resource}`);
      await clickText('Create record +'); await until("document.querySelector('dialog[open]')"); await screenshot(`admin-${resource}-form`);
      await evaluate("document.querySelector('dialog .icon-button').click()");
    }
    await navigate('/admin/cars', "document.querySelector('.admin-table')"); await clickText('Delete'); await until("document.querySelector('dialog[open]')"); await screenshot('admin-delete-confirmation');
    await clickText('Keep record'); report.admin.authenticatedReadOnly = true;
    await evaluate("localStorage.removeItem('auto_anatomy_access_token');localStorage.removeItem('auto_anatomy_refresh_token')");
  } else report.admin.authenticatedReadOnly = false;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/', "document.querySelector('canvas') && !document.querySelector('.vehicle-loading')"); await screenshot('mobile-home');
  await navigate('/cars/4', "window.__AUTO_ANATOMY_3D__?.components.length===74"); await screenshot('mobile-audi');
  const touchTarget = await evaluate("window.__AUTO_ANATOMY_3D__.getComponentPointerTarget('front_left_tire')");
  assert.ok(touchTarget, 'A visible semantic tire must be tappable');
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchTarget.x, y: touchTarget.y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await until("window.__AUTO_ANATOMY_3D__.getInteractionState().selectedComponentId==='front_left_tire'");
  report.regression.mobileTap = true; await sleep(1300); await screenshot('mobile-tap');
  await evaluate('window.__AUTO_ANATOMY_3D__.reset()');
  await evaluate("window.__AUTO_ANATOMY_3D__.setExplodeProgress(.6);window.__AUTO_ANATOMY_3D__.focusComponent('front_left_brake_disc')"); await sleep(1300); await screenshot('mobile-component');
  await navigate('/cars', "document.querySelectorAll('.vehicle-card').length>0"); await screenshot('mobile-cars');
  await navigate('/parts', "document.querySelectorAll('.part-card').length>0"); await screenshot('mobile-parts');
  await navigate('/admin', "document.querySelector('.login-form')"); await screenshot('mobile-admin-login');
  report.regression.mobileHorizontalOverflow = await evaluate('document.documentElement.scrollWidth>innerWidth');
  report.success = true;
} catch (error) { report.success = false; report.error = error.stack || JSON.stringify(error); process.exitCode = 1; }
finally {
  report.screenshots = fs.readdirSync(directory).filter((name) => name.endsWith('.png'));
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ success: report.success, error: report.error, regression: report.regression, admin: report.admin, exceptions, failedRequests, statusErrors, screenshots: report.screenshots }, null, 2));
  socket.close();
}
