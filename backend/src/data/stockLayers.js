// FIFO stock lots: leftover units keep the cost they arrived with.
// Sales always use the product's current selling price (shelf price).

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sortFifo(layers) {
  return [...layers].sort((a, b) => {
    const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (t !== 0) return t;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function remainingSum(layers) {
  return layers.reduce((sum, layer) => sum + (Number(layer.quantity_remaining) || 0), 0);
}

function addLayer(layers, layer) {
  const qty = Number(layer.quantity_remaining ?? layer.quantity) || 0;
  if (qty <= 0) return layers;
  return [
    ...layers,
    {
      id: layer.id,
      product_id: Number(layer.product_id),
      unit_cost: roundMoney(layer.unit_cost),
      unit_price: roundMoney(layer.unit_price),
      quantity_remaining: qty,
      created_at: layer.created_at || new Date().toISOString(),
    },
  ];
}

function consumeFifo(layers, quantity, fallbackCost = 0) {
  const qtyNeeded = Number(quantity) || 0;
  const next = layers.map((layer) => ({ ...layer }));
  let remaining = qtyNeeded;
  let costSum = 0;
  let taken = 0;

  for (const layer of sortFifo(next)) {
    if (remaining <= 0) break;
    const have = Number(layer.quantity_remaining) || 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    layer.quantity_remaining = have - take;
    costSum += take * (Number(layer.unit_cost) || 0);
    taken += take;
    remaining -= take;
  }

  if (remaining > 0) {
    costSum += remaining * (Number(fallbackCost) || 0);
    taken += remaining;
  }

  return {
    layers: next,
    weightedUnitCost: taken > 0 ? roundMoney(costSum / taken) : 0,
  };
}

function ensureCoverage(layers, { product_id, quantity, unit_cost, unit_price, id, created_at }) {
  const gap = (Number(quantity) || 0) - remainingSum(layers);
  if (gap <= 0) return layers;
  return addLayer(layers, {
    id,
    product_id,
    unit_cost,
    unit_price,
    quantity_remaining: gap,
    created_at,
  });
}

function applyQuantityDelta(
  layers,
  { product_id, delta, unit_cost, unit_price, id, created_at, fallbackCost }
) {
  const change = Number(delta) || 0;
  if (change > 0) {
    return addLayer(layers, {
      id,
      product_id,
      unit_cost,
      unit_price,
      quantity_remaining: change,
      created_at,
    });
  }
  if (change < 0) {
    return consumeFifo(layers, -change, fallbackCost).layers;
  }
  return layers;
}

function activeLayers(layers) {
  return sortFifo(layers).filter((layer) => (Number(layer.quantity_remaining) || 0) > 0);
}

module.exports = {
  roundMoney,
  sortFifo,
  remainingSum,
  addLayer,
  consumeFifo,
  ensureCoverage,
  applyQuantityDelta,
  activeLayers,
};
