import { apiRequest, pageResults, queryString } from "../api.js";

export async function listAll(path, options = {}) {
  const rows = [];
  let url = `${path}${path.includes("?") ? "&" : "?"}page_size=100`;
  while (url) {
    const payload = await apiRequest(url, options);
    rows.push(...pageResults(payload));
    url = Array.isArray(payload) ? null : payload.next;
  }
  return rows;
}

export const managementApi = {
  list: (resource, params = {}) =>
    apiRequest(`/api/manage/${resource}/${queryString(params)}`, {
      auth: true,
    }),
  all: (resource) => listAll(`/api/manage/${resource}/`, { auth: true }),
  save: (resource, record) =>
    apiRequest(`/api/manage/${resource}/${record.id ? `${record.id}/` : ""}`, {
      method: record.id ? "PATCH" : "POST",
      auth: true,
      body: record,
    }),
  remove: (resource, id) =>
    apiRequest(`/api/manage/${resource}/${id}/`, {
      method: "DELETE",
      auth: true,
    }),
  overview: () => apiRequest("/api/manage/overview/", { auth: true }),
  generateProducts: (car = "") => apiRequest("/api/manage/generate-products/", { method: "POST", auth: true, body: car ? { car: Number(car) } : {} }),
  imports: () => listAll("/api/manage/import-jobs/", { auth: true }),
  createImport: (form) => apiRequest("/api/manage/import-jobs/", { method: "POST", auth: true, body: form }),
  importJob: (id) => apiRequest(`/api/manage/import-jobs/${id}/`, { auth: true }),
  reviewImport: (id, components) => apiRequest(`/api/manage/import-jobs/${id}/review/`, { method: "PATCH", auth: true, body: { components } }),
  publishImport: (id) => apiRequest(`/api/manage/import-jobs/${id}/publish/`, { method: "POST", auth: true, body: {} }),
  retryImport: (id) => apiRequest(`/api/manage/import-jobs/${id}/retry/`, { method: "POST", auth: true, body: {} }),
  platformSection: (section) => apiRequest(`/api/manage/platform/${section}/`, { auth: true }),
};

export async function getCatalog() {
  const [brands, models, categories, productBrands, productCategories] =
    await Promise.all([
      listAll("/api/cars/brands/"),
      listAll("/api/cars/models/"),
      listAll("/api/cars/categories/"),
      listAll("/api/shop/brands/"),
      listAll("/api/shop/categories/"),
    ]);
  return { brands, models, categories, productBrands, productCategories };
}

export function carName(car, catalog) {
  const model = catalog?.models?.find((row) => row.id === car.car_model);
  const brand = catalog?.brands?.find((row) => row.id === model?.brand);
  return (
    [brand?.name, model?.name].filter(Boolean).join(" ") || `Vehicle ${car.id}`
  );
}
