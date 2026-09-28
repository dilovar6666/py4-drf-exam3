const target = (await fetch("http://127.0.0.1:9222/json").then((response) => response.json())).find((row) => row.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let next = 0;
const pending = new Map();
socket.addEventListener("message", (event) => { const data = JSON.parse(event.data); if (data.id && pending.has(data.id)) { const item = pending.get(data.id); pending.delete(data.id); data.error ? item.reject(data.error) : item.resolve(data.result); } });
function send(method, params = {}) { const id = ++next; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); return result.result.value; }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(600);
await evaluate("localStorage.removeItem('auto_anatomy_access_token');localStorage.removeItem('auto_anatomy_refresh_token')");
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(650);
const before = await evaluate(`({path:location.pathname,link:document.querySelector('.home-hero a[href="/about"]')?.textContent?.trim()||''})`);
await evaluate(`document.querySelector('.home-hero a[href="/about"]').click()`); await sleep(400);
const after = await evaluate("({path:location.pathname,heading:document.querySelector('.about-page h1')?.textContent?.trim()||''})");
console.log(JSON.stringify({ before, after }));
socket.close();
