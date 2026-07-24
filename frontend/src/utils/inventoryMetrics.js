export function categorizeProduct(product, categories = []) {
  const text = `${product.name || ""} ${product.sku || ""}`.toLowerCase();

  for (const category of categories) {
    const tokens = String(category.keywords || category.name || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tokens.some((token) => text.includes(token))) {
      return category.name;
    }
  }

  return "Other";
}

export function formatCedi(value) {
  const n = Number(value) || 0;
  return `₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function productStatus(product) {
  const quantity = Number(product.quantity) || 0;
  const min = Number(product.min_stock_level) || 0;
  if (quantity <= 0) return "out";
  if (quantity < min) return "low";
  return "in";
}

export function enrichProducts(products = [], categories = []) {
  return products.map((p) => {
    const quantity = Number(p.quantity) || 0;
    const unit = Number(p.unit_price) || 0;
    const min = Number(p.min_stock_level) || 0;
    return {
      ...p,
      quantity,
      unit_price: unit,
      min_stock_level: min,
      totalValue: quantity * unit,
      category: categorizeProduct(p, categories),
      status: productStatus(p),
    };
  });
}

export function buildInventoryMetrics(products = [], categories = []) {
  const enriched = enrichProducts(products, categories);

  const byCategoryMap = {};
  for (const p of enriched) {
    if (!byCategoryMap[p.category]) {
      byCategoryMap[p.category] = { category: p.category, value: 0, units: 0 };
    }
    byCategoryMap[p.category].value += p.totalValue;
    byCategoryMap[p.category].units += p.quantity;
  }

  const lowStock = enriched.filter((p) => p.status === "low");
  const outOfStock = enriched.filter((p) => p.status === "out");

  return {
    enriched,
    totalItems: enriched.length,
    totalUnits: enriched.reduce((s, p) => s + p.quantity, 0),
    stockValue: enriched.reduce((s, p) => s + p.totalValue, 0),
    lowCount: lowStock.length,
    outCount: outOfStock.length,
    categoryCount: Object.keys(byCategoryMap).length,
    byCategory: Object.values(byCategoryMap).sort((a, b) => b.value - a.value),
    topByValue: [...enriched].sort((a, b) => b.totalValue - a.totalValue).slice(0, 8),
    reorderAlerts: [...outOfStock, ...lowStock].slice(0, 10),
  };
}

export function buildCategoryCards(products = [], categories = []) {
  const enriched = enrichProducts(products, categories);
  const cards = categories.map((category) => {
    const items = enriched.filter((p) => p.category === category.name);
    const reorderCount = items.filter((p) => p.status !== "in").length;
    const totalValue = items.reduce((s, p) => s + p.totalValue, 0);
    return {
      ...category,
      items,
      itemCount: items.length,
      totalValue,
      reorderCount,
      preview: items.slice(0, 4),
      moreCount: Math.max(0, items.length - 4),
    };
  });

  const otherItems = enriched.filter((p) => p.category === "Other");
  if (otherItems.length) {
    cards.push({
      id: "cat-other",
      name: "Other",
      description: "Uncategorized items",
      keywords: "",
      items: otherItems,
      itemCount: otherItems.length,
      totalValue: otherItems.reduce((s, p) => s + p.totalValue, 0),
      reorderCount: otherItems.filter((p) => p.status !== "in").length,
      preview: otherItems.slice(0, 4),
      moreCount: Math.max(0, otherItems.length - 4),
    });
  }

  return cards.sort((a, b) => a.name.localeCompare(b.name));
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}