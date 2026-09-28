import { useState } from "react";
import { api, pageResults } from "../api.js";
import { carName, getCatalog } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { VehicleCard } from "../components/CatalogCards.jsx";
import { useLanguage } from "../i18n.js";
import {
  FormField,
  SearchInput,
  StateView,
  Pagination,
} from "../components/UI.jsx";

export default function CarsPage() {
  const { t } = useLanguage();
  const [brand, setBrand] = useState(""),
    [year, setYear] = useState(""),
    [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const state = useApi(async () => {
    const [payload, catalog] = await Promise.all([
      api.cars({ brand, year, page }),
      getCatalog(),
    ]);
    return { payload, catalog };
  }, [brand, year, page]);
  const rows = pageResults(state.data?.payload).filter((car) =>
    `${carName(car, state.data?.catalog)} ${car.year}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="page">
      <header className="page-heading">
        <p className="eyebrow">{t("collection")}</p>
        <h1>
          {t("collectionTitle")}
        </h1>
        <p>{t("collectionDescription")}</p>
      </header>
      <div className="filters">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormField label={t("manufacturer")}>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("allManufacturers")}</option>
            {state.data?.catalog.brands.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("year")}>
          <input
            type="number"
            placeholder={t("anyYear")}
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          />
        </FormField>
      </div>
      {state.loading || state.error ? (
        <StateView {...state} />
      ) : rows.length ? (
        <>
          <div className="catalog-grid">
            {rows.map((car) => (
              <VehicleCard
                key={car.id}
                car={car}
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
        <StateView empty={t("noVehicles")} />
      )}
    </main>
  );
}
