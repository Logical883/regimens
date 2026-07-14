# database

PostgreSQL migrations and seed data for Regimens.

Owners: Francis, Raymond

Planned structure:
```
database/
├── migrations/   ← one file per table/change, in order
├── seeds/        ← sample data for local development
└── backups/      ← local backup exports (git-ignored, do not commit real backups)
```

Reference: `../docs/ERD_Regimens.docx` for exact table names, columns, and constraints.
Do not rename a column or table without flagging it in the team chat first — the backend code
in `../backend` will assume these exact names.
