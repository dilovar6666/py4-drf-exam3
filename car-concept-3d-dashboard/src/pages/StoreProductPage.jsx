import { Link, useParams } from "react-router-dom";
import { api, getAccessToken, pageResults } from "../api.js";
import { useApi } from "../hooks/useApi.js";
import { Button, StateView } from "../components/UI.jsx";
import { carName, getCatalog } from "../api/catalog.js";
import { API_BASE_URL } from "../api.js";

export default function StoreProductPage() {
  const { productId } = useParams();
  const state = useApi(async () => {
    const product = await api.sparePart(productId);
    if (getAccessToken()) api.recordRecentlyViewed("product", Number(productId)).catch(() => {});
    const [images, compatibilities, catalog, linkedPart] = await Promise.all([
      api.sparePartImages(productId),
      api.compatibilities({ spare_part: productId, page_size: 100 }),
      getCatalog(),
      product.car_part ? api.carPartDetail(product.car_part) : Promise.resolve(null),
    ]);
    const cars = await Promise.all(pageResults(compatibilities).map((row) => api.car(row.car)));
    return { product, images: pageResults(images), compatibilities: pageResults(compatibilities), cars, catalog, linkedPart };
  }, [productId]);
  if (state.loading || state.error) return <main className="page"><StateView {...state} /></main>;
  const { product, images, compatibilities, cars, catalog, linkedPart } = state.data;
  const category = catalog.productCategories.find((row) => row.id === product.category)?.name || "Product";
  const brand = catalog.productBrands.find((row) => row.id === product.brand)?.name || "Brand not listed";
  return <main className="page store-product-page"><Link className="text-link" to="/store">← Store</Link><div className="product-detail-grid"><section>{images.map((image) => <img key={image.id} src={image.image_url} alt={product.name} loading="lazy" />)}</section><article><p className="eyebrow">Product listing / {category}</p><h1>{product.name}</h1><h2>{brand}</h2><p>{product.description}</p><dl className="technical">{product.sku && <div><dt>SKU</dt><dd>{product.sku}</dd></div>}{product.oem_number && <div><dt>OEM / part number</dt><dd>{product.oem_number}</dd></div>}</dl><h3>Recorded vehicle compatibility</h3>{compatibilities.length ? <ul>{compatibilities.map((record, index) => <li key={record.id}><Link to={`/cars/${record.car}`}>{carName(cars[index], catalog)} · {cars[index].year}</Link></li>)}</ul> : <p>Compatibility has not been confirmed in the catalog.</p>}{linkedPart && <Button secondary to={`/cars/${linkedPart.car}/components/${encodeURIComponent(linkedPart.component_id)}`}>View linked component</Button>}</article></div></main>;
}
