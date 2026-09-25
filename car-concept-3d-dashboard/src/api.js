const runtimeConfig = window.__AUTO_ANATOMY_CONFIG__ || {};

export const API_BASE_URL = String(
  runtimeConfig.apiUrl || 'http://127.0.0.1:8000'
).replace(/\/$/, '');

const TOKEN_KEYS = {
  access: 'auto_anatomy_access_token',
  refresh: 'auto_anatomy_refresh_token'
};

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // The app can still work for this page when storage is unavailable.
  }
}

export function getAccessToken() {
  return readStorage(TOKEN_KEYS.access);
}

export function getRefreshToken() {
  return readStorage(TOKEN_KEYS.refresh);
}

export function setTokens({ access, refresh }) {
  if (access) writeStorage(TOKEN_KEYS.access, access);
  if (refresh) writeStorage(TOKEN_KEYS.refresh, refresh);
  window.dispatchEvent(new CustomEvent('auto-anatomy:auth-changed', { detail: { authenticated: true } }));
}

export function clearTokens() {
  writeStorage(TOKEN_KEYS.access, null);
  writeStorage(TOKEN_KEYS.refresh, null);
  window.dispatchEvent(new CustomEvent('auto-anatomy:auth-changed', { detail: { authenticated: false } }));
}

export function isAuthenticated() {
  return Boolean(getAccessToken() && getRefreshToken());
}

function readableError(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return payload.map((item) => readableError(item, '')).filter(Boolean).join(' ');
  if (payload.detail) return readableError(payload.detail, fallback);
  const first = Object.values(payload)[0];
  return first ? readableError(first, fallback) : fallback;
}

async function readResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('The server returned an unreadable response.', response.status);
  }
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh })
  }).then(async (response) => {
    const payload = await readResponse(response);
    if (!response.ok || !payload?.access) throw new ApiError('Your session has expired.', response.status, payload);
    setTokens({ access: payload.access, refresh: payload.refresh || refresh });
    return true;
  }).catch(() => {
    clearTokens();
    return false;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function requestUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(path, options = {}) {
  const {
    auth = false,
    retry = true,
    headers: customHeaders = {},
    body,
    ...fetchOptions
  } = options;
  const headers = { Accept: 'application/json', ...customHeaders };
  const requestBody = body && !(body instanceof FormData) && typeof body !== 'string'
    ? JSON.stringify(body)
    : body;
  if (requestBody && !(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const access = getAccessToken();
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let response;
  try {
    response = await fetch(requestUrl(path), { ...fetchOptions, headers, body: requestBody });
  } catch {
    throw new ApiError('Cannot reach the Auto Anatomy API. Check that Django is running.');
  }

  if (response.status === 401 && auth && retry && await refreshAccessToken()) {
    return apiRequest(path, { ...options, retry: false });
  }

  const payload = await readResponse(response);
  if (!response.ok) {
    if (response.status === 401 && auth) clearTokens();
    throw new ApiError(
      readableError(payload, response.status >= 500 ? 'The server could not complete the request.' : 'The request was rejected.'),
      response.status,
      payload
    );
  }
  return payload;
}

export function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export function pageResults(payload) {
  return Array.isArray(payload) ? payload : (payload?.results || []);
}

export const api = {
  register: (email, password) => apiRequest('/api/auth/register/', { method: 'POST', body: { email, password } }),
  verifyEmail: (email, code) => apiRequest('/api/auth/verify-email/', { method: 'POST', body: { email, code } }),
  login: (email, password) => apiRequest('/api/auth/login/', { method: 'POST', body: { email, password } }),
  profile: () => apiRequest('/api/auth/profile/', { auth: true }),

  brands: () => apiRequest('/api/cars/brands/'),
  models: (params = {}) => apiRequest(`/api/cars/models/${queryString(params)}`),
  partCategories: (params = {}) => apiRequest(`/api/cars/categories/${queryString(params)}`),
  cars: (params = {}) => apiRequest(`/api/cars/${queryString(params)}`),
  car: (id) => apiRequest(`/api/cars/${id}/`),
  carParts: (carId) => apiRequest(`/api/cars/${carId}/parts/`),
  carPart: (carId, componentId) => apiRequest(`/api/cars/${carId}/parts/${encodeURIComponent(componentId)}/`),
  carPartDetail: (id) => apiRequest(`/api/cars/parts/${id}/`),
  partSpecifications: (partId) => apiRequest(`/api/cars/parts/${partId}/specifications/`),
  relatedCarParts: (partId) => apiRequest(`/api/cars/parts/${partId}/related-parts/`),
  partSources: (partId) => apiRequest(`/api/cars/parts/${partId}/sources/`),
  userCars: () => apiRequest('/api/account/cars/', { auth: true }),
  addUserCar: (car) => apiRequest('/api/account/cars/', { method: 'POST', auth: true, body: { car } }),
  removeUserCar: (id) => apiRequest(`/api/account/cars/${id}/`, { method: 'DELETE', auth: true }),

  partBrands: () => apiRequest('/api/shop/brands/'),
  productCategories: () => apiRequest('/api/shop/categories/'),
  spareParts: (params = {}) => apiRequest(`/api/shop/parts/${queryString(params)}`),
  sparePart: (id) => apiRequest(`/api/shop/parts/${id}/`),
  sparePartImages: (id) => apiRequest(`/api/shop/parts/${id}/images/`),
  compatibleParts: (carId, params = {}) => apiRequest(`/api/shop/cars/${carId}/parts/${queryString(params)}`),
  compatibilities: (params = {}) => apiRequest(`/api/shop/compatibilities/${queryString(params)}`),

  favorites: () => apiRequest('/api/account/favorites/', { auth: true }),
  addFavorite: (sparePart) => apiRequest('/api/account/favorites/', { method: 'POST', auth: true, body: { spare_part: sparePart } }),
  removeFavorite: (id) => apiRequest(`/api/account/favorites/${id}/`, { method: 'DELETE', auth: true }),
  carts: () => apiRequest('/api/account/cart/', { auth: true }),
  cartItems: () => apiRequest('/api/account/cart/items/', { auth: true }),
  addCartItem: (sparePart, quantity = 1) => apiRequest('/api/account/cart/items/', { method: 'POST', auth: true, body: { spare_part: sparePart, quantity } }),
  updateCartItem: (id, quantity) => apiRequest(`/api/account/cart/items/${id}/`, { method: 'PATCH', auth: true, body: { quantity } }),
  removeCartItem: (id) => apiRequest(`/api/account/cart/items/${id}/`, { method: 'DELETE', auth: true })
};
