import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, pageResults } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { useLanguage } from "../i18n.js";
import { FormField, SearchInput, StateView } from "../components/UI.jsx";
import AIAssistant from "../components/AIAssistant.jsx";
import { carName, getCatalog } from "../api/catalog.js";
import { safeExternalUrl } from "../api/externalSearch.js";

export default function StorePage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [car, setCar] = useState(params.get("car") || "");
  const [component, setComponent] = useState(params.get("component") || "");
  const [external, setExternal] = useState(false);
  const { t } = useLanguage();
  const state = useApi(async () => {
    const [cars, catalog, results, components] = await Promise.all([
      api.cars({ page_size: 100 }),
      getCatalog(),
      query.trim().length >= 2 ? api.searchParts({ q: query, car, component, external: external ? 1 : undefined }) : Promise.resolve(null),
      car ? api.carParts(car, { page_size: 100 }) : Promise.resolve([]),
    ]);
    return { cars: pageResults(cars), catalog, results, components: pageResults(components) };
  }, [query, car, component, external]);
  return <main className="page store-page">
    <header className="page-heading"><p className="eyebrow">{t("storeEyebrow")}</p><h1>{t("store")}</h1><p>{t("catalogScope")}</p></header>
    <div className="store-filters">
      <SearchInput aria-label={t("search")} placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
      <FormField label={t("compatible")}><select value={car} onChange={(e) => setCar(e.target.value)}><option value="">{t("allCars")}</option>{state.data?.cars.map((row) => <option key={row.id} value={row.id}>{carName(row, state.data.catalog)} · {row.year}</option>)}</select></FormField>
      <FormField label={t("componentSearch")}><input value={component} onChange={(e) => setComponent(e.target.value)} placeholder={t("componentSearchHint")} /></FormField>
      <label className="check-filter"><input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} />{t("internet")}</label>
    </div>
    {state.loading || state.error ? <StateView {...state} /> : !state.data.results ? <StateView empty={t("catalogSearchHint")} /> : <>
      <section className="store-section"><h2>{t("local")}</h2>
        {state.data.results.local.products.length ? <div className="catalog-grid">{state.data.results.local.products.map((product) => <Link className="store-card" key={product.id} to={`/store/products/${product.id}`}><span className="eyebrow">{product.category} · {product.brand}</span><h3>{product.name}</h3><p>{product.description}</p><small>{product.oem_number || product.sku || "No part number published"}</small><strong>{product.compatible_cars.length ? product.compatible_cars.join(", ") : "Compatibility not confirmed"}</strong></Link>)}</div> : <p>{t("noResults")}</p>}
        {state.data.results.local.components.length > 0 && <div className="store-result-list"><h3>{t("componentList")}</h3>{state.data.results.local.components.map((item) => <Link key={`${item.car_id}-${item.id}`} to={item.url}>{item.car} · {item.name} <small>{item.category}</small></Link>)}</div>}
      </section>
      {external && <section className="store-section"><h2>{t("internet")}</h2>{!state.data.results.external?.available ? <p role="status">{t("unavailable")} {state.data.results.external?.error_code || "EXTERNAL_SEARCH_NOT_CONFIGURED"}</p> : state.data.results.external.results.length ? <div className="external-results">{state.data.results.external.results.map((item) => { const url = safeExternalUrl(item.url); if (!url) return null; return <a key={item.url} href={url} target="_blank" rel="noopener noreferrer"><strong>{item.title}</strong><span>{item.source}</span>{item.snippet && <span>{item.snippet}</span>}</a>; })}</div> : <p>{state.data.results.external.error || t("noResults")}</p>}</section>}
    </>}
    <AIAssistant carId={car ? Number(car) : null} component={state.data?.components?.find((item) => item.component_id === component) || null} components={state.data?.components || []} />
  </main>;
}
