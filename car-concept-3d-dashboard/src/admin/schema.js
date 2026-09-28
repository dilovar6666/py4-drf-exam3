const field = (
  name,
  label,
  type = "text",
  resource = null,
  optional = false,
) => ({ name, label, type, resource, optional });
export const RESOURCES = {
  cars: {
    title: "Cars",
    columns: ["id", "car_model", "year", "is_active"],
    fields: [
      field("car_model", "Model / title", "relation", "models"),
      field("year", "Year", "number"),
      field("description", "Description", "textarea"),
      field("model_url", "GLB URL", "url"),
      field("image_url", "Preview image URL", "url"),
      field("is_active", "Published / active", "checkbox"),
    ],
  },
  components: {
    title: "Components",
    columns: ["component_id", "name", "car", "category"],
    fields: [
      field("car", "Vehicle", "relation", "cars"),
      field("category", "Category", "relation", "component-categories"),
      field("component_id", "Semantic component ID"),
      field("name", "Name"),
      field("description", "Description", "textarea"),
      field("function", "Function / technical description", "textarea"),
      field("image_url", "Image URL", "url"),
    ],
  },
  products: {
    title: "Products",
    columns: ["name", "sku", "brand", "car_part", "is_draft"],
    fields: [
      field("name", "Name"),
      field("brand", "Manufacturer", "relation", "product-brands", true),
      field("category", "Category", "relation", "product-categories", true),
      field("car_part", "Associated component", "relation", "components", true),
      field("sku", "SKU", "text", null, true),
      field("oem_number", "OEM reference", "text", null, true),
      field("description", "Description", "textarea"),
      field("is_draft", "Draft / hidden from store", "checkbox"),
    ],
  },
  compatibility: {
    title: "Compatibility",
    columns: ["id", "spare_part", "car"],
    fields: [
      field("spare_part", "Product", "relation", "products"),
      field("car", "Compatible vehicle", "relation", "cars"),
    ],
  },
  specifications: {
    title: "Technical specifications",
    columns: ["car_part", "name", "value"],
    fields: [
      field("car_part", "Component", "relation", "components"),
      field("name", "Property"),
      field("value", "Value"),
    ],
  },
  images: {
    title: "Product images",
    columns: ["id", "spare_part", "image_url"],
    fields: [
      field("spare_part", "Product", "relation", "products"),
      field("image_url", "Image URL", "url"),
    ],
  },
  brands: {
    title: "Car manufacturers",
    columns: ["id", "name"],
    fields: [
      field("name", "Manufacturer name"),
      field("logo_url", "Logo URL", "url"),
    ],
  },
  models: {
    title: "Vehicle models",
    columns: ["id", "name", "brand"],
    fields: [
      field("name", "Model / title"),
      field("brand", "Manufacturer", "relation", "brands"),
    ],
  },
  "component-categories": {
    title: "Component categories",
    columns: ["id", "name"],
    fields: [
      field("name", "Name"),
      field("description", "Description", "textarea"),
    ],
  },
  "product-brands": {
    title: "Product manufacturers",
    columns: ["id", "name"],
    fields: [
      field("name", "Name"),
      field("logo_url", "Logo URL", "url"),
      field("website_url", "Website URL", "url"),
    ],
  },
  "product-categories": {
    title: "Product categories",
    columns: ["id", "name"],
    fields: [
      field("name", "Name"),
      field("description", "Description", "textarea"),
    ],
  },
};
export function recordLabel(resource, row, references) {
  if (!row) return "Unassigned";
  if (resource === "cars") {
    const model = references.models?.find((r) => r.id === row.car_model);
    const brand = references.brands?.find((r) => r.id === model?.brand);
    return `${brand?.name || ""} ${model?.name || `Model ${row.car_model}`} · ${row.year} (#${row.id})`.trim();
  }
  return `${row.name || row.component_id || row.sku || `Record ${row.id}`} (#${row.id})`;
}
