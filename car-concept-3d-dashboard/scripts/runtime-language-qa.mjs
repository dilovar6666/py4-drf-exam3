const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((row) => row.type === "page");
if (!target) throw new Error("No isolated Edge page is available.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(message.error) : resolve(message.result);
});
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable");
await send("Page.enable");
const routes = [];
for (const route of ["/", "/cars", "/store"]) {
  await send("Page.navigate", { url: `http://127.0.0.1:4174${route}` });
  await sleep(900);
  for (const language of ["ru", "tg", "en"]) {
    await evaluate(`(()=>{const select=document.querySelector('.language-picker select');select.value=${JSON.stringify(language)};select.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    await sleep(100);
    routes.push(await evaluate(`(()=>({route:location.pathname,language:${JSON.stringify(language)},navigation:[...document.querySelectorAll('.site-nav nav a')].map(node=>node.textContent.trim()),heading:document.querySelector('main h1')?.innerText.trim()||'',pageText:document.querySelector('main')?.innerText.slice(0,220)||'',missing:document.body.innerText.includes('translation_missing')}))()`));
  }
}
console.log(JSON.stringify(routes, null, 2));
socket.close();
