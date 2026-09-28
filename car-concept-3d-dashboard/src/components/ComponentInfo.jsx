import { api, apiRequest, pageResults } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { Button, StateView } from "./UI.jsx";
import { useLanguage } from "../i18n.js";

export default function ComponentInfo({
  carId,
  component,
  fallback,
  onClose,
  deep = false,
}) {
  const { t } = useLanguage();
  const state = useApi(async () => {
    if (!component) return { specifications: [], products: [] };
    const [specifications, products, compatible] = await Promise.all([
      api.partSpecifications(component.id),
      apiRequest(
        `/api/shop/car-parts/${component.id}/spare-parts/?page_size=100`,
      ),
      api.compatibleParts(carId, { page_size: 100, car_part: component.id }),
    ]);
    // A component relation is not itself proof of vehicle fitment.
    const compatibleIds = new Set(pageResults(compatible).map((row) => row.id));
    return {
      specifications: pageResults(specifications),
      products: pageResults(products).filter((row) =>
        compatibleIds.has(row.id),
      ),
    };
  }, [component?.id, carId]);
  const name = component?.name || fallback?.displayName || t("component");
  return (
    <aside
      className={`component-info ${deep ? "component-info--deep" : ""}`}
      aria-label={t("componentInformation")}
    >
      <div className="component-info__scroll">
      <header>
        <span className="eyebrow">
          {component?.category_name ||
            fallback?.category ||
            t("vehicleComponent")}
        </span>
        <button
          className="icon-button"
          aria-label={t("returnVehicleLabel")}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <h2>{name}</h2>
      <p>
        {component?.description ||
          "Select this component in the vehicle to inspect its geometry. Further technical information has not been published."}
      </p>
      {component?.function && (
        <div className="technical">
          <span className="eyebrow">{t("functionLabel")}</span>
          <p>{component.function}</p>
        </div>
      )}
      {state.loading ? (
        <p role="status">{t("loadingTechnical")}</p>
      ) : state.error ? (
        <p role="alert" className="error-text">
          {state.error.message}
        </p>
      ) : (
        state.data?.specifications.length > 0 && (
          <dl className="technical">
            {state.data.specifications.map((row) => (
              <div key={row.id}>
                <dt>{row.name}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        )
      )}
      <small className="component-id">
        {component?.component_id || fallback?.componentId}
      </small>
      <div className="actions">
        {!deep && (
          <Button
            secondary
            to={`/cars/${carId}/components/${component?.component_id || fallback?.componentId}`}
          >
            {t("exploreComponent")} →
          </Button>
        )}
        <Button to={`/store?car=${carId}&component=${encodeURIComponent(component?.component_id || fallback?.componentId || "")}`}>
          {t("findPart")} →
        </Button>
      </div>
      {deep && (
        <section className="component-products">
          <h3>{t("compatibleProducts")}</h3>
          {state.data?.products.length
            ? state.data.products.map((part) => (
              <Button key={part.id} secondary to={`/store/products/${part.id}`}>
                  {part.name} ↗
                </Button>
              ))
            : !state.loading &&
              !state.error && (
                <p>{t("noCompatibility")}</p>
              )}
        </section>
      )}
      </div>
    </aside>
  );
}
