-- 007_add_cost_category_unit_cost.sql
-- Product cost/category for inventory; unit_cost stamped on sale lines for profit.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (cost_price >= 0);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (unit_cost >= 0);
