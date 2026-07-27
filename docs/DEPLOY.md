# Deploy Regimens (split hosting)

**Frontend → Vercel**  
**API + Postgres → Render**

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

Optional env on `regimens-api`:

| Key | Value |
|-----|--------|
| `CORS_ORIGIN` | Your Vercel URL, e.g. `https://regimens.vercel.app` (no trailing slash) |

Leave `CORS_ORIGIN` empty until Vercel is live, then set it and **Manual Deploy** once.

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

3. Environment variable (Production):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

4. Deploy. Open the Vercel URL and log in with `owner` / `owner1234`, then change the password in **Settings → Security**.

---

## 3) Connect CORS

On Render `regimens-api` → Environment:

```
CORS_ORIGIN=https://YOUR-APP.vercel.app
```

Redeploy the API. Then hard-refresh the Vercel site.

---

## Checklist

- [ ] `/api/health` on Render returns `{"status":"ok","mode":"postgres"}`
- [ ] Vercel site loads login page
- [ ] Login works (no CORS errors in browser console)
- [ ] Inventory persists after refresh
- [ ] Owner password changed

## Notes

- Free Render sleeps when idle; first API call after idle can take ~30–60s.
- Never commit `.env` files. Set secrets only in Vercel/Render dashboards.
- Local dev: keep using Vite proxy (`VITE_API_URL=/api`) + backend on port 4000.
