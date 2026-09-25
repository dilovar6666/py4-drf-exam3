const debugPort = Number(process.argv[2] || 9222);
const frontendUrl = process.argv[3] || 'http://127.0.0.1:4173/';
const endpoint = `http://127.0.0.1:${debugPort}`;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForTarget(timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const targets = await fetch(`${endpoint}/json`).then((response) => response.json());
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(200);
  }
  throw new Error('No Chromium page target became available.');
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
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.events.get(message.method) || []) listener(message.params);
      }
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
}

const target = await waitForTarget();
const client = new CdpClient(target.webSocketDebuggerUrl);
await client.connect();
const exceptions = [];
const failedRequests = [];
const apiResponses = [];
client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => exceptions.push(exceptionDetails.text));
client.on('Network.loadingFailed', ({ errorText, canceled, type }) => {
  if (!canceled) failedRequests.push({ errorText, type });
});
client.on('Network.responseReceived', ({ response }) => {
  if (response.url.includes('/api/')) apiResponses.push({ url: response.url, status: response.status });
});
await Promise.all([
  client.send('Page.enable'),
  client.send('Runtime.enable'),
  client.send('Network.enable')
]);

async function evaluate(expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
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
  throw new Error(`Timed out waiting for ${expression}`);
}

await client.send('Page.navigate', { url: frontendUrl });
await waitFor('window.__AUTO_ANATOMY_3D__');
await waitFor("!document.body.classList.contains('is-loading')");
await waitFor("document.querySelectorAll('#cars-grid .data-card').length > 0");
await waitFor("document.querySelectorAll('#shop-grid .data-card').length > 0");

const result = await evaluate(`(async () => {
  document.querySelector('[data-open-data="cars"]').click();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const carsResponse = await fetch(window.__AUTO_ANATOMY_CONFIG__.apiUrl + '/api/cars/?page_size=2');
  const cars = await carsResponse.json();
  const selectedText = document.querySelector('#selected-car-label').textContent.trim();
  const selectedId = Number(localStorage.getItem('auto_anatomy_selected_car_id'));
  const carPartsResponse = await fetch(window.__AUTO_ANATOMY_CONFIG__.apiUrl + '/api/cars/' + selectedId + '/parts/');
  const carParts = await carPartsResponse.json();
  const profileResponse = await fetch(window.__AUTO_ANATOMY_CONFIG__.apiUrl + '/api/auth/profile/');
  return {
    panelOpen: document.querySelector('#data-panel').classList.contains('is-open'),
    apiUrl: window.__AUTO_ANATOMY_CONFIG__.apiUrl,
    carsStatus: carsResponse.status,
    carsPaginated: Number.isInteger(cars.count) && Array.isArray(cars.results),
    renderedCars: document.querySelectorAll('#cars-grid .data-card').length,
    renderedSpareParts: document.querySelectorAll('#shop-grid .data-card').length,
    selectedCarId: selectedId,
    selectedCarLabel: selectedText,
    carPartsStatus: carPartsResponse.status,
    componentIds: carParts.results.map((part) => part.component_id),
    guestProfileStatus: profileResponse.status,
    activeModelPath: window.__AUTO_ANATOMY_3D__.modelPath,
    fallbackModelPreserved: window.__AUTO_ANATOMY_3D__.modelPath === './CarConcept.glb'
  };
})()`);

let protectedFlow = null;
const testEmail = process.env.AUTO_ANATOMY_TEST_EMAIL;
const testPassword = process.env.AUTO_ANATOMY_TEST_PASSWORD;
if (testEmail && testPassword) {
  await evaluate(`(() => {
    document.querySelector('[data-tab="account"]').click();
    const form = document.querySelector('#login-form');
    form.elements.email.value = ${JSON.stringify(testEmail)};
    form.elements.password.value = ${JSON.stringify(testPassword)};
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  })()`);
  await waitFor(`document.querySelector('#profile-card').textContent.includes(${JSON.stringify(testEmail)})`);
  await evaluate(`(() => {
    localStorage.setItem('auto_anatomy_access_token', 'expired-test-token');
    document.querySelector('[data-tab="garage"]').click();
  })()`);
  await waitFor("localStorage.getItem('auto_anatomy_access_token') !== 'expired-test-token'");
  const refreshRecovered = await evaluate("Boolean(localStorage.getItem('auto_anatomy_access_token'))");

  await evaluate(`(() => {
    document.querySelector('[data-tab="cars"]').click();
    document.querySelector('#cars-grid [data-add-garage]').click();
  })()`);
  await waitFor("Boolean(document.querySelector('#cars-grid [data-remove-garage]'))");
  const garageAdded = await evaluate("Boolean(document.querySelector('#cars-grid [data-remove-garage]'))");
  await evaluate("document.querySelector('#cars-grid [data-remove-garage]').click()");
  await waitFor("Boolean(document.querySelector('#cars-grid [data-add-garage]'))");

  await evaluate(`(() => {
    document.querySelector('[data-tab="shop"]').click();
    document.querySelector('#shop-grid [data-toggle-favorite]').click();
  })()`);
  await waitFor("document.querySelector('#shop-grid [data-toggle-favorite]').textContent === 'UNFAVORITE'");
  await evaluate("document.querySelector('#shop-grid [data-add-cart]').click()");
  await waitFor("document.querySelector('#shop-grid [data-add-cart]').textContent.includes('IN CART')");

  await evaluate(`document.querySelector('[data-tab="favorites"]').click()`);
  await waitFor("Boolean(document.querySelector('#favorites-grid [data-toggle-favorite]'))");
  const favoriteAdded = await evaluate("Boolean(document.querySelector('#favorites-grid [data-toggle-favorite]'))");
  await evaluate("document.querySelector('#favorites-grid [data-toggle-favorite]').click()");
  await waitFor("!document.querySelector('#favorites-grid [data-toggle-favorite]')");

  await evaluate(`document.querySelector('[data-tab="cart"]').click()`);
  await waitFor("Boolean(document.querySelector('#cart-grid [data-cart-quantity]'))");
  await evaluate(`(() => {
    const input = document.querySelector('#cart-grid [data-cart-quantity]');
    input.value = '2';
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor("document.querySelector('#data-status').textContent === 'Quantity updated.'");
  const cartQuantityUpdated = await evaluate("document.querySelector('#cart-grid [data-cart-quantity]').value === '2'");
  await evaluate("document.querySelector('#cart-grid [data-remove-cart]').click()");
  await waitFor("!document.querySelector('#cart-grid [data-remove-cart]')");

  await evaluate(`document.querySelector('[data-tab="account"]').click()`);
  await waitFor("Boolean(document.querySelector('[data-logout]'))");
  await evaluate("document.querySelector('[data-logout]').click()");
  await waitFor("!document.querySelector('#auth-forms').hidden");
  protectedFlow = {
    login: true,
    refresh: refreshRecovered,
    garageAddRemove: garageAdded && await evaluate("!document.querySelector('#cars-grid [data-remove-garage]')"),
    favoriteAddRemove: favoriteAdded && await evaluate("!document.querySelector('#favorites-grid [data-toggle-favorite]')"),
    cartAddUpdateRemove: cartQuantityUpdated && await evaluate("!document.querySelector('#cart-grid [data-remove-cart]')"),
    logout: await evaluate("!localStorage.getItem('auto_anatomy_access_token') && !localStorage.getItem('auto_anatomy_refresh_token')")
  };
}

const report = {
  ...result,
  protectedFlow,
  corsRequestsObserved: apiResponses.length,
  apiStatuses: [...new Set(apiResponses.map((entry) => entry.status))],
  exceptions: [...new Set(exceptions)],
  failedRequests
};

const assertions = {
  panelOpen: report.panelOpen,
  catalogLoaded: report.carsStatus === 200 && report.carsPaginated && report.renderedCars > 0,
  shopLoaded: report.renderedSpareParts > 0,
  selectedCarLoaded: report.selectedCarId > 0 && report.selectedCarLabel !== 'NOT SELECTED',
  carPartsLoaded: report.carPartsStatus === 200 && report.componentIds.length > 0,
  protectedEndpointProtected: report.guestProfileStatus === 401,
  modelFallbackSafe: report.fallbackModelPreserved,
  browserClean: report.exceptions.length === 0 && report.failedRequests.length === 0,
  protectedFlow: !report.protectedFlow || Object.values(report.protectedFlow).every(Boolean)
};

console.log(JSON.stringify({ report, assertions }, null, 2));
if (Object.values(assertions).some((value) => !value)) process.exitCode = 1;
client.socket.close();
