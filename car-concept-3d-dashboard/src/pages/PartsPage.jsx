import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, pageResults } from "../api.js";
import { getCatalog } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { PartCard } from "../components/CatalogCards.jsx";
import { FormField, StateView, Pagination } from "../components/UI.jsx";

export default function PartsPage() {
  const [query] = useSearchParams();
  const [brand, setBrand] = useState(query.get("brand") || ""),
    [category, setCategory] = useState(query.get("category") || ""),
    [sku, setSku] = useState(query.get("sku") || ""),
    [page, setPage] = useState(1);
  const state = useApi(async () => {
    const params = {
      brand,
      category,
      sku,
      page,
      car_part: query.get("car_part") || "",
    };
    const [payload, catalog] = await Promise.all([
      query.get("car")
        ? api.compatibleParts(query.get("car"), params)
        : api.spareParts(params),
      getCatalog(),
    ]);
    return { payload, catalog };
  }, [brand, category, sku, page, query.toString()]);
  const rows = pageResults(state.data?.payload);
  return (
    <main className="page">
      <header className="page-heading">
        <p className="eyebrow">Parts discovery</p>
        <h1>
          The right part.
          <br />A recorded connection.
        </h1>
        <p>
          {query.get("car")
            ? "Showing products with a recorded compatibility for the selected vehicle."
            : "Explore the product archive. Compatibility is always supplied by the catalog."}
        </p>
      </header>
      <div className="filters">
        <FormField label="Manufacturer">
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All manufacturers</option>
            {state.data?.catalog.productBrands.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Category">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {state.data?.catalog.productCategories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Exact SKU">
          <input
            value={sku}
            onChange={(e) => {
              setSku(e.target.value);
              setPage(1);
            }}
            placeholder="Product reference"
          />
        </FormField>
      </div>
      {state.loading || state.error ? (
        <StateView {...state} />
      ) : rows.length ? (
        <>
          <div className="catalog-grid catalog-grid--parts">
            {rows.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                catalog={state.data.catalog}
              />
            ))}
          </div>
          <Pagination
            payload={state.data.payload}
            page={page}
            setPage={setPage}
          />
        </>
      ) : (
        <StateView empty="No products match this selection." />
      )}
    </main>
  );
}
