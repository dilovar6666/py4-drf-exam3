import { useParams, Link } from "react-router-dom";
import { api, pageResults } from "../api.js";
import { carName, getCatalog, listAll } from "../api/catalog.js";
import { useApi } from "../hooks/useApi.js";
import { StateView, Button } from "../components/UI.jsx";
import { PreviewImage } from "../components/CatalogCards.jsx";

export default function ProductPage() {
  const { productId } = useParams();
  const state = useApi(async () => {
    const [product, images, compatibility, catalog] = await Promise.all([
      api.sparePart(productId),
      api.sparePartImages(productId),
      listAll(`/api/shop/compatibilities/?spare_part=${productId}`),
      getCatalog(),
    ]);
    const [cars, component] = await Promise.all([
      Promise.all(
        compatibility.map((r) =>
          api.car(r.car).catch((error) => {
            if (error.status === 404) return null;
            throw error;
          }),
        ),
      ),
      product.car_part ? api.carPartDetail(product.car_part) : null,
    ]);
    return {
      product,
      images: pageResults(images),
      compatibility,
      cars,
      catalog,
      component,
    };
  }, [productId]);
  if (state.loading || state.error)
    return (
      <main className="page">
        <StateView {...state} />
      </main>
    );
  const { product, images, catalog, component, cars } = state.data;
  return (
    <main className="page product-page">
      <Link className="text-link" to="/parts">
        ← Parts archive
      </Link>
      <div className="product-layout">
        <div className="product-visual">
          {images.length ? (
            <PreviewImage src={images[0].image_url} alt={product.name} />
          ) : (
            <span>Image not published</span>
          )}
        </div>
        <section>
          <p className="eyebrow">
            {catalog.productBrands.find((r) => r.id === product.brand)?.name}
          </p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <dl className="technical">
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>OEM reference</dt>
              <dd>{product.oem_number || "Not published"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>
                {
                  catalog.productCategories.find(
                    (r) => r.id === product.category,
                  )?.name
                }
              </dd>
            </div>
          </dl>
          {component && (
            <Button
              secondary
              to={`/cars/${component.car}/components/${component.component_id}`}
            >
              Explore {component.name} ↗
            </Button>
          )}
          <h2>Recorded compatibility</h2>
          {cars.length ? (
            cars.map((car, i) =>
              car ? (
                <Link
                  className="compatibility-row"
                  key={state.data.compatibility[i].id}
                  to={`/cars/${car.id}`}
                >
                  <span>
                    {carName(car, catalog)} · {car.year}
                  </span>
                  <span>View vehicle ↗</span>
                </Link>
              ) : (
                <p key={i}>
                  This compatibility refers to an unpublished vehicle.
                </p>
              ),
            )
          ) : (
            <p>No vehicle compatibility has been published.</p>
          )}
        </section>
      </div>
    </main>
  );
}
