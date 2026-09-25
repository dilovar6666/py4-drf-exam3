import {
  api,
  API_BASE_URL,
  clearTokens,
  isAuthenticated,
  pageResults,
  setTokens
} from './api.js';
import {
  getSelectedCar,
  restoreSelectedCar,
  selectCar
} from './appState.js';

const catalog = {
  brands: new Map(),
  models: new Map(),
  partBrands: new Map(),
  categories: new Map(),
  spareParts: new Map(),
  garage: [],
  favorites: [],
  cartItems: []
};

const view = {
  active: 'cars',
  carsPage: 1,
  shopPage: 1,
  carsPayload: null,
  shopPayload: null,
  profile: null
};

let DOM = null;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function itemName(map, id, fallback = '—') {
  return map.get(Number(id))?.name || fallback;
}

function setStatus(message, tone = '') {
  if (!DOM) return;
  DOM.status.textContent = message;
  DOM.status.dataset.tone = tone;
  DOM.status.hidden = !message;
}

function setBusy(container, label = 'Loading from Django API…') {
  container.innerHTML = `<div class="data-state"><i></i><span>${escapeHtml(label)}</span></div>`;
}

function emptyState(message) {
  return `<div class="data-state data-state--empty">${escapeHtml(message)}</div>`;
}

function pagination(payload, scope) {
  if (!payload || (!payload.previous && !payload.next)) return '';
  const page = scope === 'cars' ? view.carsPage : view.shopPage;
  return `<div class="data-pagination">
    <button type="button" data-page-scope="${scope}" data-page="${page - 1}" ${payload.previous ? '' : 'disabled'}>← PREVIOUS</button>
    <span>PAGE ${page} · ${payload.count} ITEMS</span>
    <button type="button" data-page-scope="${scope}" data-page="${page + 1}" ${payload.next ? '' : 'disabled'}>NEXT →</button>
  </div>`;
}

function carLabel(car) {
  const model = catalog.models.get(Number(car.car_model));
  const brand = model ? catalog.brands.get(Number(model.brand)) : null;
  return `${brand?.name || 'Vehicle'} ${model?.name || `#${car.car_model}`} ${car.year}`;
}

function partLabel(part) {
  return `${itemName(catalog.partBrands, part.brand, 'Part brand')} · ${part.name}`;
}

function createShell() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <nav class="data-launcher" aria-label="Auto Anatomy data sections">
      <button type="button" data-open-data="cars">CARS</button>
      <button type="button" data-open-data="shop">SHOP</button>
      <button type="button" data-open-data="account" aria-label="Open account">ACCOUNT</button>
    </nav>
    <div id="data-backdrop" class="data-backdrop" hidden></div>
    <section id="data-panel" class="data-panel" aria-hidden="true" aria-label="Auto Anatomy catalog">
      <header class="data-panel__header">
        <div><p class="eyebrow">DJANGO REST API</p><h2>AUTO ANATOMY DATA</h2></div>
        <button type="button" data-close-panel aria-label="Close data panel">×</button>
      </header>
      <p id="api-origin" class="data-panel__origin"></p>
      <nav class="data-tabs" aria-label="Catalog sections">
        <button type="button" data-tab="cars">CARS</button>
        <button type="button" data-tab="garage">GARAGE</button>
        <button type="button" data-tab="shop">SHOP</button>
        <button type="button" data-tab="favorites">FAVORITES</button>
        <button type="button" data-tab="cart">CART</button>
        <button type="button" data-tab="account">ACCOUNT</button>
      </nav>
      <p id="data-status" class="data-status" role="status" hidden></p>
      <div class="data-panel__body">
        <section data-view="cars">
          <div class="data-section-heading"><div><p class="eyebrow">VEHICLE CATALOG</p><h3>SELECTED CAR</h3></div><p id="selected-car-label">NOT SELECTED</p></div>
          <form id="car-filters" class="data-filters">
            <label>BRAND<select name="brand"><option value="">ALL BRANDS</option></select></label>
            <label>MODEL<select name="model"><option value="">ALL MODELS</option></select></label>
            <label>YEAR<input name="year" type="number" min="1886" max="2100" placeholder="ANY"></label>
            <button type="submit">APPLY</button>
          </form>
          <div id="cars-grid" class="data-grid"></div>
        </section>
        <section data-view="garage" hidden><div class="data-section-heading"><div><p class="eyebrow">YOUR ACCOUNT</p><h3>GARAGE</h3></div></div><div id="garage-grid" class="data-grid"></div></section>
        <section data-view="shop" hidden>
          <div class="data-section-heading"><div><p class="eyebrow">SPARE PART CATALOG</p><h3>SHOP ARCHIVE</h3></div><p>NO CHECKOUT · SAVED LIST ONLY</p></div>
          <form id="shop-filters" class="data-filters">
            <label>BRAND<select name="brand"><option value="">ALL BRANDS</option></select></label>
            <label>CATEGORY<select name="category"><option value="">ALL CATEGORIES</option></select></label>
            <label>SKU<input name="sku" placeholder="EXACT SKU"></label>
            <label class="data-check"><input name="compatible" type="checkbox"> SELECTED CAR ONLY</label>
            <button type="submit">APPLY</button>
          </form>
          <div id="shop-grid" class="data-grid"></div><div id="part-detail"></div>
        </section>
        <section data-view="favorites" hidden><div class="data-section-heading"><div><p class="eyebrow">YOUR ACCOUNT</p><h3>FAVORITES</h3></div></div><div id="favorites-grid" class="data-grid"></div></section>
        <section data-view="cart" hidden><div class="data-section-heading"><div><p class="eyebrow">SAVED PARTS</p><h3>CART</h3></div><p>NO PAYMENT OR DELIVERY</p></div><div id="cart-grid" class="data-grid"></div></section>
        <section data-view="account" hidden>
          <div class="data-section-heading"><div><p class="eyebrow">JWT ACCOUNT</p><h3>PROFILE & ACCESS</h3></div></div>
          <div id="profile-card"></div>
          <div id="auth-forms" class="auth-columns">
            <form id="login-form" class="data-form"><h4>LOGIN</h4><label>EMAIL<input name="email" type="email" autocomplete="email" required></label><label>PASSWORD<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">LOGIN</button></form>
            <form id="register-form" class="data-form"><h4>REGISTER</h4><label>EMAIL<input name="email" type="email" autocomplete="email" required></label><label>PASSWORD<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><button type="submit">SEND VERIFICATION CODE</button></form>
            <form id="verify-form" class="data-form" hidden><h4>VERIFY EMAIL</h4><label>EMAIL<input name="email" type="email" autocomplete="email" required></label><label>6-DIGIT CODE<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label><button type="submit">VERIFY EMAIL</button></form>
          </div>
        </section>
      </div>
    </section>`;
  document.body.append(...wrapper.children);

  DOM = {
    panel: document.querySelector('#data-panel'),
    backdrop: document.querySelector('#data-backdrop'),
    status: document.querySelector('#data-status'),
    apiOrigin: document.querySelector('#api-origin'),
    selectedCarLabel: document.querySelector('#selected-car-label'),
    carFilters: document.querySelector('#car-filters'),
    carsGrid: document.querySelector('#cars-grid'),
    garageGrid: document.querySelector('#garage-grid'),
    shopFilters: document.querySelector('#shop-filters'),
    shopGrid: document.querySelector('#shop-grid'),
    partDetail: document.querySelector('#part-detail'),
    favoritesGrid: document.querySelector('#favorites-grid'),
    cartGrid: document.querySelector('#cart-grid'),
    profileCard: document.querySelector('#profile-card'),
    authForms: document.querySelector('#auth-forms'),
    verifyForm: document.querySelector('#verify-form')
  };
  DOM.apiOrigin.textContent = `API · ${API_BASE_URL}`;
}

function openPanel(tab = view.active) {
  DOM.panel.classList.add('is-open');
  DOM.panel.setAttribute('aria-hidden', 'false');
  DOM.backdrop.hidden = false;
  document.body.classList.add('is-data-open');
  showView(tab);
}

function closePanel() {
  DOM.panel.classList.remove('is-open');
  DOM.panel.setAttribute('aria-hidden', 'true');
  DOM.backdrop.hidden = true;
  document.body.classList.remove('is-data-open');
}

function showView(name) {
  view.active = name;
  DOM.panel.querySelectorAll('[data-view]').forEach((section) => { section.hidden = section.dataset.view !== name; });
  DOM.panel.querySelectorAll('[data-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.tab === name));
  if (name === 'garage') renderGarage();
  if (name === 'favorites') renderFavorites();
  if (name === 'cart') renderCart();
  if (name === 'account') renderAccount();
}

function optionMarkup(records, selected = '') {
  return records.map((record) => `<option value="${record.id}" ${String(record.id) === String(selected) ? 'selected' : ''}>${escapeHtml(record.name)}</option>`).join('');
}

async function loadReferenceData() {
  const [brandsPayload, modelsPayload, partBrandsPayload, categoriesPayload] = await Promise.all([
    api.brands(), api.models({ page_size: 100 }), api.partBrands(), api.productCategories()
  ]);
  pageResults(brandsPayload).forEach((item) => catalog.brands.set(item.id, item));
  pageResults(modelsPayload).forEach((item) => catalog.models.set(item.id, item));
  pageResults(partBrandsPayload).forEach((item) => catalog.partBrands.set(item.id, item));
  pageResults(categoriesPayload).forEach((item) => catalog.categories.set(item.id, item));
  DOM.carFilters.elements.brand.insertAdjacentHTML('beforeend', optionMarkup([...catalog.brands.values()]));
  DOM.carFilters.elements.model.insertAdjacentHTML('beforeend', optionMarkup([...catalog.models.values()]));
  DOM.shopFilters.elements.brand.insertAdjacentHTML('beforeend', optionMarkup([...catalog.partBrands.values()]));
  DOM.shopFilters.elements.category.insertAdjacentHTML('beforeend', optionMarkup([...catalog.categories.values()]));
}

async function loadCars(page = view.carsPage) {
  view.carsPage = page;
  setBusy(DOM.carsGrid);
  const form = new FormData(DOM.carFilters);
  try {
    view.carsPayload = await api.cars({
      page,
      page_size: 6,
      brand: form.get('brand'),
      model: form.get('model'),
      year: form.get('year')
    });
    renderCars();
  } catch (error) {
    DOM.carsGrid.innerHTML = emptyState(error.message);
  }
}

function carCard(car, { garageRecord = null } = {}) {
  const selected = getSelectedCar()?.id === car.id;
  const garage = catalog.garage.find((record) => Number(record.car) === Number(car.id));
  return `<article class="data-card ${selected ? 'is-selected' : ''}">
    <img src="${escapeHtml(car.image_url)}" alt="" loading="lazy">
    <div class="data-card__body"><p class="eyebrow">${car.year} · CAR #${car.id}</p><h4>${escapeHtml(carLabel(car))}</h4><p>${escapeHtml(car.description)}</p>
      <div class="data-card__actions">
        <button type="button" data-select-car="${car.id}" ${selected ? 'disabled' : ''}>${selected ? 'SELECTED' : 'SELECT CAR'}</button>
        ${garageRecord || garage ? `<button type="button" data-remove-garage="${(garageRecord || garage).id}">REMOVE</button>` : `<button type="button" data-add-garage="${car.id}">ADD TO GARAGE</button>`}
      </div>
    </div></article>`;
}

function renderCars() {
  const cars = pageResults(view.carsPayload);
  DOM.carsGrid.innerHTML = cars.length ? cars.map((car) => carCard(car)).join('') + pagination(view.carsPayload, 'cars') : emptyState('No cars match these filters.');
  DOM.selectedCarLabel.textContent = getSelectedCar() ? carLabel(getSelectedCar()) : 'NOT SELECTED';
}

async function chooseCar(id) {
  setStatus('Loading the selected car and its components…');
  try {
    const car = await api.car(id);
    await selectCar(car);
    DOM.selectedCarLabel.textContent = carLabel(car);
    renderCars();
    setStatus(`${carLabel(car)} selected. CarPart data is ready for the 3D adapter.`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function requireAccount() {
  if (isAuthenticated()) return true;
  openPanel('account');
  setStatus('Login is required for Garage, Favorites and Cart.', 'error');
  return false;
}

async function loadProtectedData() {
  if (!isAuthenticated()) {
    view.profile = null;
    catalog.garage = [];
    catalog.favorites = [];
    catalog.cartItems = [];
    return;
  }
  try {
    const [profile, garage, favorites, cartItems] = await Promise.all([
      api.profile(), api.userCars(), api.favorites(), api.cartItems()
    ]);
    view.profile = profile;
    catalog.garage = pageResults(garage);
    catalog.favorites = pageResults(favorites);
    catalog.cartItems = pageResults(cartItems);
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function ensureCar(id) {
  return api.car(id);
}

async function renderGarage() {
  if (!requireAccount()) return;
  setBusy(DOM.garageGrid);
  await loadProtectedData();
  try {
    const entries = await Promise.all(catalog.garage.map(async (record) => ({ record, car: await ensureCar(record.car) })));
    DOM.garageGrid.innerHTML = entries.length ? entries.map(({ record, car }) => carCard(car, { garageRecord: record })).join('') : emptyState('Your garage is empty.');
  } catch (error) {
    DOM.garageGrid.innerHTML = emptyState(error.message);
  }
}

async function addGarage(carId) {
  if (!requireAccount()) return;
  try {
    await api.addUserCar(carId);
    await loadProtectedData();
    renderCars();
    setStatus('Car added to your garage.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function removeGarage(recordId) {
  try {
    await api.removeUserCar(recordId);
    await loadProtectedData();
    renderCars();
    if (view.active === 'garage') renderGarage();
    setStatus('Car removed from your garage.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function loadShop(page = view.shopPage) {
  view.shopPage = page;
  setBusy(DOM.shopGrid);
  DOM.partDetail.replaceChildren();
  const form = new FormData(DOM.shopFilters);
  const params = {
    page,
    page_size: 6,
    brand: form.get('brand'),
    category: form.get('category'),
    sku: form.get('sku')
  };
  try {
    if (form.get('compatible') && !getSelectedCar()) throw new Error('Select a car before filtering by compatibility.');
    view.shopPayload = form.get('compatible')
      ? await api.compatibleParts(getSelectedCar().id, params)
      : await api.spareParts(params);
    pageResults(view.shopPayload).forEach((part) => catalog.spareParts.set(part.id, part));
    renderShop();
  } catch (error) {
    DOM.shopGrid.innerHTML = emptyState(error.message);
  }
}

function shopCard(part) {
  const favorite = catalog.favorites.find((record) => Number(record.spare_part) === Number(part.id));
  const cartItem = catalog.cartItems.find((record) => Number(record.spare_part) === Number(part.id));
  return `<article class="data-card data-card--part"><div class="data-card__body"><p class="eyebrow">${escapeHtml(part.sku)} · ${escapeHtml(part.oem_number)}</p><h4>${escapeHtml(partLabel(part))}</h4><p>${escapeHtml(part.description)}</p>
    <div class="data-card__actions"><button type="button" data-part-detail="${part.id}">DETAILS</button><button type="button" data-toggle-favorite="${part.id}">${favorite ? 'UNFAVORITE' : 'FAVORITE'}</button><button type="button" data-add-cart="${part.id}">${cartItem ? `IN CART · ${cartItem.quantity}` : 'ADD TO CART'}</button></div>
  </div></article>`;
}

function renderShop() {
  const parts = pageResults(view.shopPayload);
  DOM.shopGrid.innerHTML = parts.length ? parts.map(shopCard).join('') + pagination(view.shopPayload, 'shop') : emptyState('No spare parts match these filters.');
}

async function showPartDetail(id) {
  DOM.partDetail.innerHTML = `<div class="data-detail">${emptyState('Loading part details…')}</div>`;
  try {
    const part = await api.sparePart(id);
    catalog.spareParts.set(part.id, part);
    const [imagesPayload, compatibilityPayload] = await Promise.all([
      api.sparePartImages(id),
      api.compatibilities({ spare_part: id, page_size: 100 })
    ]);
    const images = pageResults(imagesPayload);
    const compatibility = pageResults(compatibilityPayload);
    const selectedCompatibility = getSelectedCar()
      ? compatibility.some((record) => Number(record.car) === Number(getSelectedCar().id))
      : null;
    DOM.partDetail.innerHTML = `<article class="data-detail">
      <p class="eyebrow">SPARE PART #${part.id}</p><h3>${escapeHtml(partLabel(part))}</h3>
      ${images[0] ? `<img src="${escapeHtml(images[0].image_url)}" alt="" loading="lazy">` : ''}
      <p>${escapeHtml(part.description)}</p><dl><div><dt>SKU</dt><dd>${escapeHtml(part.sku)}</dd></div><div><dt>OEM</dt><dd>${escapeHtml(part.oem_number)}</dd></div><div><dt>COMPATIBILITY</dt><dd>${selectedCompatibility === null ? 'SELECT A CAR' : selectedCompatibility ? 'COMPATIBLE' : 'NOT LISTED FOR SELECTED CAR'}</dd></div></dl>
    </article>`;
  } catch (error) {
    DOM.partDetail.innerHTML = emptyState(error.message);
  }
}

async function getSparePart(id) {
  if (!catalog.spareParts.has(Number(id))) catalog.spareParts.set(Number(id), await api.sparePart(id));
  return catalog.spareParts.get(Number(id));
}

async function toggleFavorite(partId) {
  if (!requireAccount()) return;
  try {
    const existing = catalog.favorites.find((record) => Number(record.spare_part) === Number(partId));
    if (existing) await api.removeFavorite(existing.id);
    else await api.addFavorite(partId);
    await loadProtectedData();
    renderShop();
    if (view.active === 'favorites') renderFavorites();
    setStatus(existing ? 'Removed from favorites.' : 'Added to favorites.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function addToCart(partId) {
  if (!requireAccount()) return;
  try {
    const existing = catalog.cartItems.find((record) => Number(record.spare_part) === Number(partId));
    if (existing) await api.updateCartItem(existing.id, existing.quantity + 1);
    else await api.addCartItem(partId, 1);
    await loadProtectedData();
    renderShop();
    setStatus('Saved cart updated.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function renderFavorites() {
  if (!requireAccount()) return;
  setBusy(DOM.favoritesGrid);
  await loadProtectedData();
  try {
    const parts = await Promise.all(catalog.favorites.map((record) => getSparePart(record.spare_part)));
    DOM.favoritesGrid.innerHTML = parts.length ? parts.map(shopCard).join('') : emptyState('You have no favorite spare parts.');
  } catch (error) {
    DOM.favoritesGrid.innerHTML = emptyState(error.message);
  }
}

async function renderCart() {
  if (!requireAccount()) return;
  setBusy(DOM.cartGrid);
  await loadProtectedData();
  try {
    const rows = await Promise.all(catalog.cartItems.map(async (item) => ({ item, part: await getSparePart(item.spare_part) })));
    DOM.cartGrid.innerHTML = rows.length ? rows.map(({ item, part }) => `<article class="cart-row"><div><p class="eyebrow">${escapeHtml(part.sku)}</p><h4>${escapeHtml(partLabel(part))}</h4></div><label>QUANTITY<input data-cart-quantity="${item.id}" type="number" min="1" max="99" value="${item.quantity}"></label><button type="button" data-remove-cart="${item.id}">REMOVE</button></article>`).join('') : emptyState('Your saved-parts cart is empty.');
  } catch (error) {
    DOM.cartGrid.innerHTML = emptyState(error.message);
  }
}

async function updateCart(itemId, quantity) {
  try {
    await api.updateCartItem(itemId, Math.max(1, Number(quantity) || 1));
    await renderCart();
    setStatus('Quantity updated.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function removeCart(itemId) {
  try {
    await api.removeCartItem(itemId);
    await renderCart();
    setStatus('Part removed from saved cart.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function renderAccount() {
  const authenticated = isAuthenticated() && view.profile;
  DOM.authForms.hidden = authenticated;
  DOM.profileCard.innerHTML = authenticated ? `<article class="profile-card"><p class="eyebrow">AUTHENTICATED WITH JWT</p><h3>${escapeHtml(view.profile.email)}</h3><p>${escapeHtml([view.profile.first_name, view.profile.last_name].filter(Boolean).join(' ') || view.profile.username)}</p><button type="button" data-logout>LOGOUT</button></article>` : emptyState('Login or register to use Garage, Favorites and Cart.');
}

async function handleLogin(form) {
  const values = new FormData(form);
  setStatus('Signing in…');
  try {
    const tokens = await api.login(values.get('email'), values.get('password'));
    setTokens(tokens);
    form.reset();
    await loadProtectedData();
    renderAccount();
    setStatus('Login successful.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function handleRegister(form) {
  const values = new FormData(form);
  setStatus('Requesting an email verification code…');
  try {
    await api.register(values.get('email'), values.get('password'));
    DOM.verifyForm.hidden = false;
    DOM.verifyForm.elements.email.value = values.get('email');
    DOM.verifyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setStatus('Verification code sent. Check your email.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function handleVerify(form) {
  const values = new FormData(form);
  setStatus('Verifying email…');
  try {
    await api.verifyEmail(values.get('email'), values.get('code'));
    form.reset();
    form.hidden = true;
    document.querySelector('#login-form').elements.email.value = values.get('email');
    setStatus('Email verified. You can now log in.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function bindEvents() {
  document.querySelectorAll('[data-open-data]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.openData)));
  DOM.backdrop.addEventListener('click', closePanel);
  DOM.panel.querySelector('[data-close-panel]').addEventListener('click', closePanel);
  DOM.panel.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.tab)));
  DOM.carFilters.addEventListener('submit', (event) => { event.preventDefault(); loadCars(1); });
  DOM.carFilters.elements.brand.addEventListener('change', () => {
    const brand = DOM.carFilters.elements.brand.value;
    [...DOM.carFilters.elements.model.options].forEach((option) => {
      option.hidden = Boolean(brand && option.value && String(catalog.models.get(Number(option.value))?.brand) !== String(brand));
    });
    if (brand && String(catalog.models.get(Number(DOM.carFilters.elements.model.value))?.brand) !== String(brand)) DOM.carFilters.elements.model.value = '';
  });
  DOM.shopFilters.addEventListener('submit', (event) => { event.preventDefault(); loadShop(1); });
  document.querySelector('#login-form').addEventListener('submit', (event) => { event.preventDefault(); handleLogin(event.currentTarget); });
  document.querySelector('#register-form').addEventListener('submit', (event) => { event.preventDefault(); handleRegister(event.currentTarget); });
  DOM.verifyForm.addEventListener('submit', (event) => { event.preventDefault(); handleVerify(event.currentTarget); });
  DOM.panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.selectCar) chooseCar(button.dataset.selectCar);
    if (button.dataset.addGarage) addGarage(button.dataset.addGarage);
    if (button.dataset.removeGarage) removeGarage(button.dataset.removeGarage);
    if (button.dataset.partDetail) showPartDetail(button.dataset.partDetail);
    if (button.dataset.toggleFavorite) toggleFavorite(button.dataset.toggleFavorite);
    if (button.dataset.addCart) addToCart(button.dataset.addCart);
    if (button.dataset.removeCart) removeCart(button.dataset.removeCart);
    if (button.dataset.pageScope === 'cars') loadCars(Number(button.dataset.page));
    if (button.dataset.pageScope === 'shop') loadShop(Number(button.dataset.page));
    if (button.hasAttribute('data-logout')) {
      clearTokens();
      view.profile = null;
      catalog.garage = [];
      catalog.favorites = [];
      catalog.cartItems = [];
      renderAccount();
      renderCars();
      setStatus('You are logged out.', 'success');
    }
  });
  DOM.panel.addEventListener('change', (event) => {
    if (event.target.matches('[data-cart-quantity]')) updateCart(event.target.dataset.cartQuantity, event.target.value);
  });
  window.addEventListener('keydown', (event) => { if (event.code === 'Escape' && DOM.panel.classList.contains('is-open')) closePanel(); });
  window.addEventListener('auto-anatomy:auth-changed', (event) => {
    if (event.detail?.authenticated) return;
    view.profile = null;
    catalog.garage = [];
    catalog.favorites = [];
    catalog.cartItems = [];
    renderAccount();
    if (['garage', 'favorites', 'cart'].includes(view.active)) showView('account');
  });
}

export async function initializeDataApplication() {
  createShell();
  bindEvents();
  setBusy(DOM.carsGrid, 'Connecting to Django API…');
  setBusy(DOM.shopGrid, 'Connecting to Django API…');
  try {
    await loadReferenceData();
    await restoreSelectedCar();
    DOM.selectedCarLabel.textContent = getSelectedCar() ? carLabel(getSelectedCar()) : 'NOT SELECTED';
    await loadProtectedData();
    await Promise.all([loadCars(1), loadShop(1)]);
    renderAccount();
  } catch (error) {
    setStatus(error.message, 'error');
    DOM.carsGrid.innerHTML = emptyState(error.message);
    DOM.shopGrid.innerHTML = emptyState(error.message);
  }
}
