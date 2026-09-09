# Deploy Regimens (split hosting)

**Frontend → Vercel**  
**API → a Node host (Render, Railway, or a teammate’s Render)**  
**Postgres → Neon (recommended) or the host’s Postgres**

---

## If Render says the free tier is exhausted

Free instance hours are **per Render workspace / month**. A second Web Service on **the same login** stays suspended until the next calendar month (or until someone pays).

Do **not** create extra fake accounts to dodge the limit.

**What works:**

1. Wait until hours reset next month, **or**
2. Deploy the API on a **teammate’s** Render account that still has hours, **or**
3. Move the API off Render (Railway / Fly / similar) and keep Vercel for the UI.

Do **not** use the old Blueprint (`regimens-api` + `regimens-db`) on a burned workspace. That used **two** free resources. The lighter path is **one Web Service** and Postgres on **Neon** (or mock mode for a class demo).

---

## Fresh API host (recommended: Web Service only)

### A) Postgres on Neon (data survives restarts)

1. Create a free project at [neon.tech](https://neon.tech) → copy `DATABASE_URL` (enable SSL).
2. On **Render** (a workspace that still has hours): **New → Web Service** → `Logical883/regimens`.
3. Settings:

| Setting | Value |
|--------|--------|
| Runtime | **Node** (or Docker if you select the repo `Dockerfile`) |
| Root directory | *(leave blank — repo root)* |
| Build command | `npm run render:build` |
| Start command | `npm run render:start` |
| Health check | `/api/health` |

4. Environment:

```
NODE_ENV=production
USE_MOCK_DB=false
DATABASE_URL=<paste Neon URL>
DATABASE_SSL=true
JWT_SECRET=<32+ random characters>
JWT_EXPIRES_IN=12h
CORS_ORIGIN=*.vercel.app
```

5. Create a public URL. Health: `https://YOUR-NEW-API.onrender.com/api/health` should be `{"status":"ok","mode":"postgres"}`.
6. On **Vercel** → Environment Variables: delete `VITE_API_URL` if it exists. Add `API_ORIGIN` = `https://YOUR-NEW-API.onrender.com` (no `/api` suffix, type **Config**). Redeploy.

### B) Demo-only, no database (uses mock data)

Same Web Service, but:

```
USE_MOCK_DB=true
JWT_SECRET=<32+ random characters>
CORS_ORIGIN=*.vercel.app
NODE_ENV=production
```

Leave `DATABASE_URL` unset. Health `mode` will be `"mock"`. Data **resets** whenever Render sleeps or restarts. Fine for a marking demo, not for a real shop.

---

## Railway (if Render is fully blocked)

1. [railway.app](https://railway.app) → New project → GitHub `Logical883/regimens`.
2. Add a Postgres plugin **or** paste a Neon `DATABASE_URL`.
3. Build/start from repo root: `npm run render:build` / `npm run render:start`.
4. Same env vars as table A. Generate a public domain.
5. On Vercel set `API_ORIGIN` to `https://YOUR-RAILWAY-DOMAIN` (no `/api` suffix). Do not set `VITE_API_URL`.

---

## 1) Render (API + database)

1. Push latest `main` to GitHub.
2. In [Render](https://render.com): **New → Blueprint** → select `Logical883/regimens`  
   (or update the existing blueprint / recreate the web service).
3. This creates:
   - Postgres: `regimens-db`
   - Web service: `regimens-api` (API only — no Vite build)
4. After deploy, copy the API URL, e.g. `https://regimens-api.onrender.com`
5. Confirm health: `https://YOUR-API.onrender.com/api/health`

Required env on `regimens-api` once the frontend is on Vercel:

| Key | Value |
|-----|--------|
| `CORS_ORIGIN` | `*.vercel.app` (covers production + preview URLs; no trailing slash) |

If login shows **Origin not allowed**, this value is missing or wrong — update it and **Manual Deploy** the API.

---

## 2) Vercel (frontend)

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `Logical883/regimens`
2. Configure:

| Setting | Value |
|--------|--------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

3. Environment variables:

| Key | Type on Vercel | Value |
|-----|----------------|--------|
| `API_ORIGIN` | **Config** or **Secret** (no `VITE_` prefix) | `https://YOUR-API.onrender.com` (no `/api` suffix) |

Do **not** set `VITE_API_URL` in Vercel. The browser calls same-origin `/api`; Vercel proxies to Render.

If Vercel still shows a warning on an old `VITE_API_URL`, **delete that variable**.

4. Deploy. Open the Vercel URL and log in with `owner` / `owner1234`, then change the password in **Settings → Security**.

---

## 3) Connect CORS

On Render `regimens-api` → **Environment**:

```
CORS_ORIGIN=*.vercel.app
```

(Optional: also add your exact URL, comma-separated, e.g. `*.vercel.app,https://regimens.vercel.app`.)

Save → **Manual Deploy** → hard-refresh the Vercel site. Localhost is always allowed by the API.

---

## Checklist

- [ ] `/api/health` on Render returns `{"status":"ok","mode":"postgres"}`
- [ ] Vercel site loads login page
- [ ] Login works (no CORS errors in browser console)
- [ ] Inventory persists after refresh
- [ ] Owner password changed

## Notes

- Free Render sleeps when idle; first API call after idle can take ~30–60s.
- While the Vercel app is open, the frontend pings `/api/health` every 30 seconds to reduce spin-down during demos.
- For keep-alive with **no browser open**, use a free monitor (e.g. [UptimeRobot](https://uptimerobot.com)) hitting  
  your **current** API `/api/health` every 5 minutes.
- Never commit `.env` files. Set secrets only in Vercel/Render dashboards.
- Local dev: keep using Vite proxy (`VITE_API_URL=/api`) + backend on port 4000.
