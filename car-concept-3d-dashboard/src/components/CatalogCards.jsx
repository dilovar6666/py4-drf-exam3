import { Link } from "react-router-dom";
import { useState } from "react";
import { carName } from "../api/catalog.js";
import { useLanguage } from "../i18n.js";
export function PreviewImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className="preview-unavailable">Preview unavailable</span>
  );
}
export function VehicleCard({ car, catalog }) {
  const { t } = useLanguage();
  return (
    <Link className="catalog-card vehicle-card" to={`/cars/${car.id}`}>
      <div className="catalog-card__image">
        <PreviewImage src={car.image_url} alt={carName(car, catalog)} />
      </div>
      <div className="catalog-card__copy">
        <span className="eyebrow">{car.year || t("yearUndocumented")}</span>
        <h2>{carName(car, catalog)}</h2>
        <p>{car.description}</p>
        <span className="text-link">Explore vehicle ↗</span>
      </div>
    </Link>
  );
}
export function PartCard({ part, catalog, image }) {
  const brand = catalog?.productBrands?.find((row) => row.id === part.brand);
  return (
    <Link className="catalog-card part-card" to={`/parts/${part.id}`}>
      {image && (
        <div className="catalog-card__image">
          <img src={image} alt={part.name} loading="lazy" />
        </div>
      )}
      <div className="catalog-card__copy">
        <span className="eyebrow">
          {brand?.name || "Part"} · {part.sku}
        </span>
        <h2>{part.name}</h2>
        <p>{part.description}</p>
        <span className="text-link">View details ↗</span>
      </div>
    </Link>
  );
}
