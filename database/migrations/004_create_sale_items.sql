-- 004_create_sale_items.sql
-- Reference: docs/ERD_Regimens.docx

CREATE TABLE IF NOT EXISTS sale_items (
    id         SERIAL PRIMARY KEY,
    sale_id    INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal   NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);
