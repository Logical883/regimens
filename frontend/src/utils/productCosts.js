const STORAGE_KEY = "regimens_product_costs";

export function getCostMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getProductCost(product) {
  if (!product) return 0;
  if (product.cost_price !== undefined && product.cost_price !== null && product.cost_price !== "") {
    return Number(product.cost_price) || 0;
  }
  const map = getCostMap();
  return Number(map[String(product.id)]) || 0;
}

export function setProductCost(productId, costPrice) {
  const map = getCostMap();
  map[String(productId)] = Number(costPrice) || 0;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function removeProductCost(productId) {
  const map = getCostMap();
  delete map[String(productId)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}