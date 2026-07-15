-- 003_create_sales.sql
-- Reference: docs/ERD_Regimens.docx

CREATE TABLE IF NOT EXISTS sales (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    sync_status  VARCHAR(20) NOT NULL DEFAULT 'synced'
                 CHECK (sync_status IN ('synced', 'pending')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at);
