-- 001_create_users.sql
-- Reference: docs/ERD_Regimens.docx

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    username      VARCHAR(60)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'assistant'
                  CHECK (role IN ('owner', 'assistant')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
0-