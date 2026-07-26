# Security notes for Regimens (finance-adjacent inventory)

## Already enforced in code

- JWT auth on protected API routes; owner-only for backup
- Strong `JWT_SECRET` required at boot (32+ chars; weak defaults refused)
- Helmet security headers on the API
- CORS allow-list via `CORS_ORIGIN`
- Global + login rate limiting
- Request body size limit (256kb)
- Parameterized SQL (no string-concat queries for user data)
- Sync product updates use a field whitelist (blocks SQL injection via keys)
- Backup restore paths are constrained under `database/backups/`
- Sale payloads validated (ids, quantities, max lines)
- Generic 401 login messages (no username enumeration)
- `.env` files gitignored — never commit DB passwords or JWT secrets

## Operator checklist

1. Set a unique `JWT_SECRET` per environment (32+ random characters)
2. Keep `USE_MOCK_DB=false` only when Postgres is secured and migrated
3. Restrict `CORS_ORIGIN` to your real frontend URL(s) in production
4. Use HTTPS in production (reverse proxy / hosting)
5. Change the demo `owner` / `owner1234` password before any real deployment
6. Limit who can access the Postgres host and backups folder
7. Prefer least-privilege DB roles for the app (not superuser)

## Out of scope for this course scaffold (future hardening)

- Refresh-token rotation / server-side token revocation list
- MFA for owner accounts
- Encrypted backups at rest
- WAF / IP allow-lists
- Formal penetration test
