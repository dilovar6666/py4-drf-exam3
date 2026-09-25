import { api, pageResults } from './api.js';

const SELECTED_CAR_KEY = 'auto_anatomy_selected_car_id';

const state = {
  selectedCar: null,
  carParts: [],
  partsByComponentId: new Map()
};

let partCategoriesPromise = null;

async function getPartCategories() {
  if (!partCategoriesPromise) {
    partCategoriesPromise = api.partCategories({ page_size: 100 })
      .then((payload) => new Map(pageResults(payload).map((category) => [category.id, category])))
      .catch((error) => {
        partCategoriesPromise = null;
        throw error;
      });
  }
  return partCategoriesPromise;
}

function storedCarId() {
  try {
    return window.localStorage.getItem(SELECTED_CAR_KEY);
  } catch {
    return null;
  }
}

function storeCarId(id) {
  try {
    window.localStorage.setItem(SELECTED_CAR_KEY, String(id));
  } catch {
    // Selection remains available until this page is closed.
  }
}

export function getSelectedCar() {
  return state.selectedCar;
}

export function getSelectedCarPart(componentId) {
  return state.partsByComponentId.get(componentId) || null;
}

export function getSelectedCarParts() {
  return [...state.carParts];
}

export async function selectCar(car, { notify = true } = {}) {
  state.selectedCar = car;
  if (car) {
    const [partsPayload, categories] = await Promise.all([
      api.carParts(car.id),
      getPartCategories()
    ]);
    state.carParts = pageResults(partsPayload).map((part) => ({
      ...part,
      category_name: categories.get(Number(part.category))?.name || `Category #${part.category}`
    }));
  } else {
    state.carParts = [];
  }
  state.partsByComponentId = new Map(state.carParts.map((part) => [part.component_id, part]));
  if (car) storeCarId(car.id);
  if (notify) {
    window.dispatchEvent(new CustomEvent('auto-anatomy:selected-car', {
      detail: { car: state.selectedCar, parts: getSelectedCarParts() }
    }));
  }
  return state;
}

export async function restoreSelectedCar() {
  const id = storedCarId();
  if (id) {
    try {
      return await selectCar(await api.car(id), { notify: false });
    } catch {
      // The saved record may no longer exist; choose from the live catalog below.
    }
  }
  const payload = await api.cars({ page_size: 1 });
  const [firstCar] = pageResults(payload);
  if (firstCar) await selectCar(firstCar, { notify: false });
  return state;
}

export async function resolveModelUrl(fallbackUrl) {
  const candidate = state.selectedCar?.model_url;
  if (!candidate || candidate === fallbackUrl || /(^|\.)example\.com(?=\/|$)/i.test(new URL(candidate, window.location.href).hostname)) {
    return fallbackUrl;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(candidate, { method: 'HEAD', mode: 'cors', signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && (/gltf|octet-stream/i.test(contentType) || /\.glb(?:$|\?)/i.test(candidate))
      ? candidate
      : fallbackUrl;
  } catch {
    return fallbackUrl;
  } finally {
    window.clearTimeout(timer);
  }
}
