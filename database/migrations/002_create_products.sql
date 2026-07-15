-- 002_create_products.sql
-- Reference: docs/ERD_Regimens.docx

CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    sku             VARCHAR(60) UNIQUE,
    quantity        INTEGER      NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    min_stock_level INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
