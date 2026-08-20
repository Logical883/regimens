-- FIFO cost layers so leftover old stock keeps its original cost.
-- Sales still charge the product's current unit_price (shelf price).

CREATE TABLE IF NOT EXISTS product_stock_layers (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_cost           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    unit_price          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    quantity_remaining  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_remaining >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_stock_layers_fifo
    ON product_stock_layers (product_id, created_at, id);

-- Existing on-hand stock becomes one opening layer per product.
INSERT INTO product_stock_layers (product_id, unit_cost, unit_price, quantity_remaining, created_at)
SELECT id, cost_price, unit_price, quantity, created_at
FROM products
WHERE quantity > 0
  AND NOT EXISTS (
      SELECT 1 FROM product_stock_layers l WHERE l.product_id = products.id
  );
