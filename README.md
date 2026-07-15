# Regimens

Inventory Management System for Outstretched Arm Enterprise
Built by **Team StoreSync** — COE 454 (Software Engineering), KNUST Department of Computer Engineering

## What is this?

Outstretched Arm Enterprise, a small retail stationery business, currently tracks inventory and sales
by hand in a notebook. Regimens replaces that with a simple, offline-first inventory and sales system.

## Repo Structure

This is a single monorepo. Everyone pushes into the folder that matches their area of work:

```
regimens/
├── backend/     ← Node.js + Express API (owner: Albert, assisted by Hafsa)
├── frontend/    ← React web app (owner: Peter, David, Benjamin)
├── database/    ← PostgreSQL migrations & seed data (owner: Francis, Raymond)
├── docs/        ← Team documents: ADRs, ERD, API Schema, UI/UX guide, collaboration guide
└── .github/     ← Issue templates
```

## Tech Stack

- **Backend:** Node.js, Express, JWT auth
- **Database:** PostgreSQL
- **Frontend:** React (web)
- **Offline support:** Local-first writes with a sync queue, last-write-wins conflict resolution

See `docs/Architecture_Decision_Records.docx` for the reasoning behind each choice.

## Where to Start

| If you're working on... | Read this first |
|---|---|
| Database schema | `docs/ERD_Regimens.docx` |
| Backend endpoints | `docs/API_Schema_Regimens.docx` |
| Frontend screens | `docs/UIUX_Design_Guide_Week2.docx` then `docs/API_Schema_Regimens.docx` |
| "What am I supposed to be doing?" | `docs/Team_Collaboration_Guide_Regimens.docx` |

## Local Setup

You'll run three things: the database migrations, the backend, and the frontend. Open a
terminal for each of the last two (they need to stay running).

### 1. Database

```
cd database
cp .env.example .env
npm install
npm run migrate
npm run seed        # optional, but recommended for local dev — creates a demo login
```

This creates a demo account: `username: owner`, `password: owner1234`, plus 5 sample
products.

### 2. Backend

```
cd backend
cp .env.example .env
npm install
npm run dev
```

Confirm it's up: `curl http://localhost:4000/api/health` should return `{"status":"ok"}`.

### 3. Frontend

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the URL it prints (typically `http://localhost:5173`) and log in with the demo
account above.

Each folder's own README has more detail — see `backend/README.md`, `database/README.md`,
and `frontend/README.md`.

## Team

| Name | Role |
|---|---|
| Ntim Francis Gyan | Database management & maintenance |
| Ampaabeng Raymond Kyeremeh | Database management & maintenance |
| Peter Appiah | Frontend dev |
| David Kwame Castel | UI/UX & Frontend dev |
| Nuamah Asamoaa Hafsa | Documentation & backend support |
| Ayapong Albert Yeboah | Backend lead & AI work |
| Benjamin Azumah | UI/UX & Frontend dev |

## Branching & Workflow

- `main` is always kept working. Don't push straight to `main` for anything non-trivial.
- Create a branch per task, named `area/short-description`, e.g. `backend/auth-login`, `db/products-table`, `frontend/new-sale-screen`.
- Open a Pull Request into `main` when a task is done. One other teammate reviews before merging, per the Team Charter's decision-making process.
- Keep commits small and describe *what* and *why*, not just "update files".
