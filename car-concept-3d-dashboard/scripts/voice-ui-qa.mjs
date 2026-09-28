import fs from "node:fs";
const tokens = JSON.parse(fs.readFileSync("../.ux_qa_tokens.json", "utf8"));
const target = (await fetch("http://127.0.0.1:9222/json").then((response) => response.json())).find((item) => item.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let id = 0;
const pending = new Map(), exceptions = [];
function send(method, params = {}) { const current = ++id; return new Promise((resolve, reject) => { pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id: current, method, params })); }); }
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id && pending.has(data.id)) { const item = pending.get(data.id); pending.delete(data.id); data.error ? item.reject(data.error) : item.resolve(data.result); }
  if (data.method === "Runtime.exceptionThrown") exceptions.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
  if (data.method === "Fetch.requestPaused") {
    const mock = { answer: "Hello from Auto Anatomy.", conversation_id: tokens.conversation_id, language: "en", actions: [], external_search: null };
    void send("Fetch.fulfillRequest", { requestId: data.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }, { name: "Access-Control-Allow-Origin", value: "*" }], body: Buffer.from(JSON.stringify(mock)).toString("base64") });
  }
});
async function evalJS(expression) { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Runtime.enable"); await send("Page.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "http://127.0.0.1:4174/api/ai/ask/", requestStage: "Request" }] });
await send("Page.navigate", { url: "http://127.0.0.1:4174/" }); await sleep(450);
await evalJS(`(localStorage.setItem('auto_anatomy_access_token',${JSON.stringify(tokens.user.access)}),localStorage.setItem('auto_anatomy_refresh_token',${JSON.stringify(tokens.user.refresh)}))`);
await send("Page.navigate", { url: "http://127.0.0.1:4174/ai" });
for (let i=0;i<40;i++) { if (await evalJS("!!document.querySelector('.ai-panel textarea')")) break; await sleep(150); }
if (!await evalJS("!!document.querySelector('.ai-panel textarea')")) throw new Error("AI page missing textarea: " + await evalJS("location.pathname + ' ' + document.body.innerText.slice(0,120)"));
// React-controlled textarea receives native setter to update state.
await evalJS("(()=>{const input=document.querySelector('.ai-panel textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Explain this car');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
await evalJS("document.querySelector('.ai-panel form button').click()"); await sleep(450);
const states = [];
states.push(await evalJS("({step:'answer',answer:document.querySelector('.ai-answer p')?.textContent||'',listen:document.querySelector('.ai-voice-controls button')?.textContent||'',autoPlay:document.querySelector('.ai-voice-controls input')?.checked})"));
await evalJS("document.querySelector('.ai-voice-controls button').click()");
let observedStop = false;
for (let i=0;i<60;i++) { await sleep(100); if (await evalJS("document.querySelector('.ai-voice-controls button')?.textContent?.includes('Stop')")) { observedStop = true; break; } }
states.push(await evalJS(`({step:'listen',stopObserved:${observedStop},button:document.querySelector('.ai-voice-controls button')?.textContent||'',error:document.querySelector('.ai-panel [role=alert]')?.textContent||''})`));
if (observedStop) await evalJS("document.querySelector('.ai-voice-controls button').click()"); await sleep(120);
states.push(await evalJS("({step:'stop',button:document.querySelector('.ai-voice-controls button')?.textContent||''})"));
await evalJS("document.querySelector('.ai-voice-controls button').click()"); await sleep(550);
states.push(await evalJS("({step:'second listen',button:document.querySelector('.ai-voice-controls button')?.textContent||''})"));
await evalJS("document.querySelector('.site-nav .wordmark').click()"); await sleep(350);
states.push(await evalJS("({step:'route change',path:location.pathname,answerMounted:!!document.querySelector('.ai-answer')})"));
console.log(JSON.stringify({ states, exceptions }, null, 2));
socket.close();
