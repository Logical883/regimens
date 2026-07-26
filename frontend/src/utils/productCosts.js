const STORAGE_KEY = "regimens_product_costs";

/** @deprecated Read-only legacy fallback; costs now live on the product API. */
export function getCostMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Prefer API `cost_price`; fall back to legacy localStorage if the field is absent. */
export function getProductCost(product) {
  if (!product) return 0;
  if (product.cost_price !== undefined && product.cost_price !== null && product.cost_price !== "") {
    return Number(product.cost_price) || 0;
  }
  const map = getCostMap();
  return Number(map[String(product.id)]) || 0;
}

/** Clear legacy local cost cache (no longer written by the app). */
export function clearLocalProductCosts() {
  localStorage.removeItem(STORAGE_KEY);
}
