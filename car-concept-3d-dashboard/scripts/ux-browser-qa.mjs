import fs from "node:fs";
const tokens = fs.existsSync("../.ux_qa_tokens.json") ? JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8")) : null;
const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No Edge CDP page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let id = 0;
const pending = new Map(), exceptions = [];
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { const item = pending.get(data.id); pending.delete(data.id); data.error ? item.reject(data.error) : item.resolve(data.result); }
  if (data.method === "Runtime.exceptionThrown") exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
});
function send(method, params = {}) { const current = ++id; return new Promise((resolve, reject) => { pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); }); }
async function evalJS(expression) { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); return result.result.value; }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable"); await send("Page.enable");
if (process.argv.includes("--staff")) {
  await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(500);
  await evalJS(`(localStorage.setItem('auto_anatomy_access_token', ${JSON.stringify(tokens.staff.access)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(tokens.staff.refresh)}),window.dispatchEvent(new CustomEvent('auto-anatomy:auth-changed')))`);
  await sleep(1000);
  await send("Page.navigate", { url: "http://127.0.0.1:4174/admin" }); await sleep(2200);
  console.log(JSON.stringify(await evalJS("({path:location.pathname,admin:!!document.querySelector('.admin-layout'),text:document.body.innerText.slice(0,180),token:!!localStorage.getItem('auto_anatomy_access_token')})")));
  socket.close(); process.exit(0);
}
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(300);
await evalJS("localStorage.removeItem('auto_anatomy_access_token'); localStorage.removeItem('auto_anatomy_refresh_token')");
const result = [];
for (const route of ["/", "/about", "/login", "/register", "/cars", "/store", "/profile", "/profile/garage/1", "/ai", "/admin"]) {
  await send("Page.navigate", { url: `http://127.0.0.1:4174${route}` });
  await sleep(1300);
  result.push(await evalJS(`({requested:${JSON.stringify(route)},path:location.pathname,from:history.state?.usr?.from||null,heading:document.querySelector('main h1')?.textContent?.trim()||'',nav:[...document.querySelectorAll('.site-nav nav a')].map(a=>a.textContent.trim()),header:!!document.querySelector('.site-nav'),footer:!!document.querySelector('.site-footer'),body:document.body.innerText.slice(0,150)})`));
}
for (const language of ["ru", "tg", "en"]) {
  await send("Page.navigate", { url: "http://127.0.0.1:4174/about" }); await sleep(450);
  await evalJS(`(localStorage.setItem('aa-language', ${JSON.stringify(language)}), window.dispatchEvent(new Event('aa-language-change')))`);
  await sleep(180);
  result.push(await evalJS(`({language:${JSON.stringify(language)},title:document.querySelector('main h1')?.textContent?.trim(),learnMore:document.querySelector('.site-nav nav a[href="/about"]')?.textContent?.trim()})`));
}
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(500);
await evalJS(`document.querySelector('.home-hero a[href="/about"]').click()`); await sleep(300);
result.push(await evalJS("({step:'learn more click',path:location.pathname,infoHeading:document.querySelector('.about-page h1')?.textContent||''})"));
if (tokens) {
await evalJS(`(localStorage.setItem('auto_anatomy_access_token', ${JSON.stringify(tokens.user.access)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(tokens.user.refresh)}),window.dispatchEvent(new CustomEvent('auto-anatomy:auth-changed')))`);
for (const route of ["/cars", "/store", "/profile", "/ai", "/admin"]) {
  await send("Page.navigate", { url: `http://127.0.0.1:4174${route}` });
  await sleep(1800);
  result.push(await evalJS(`({auth:"user",requested:${JSON.stringify(route)},path:location.pathname,nav:[...document.querySelectorAll('.site-nav nav a')].map(a=>a.textContent.trim()),heading:document.querySelector('main h1')?.textContent?.trim()||'',staffDenied:document.body.innerText.includes('Staff access required.')})`));
}
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(350);
await evalJS(`(localStorage.setItem('auto_anatomy_access_token', ${JSON.stringify(tokens.staff.access)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(tokens.staff.refresh)}),window.dispatchEvent(new CustomEvent('auto-anatomy:auth-changed')))`);
await send("Page.navigate", { url: "http://127.0.0.1:4174/admin" }); await sleep(1700);
result.push(await evalJS("({auth:'staff',path:location.pathname,admin:!!document.querySelector('.admin-layout'),text:document.body.innerText.slice(0,100)})"));
const voice = await fetch("http://127.0.0.1:8000/api/ai/voice/", { method: "POST", headers: { Authorization: `Bearer ${tokens.user.access}`, "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: tokens.conversation_id, language: "en" }) });
result.push({ voiceApiStatus: voice.status, voiceContentType: voice.headers.get("content-type"), voiceBytes: voice.ok ? (await voice.arrayBuffer()).byteLength : null });
}
console.log(JSON.stringify({ result, exceptions }, null, 2));
socket.close();
