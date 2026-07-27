# Deploy Regimens

Recommended path: **one Render web service** that runs the API and serves the built React app, plus a **Render Postgres** database.

## Prerequisites

1. Code pushed to GitHub (`Logical883/regimens`)
2. A free [Render](https://render.com) account
3. Change the demo password after first login (`owner` / `owner1234` → **Settings → Security**)

## Option A — Blueprint (fastest)

1. Push the latest `main` (includes `render.yaml`).
2. In Render: **New → Blueprint** → select the `regimens` repo.
3. Apply the blueprint. It creates:
   - Postgres (`regimens-db`)
   - Web service (`regimens`) that builds frontend, migrates, seeds, and starts the API
4. Optional env on the web service:
   - `CORS_ORIGIN` = your public URL, e.g. `https://regimens.onrender.com`  
     (can leave empty for same-origin SPA)
5. Wait for the first deploy (free tier can take a few minutes cold-start).
6. Open `https://YOUR-SERVICE.onrender.com` and log in.

## Option B — Manual setup

### 1. Postgres

Render → **New → PostgreSQL** → create `regimens-db` → copy **Internal Database URL**.

### 2. Web service

Render → **New → Web Service** → connect the GitHub repo.

| Setting | Value |
|--------|--------|
| Root Directory | *(leave empty — repo root)* |
| Runtime | Node |
| Build Command | `npm run deploy:prepare && npm install --prefix database` |
| Start Command | `npm run migrate --prefix database && npm run seed --prefix database && npm start --prefix backend` |
| Health Check Path | `/api/health` |

Environment variables:

```
NODE_ENV=production
USE_MOCK_DB=false
DATABASE_URL=<Internal Database URL from Postgres>
DATABASE_SSL=true
JWT_SECRET=<paste a long random string, 32+ chars>
JWT_EXPIRES_IN=12h
CORS_ORIGIN=https://YOUR-SERVICE.onrender.com
```

### 3. Deploy

Click **Deploy**. When healthy, visit the service URL.

## Local check before deploy

```powershell
cd frontend
npm run build
cd ..\backend
$env:NODE_ENV="production"
npm start
```

Open `http://localhost:4000` — you should see the app (API + built UI).

## After go-live checklist

- [ ] Login works
- [ ] Inventory / categories persist after refresh
- [ ] Settings → change owner password
- [ ] Backup (owner) create works
- [ ] `/api/health` returns `{"status":"ok","mode":"postgres"}`

## Notes

- **Free Render** spins down after idle; first request may be slow (~30–60s).
- Seed is idempotent (safe to re-run); it recreates demo data only if missing.
- Never commit `.env` files. Secrets live only in the host dashboard.
- Sale UI was removed; Profit needs sales rows in the DB (seed or API) to show numbers.

## Alternatives

| Host | Good for |
|------|----------|
| **Railway** | Similar all-in-one Node + Postgres |
| **Vercel (frontend) + Render (API)** | Split deploy; set `VITE_API_URL` and `CORS_ORIGIN` |
| **VPS (DigitalOcean, etc.)** | Full control + Nginx + HTTPS |

If you want Railway or a split Vercel setup instead, say which one and we can add those configs next.
