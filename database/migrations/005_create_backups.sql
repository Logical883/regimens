-- 005_create_backups.sql
-- Reference: docs/ERD_Regimens.docx

CREATE TABLE IF NOT EXISTS backups (
    id         SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL REFERENCES users(id),
    file_path  VARCHAR(255) NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'completed'
               CHECK (status IN ('completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
