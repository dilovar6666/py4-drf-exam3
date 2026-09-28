import fs from 'node:fs';
const token = process.env.AUTO_ANATOMY_QA_TOKEN;
if (!token) throw new Error('An isolated QA staff token is required.');
const directory = 'qa/react-light';
fs.mkdirSync(directory, { recursive: true });
const target = (await fetch('http://127.0.0.1:9222/json').then((r) => r.json())).find((r) => r.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let id = 1; const pending = new Map(), errors = [];
socket.addEventListener('message', (event) => { const m = JSON.parse(event.data); if (pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = id++; pending.set(n, { resolve, reject }); socket.send(JSON.stringify({ id: n, method, params })); });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
async function until(expression) { const start = Date.now(); while (Date.now() - start < 20000) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch {} await sleep(150); } throw new Error(`Timed out: ${expression}`); }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${directory}/${name}.png`, Buffer.from(r.data, 'base64')); }
async function navigate(route, expression) { await send('Page.navigate', { url: `http://127.0.0.1:4174${route}` }); await sleep(300); await until(expression); await sleep(250); }
async function click(text) { await evaluate(`([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})).click()`); }
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const init = await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__AUTO_ANATOMY_CONFIG__={apiUrl:'http://127.0.0.1:8001'};localStorage.setItem('auto_anatomy_access_token',${JSON.stringify(token)});` });
const report = { source: 'Isolated SQLite copy of the actual catalog. A temporary QA staff account exists only in that copy.', mutationsToLiveDatabase: 0, errors, screenshots: [] };
try {
  await navigate('/admin', "document.querySelector('.admin-counts')"); await shot('admin-overview');
  for (const resource of ['cars', 'components', 'products', 'compatibility']) {
    await navigate(`/admin/${resource}`, "document.querySelector('.admin-table')"); await shot(`admin-${resource}`);
    await click('Create record +'); await until("document.querySelector('dialog[open]')"); await shot(`admin-${resource}-form`);
    report[`${resource}FormFields`] = await evaluate("[...document.querySelectorAll('dialog .form-field>span')].map(n=>n.textContent)");
    await evaluate("document.querySelector('dialog .icon-button').click()");
    await click('Edit'); await until("document.querySelector('dialog[open]')"); await shot(`admin-${resource}-edit`);
    await evaluate("document.querySelector('dialog .icon-button').click()");
  }
  await navigate('/admin/cars', "document.querySelector('.admin-table')"); await click('Delete'); await until("document.querySelector('dialog[open]')"); await shot('admin-delete-confirmation'); await click('Keep record');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/admin', "document.querySelector('.admin-counts')"); await shot('mobile-admin-overview');
  await navigate('/admin/components', "document.querySelector('.admin-table')"); await shot('mobile-admin-components');
  await click('Create record +'); await until("document.querySelector('dialog[open]')"); await shot('mobile-admin-form');
  report.horizontalOverflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
  report.success = true;
} catch (error) { report.success = false; report.error = error.stack || JSON.stringify(error); process.exitCode = 1; }
finally {
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: init.identifier });
  await evaluate("localStorage.removeItem('auto_anatomy_access_token');localStorage.removeItem('auto_anatomy_refresh_token')");
  report.screenshots = fs.readdirSync(directory).filter((name) => /admin.*\.png$/.test(name));
  fs.writeFileSync(`${directory}/admin-report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); socket.close();
}
