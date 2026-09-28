const ALLOWED = new Set(["select_component", "focus_component", "open_component", "search_products", "open_store", "filter_products", "set_explode_percentage"]);
const COMPONENT_ACTIONS = new Set(["select_component", "focus_component", "open_component"]);
const PRODUCT_ACTIONS = new Set(["search_products", "filter_products"]);

export function validateViewerActions(actions, carId, components = []) {
  if (!Array.isArray(actions)) return [];
  const known = new Set(components.map((row) => row.component_id));
  return actions.slice(0, 5).filter((action) => {
    if (!action || !ALLOWED.has(action.type)) return false;
    if (COMPONENT_ACTIONS.has(action.type)) return Boolean(carId && known.has(action.componentId));
    if (PRODUCT_ACTIONS.has(action.type)) return Boolean(carId && (!action.componentId || known.has(action.componentId)));
    if (action.type === "set_explode_percentage") return Number.isInteger(action.value) && action.value >= 0 && action.value <= 100;
    return true;
  }).map((action) => {
    if (COMPONENT_ACTIONS.has(action.type)) return { type: action.type, componentId: action.componentId };
    if (PRODUCT_ACTIONS.has(action.type)) return { type: action.type, ...(action.componentId ? { componentId: action.componentId } : {}) };
    if (action.type === "set_explode_percentage") return { type: action.type, value: action.value };
    return { type: action.type };
  });
}
