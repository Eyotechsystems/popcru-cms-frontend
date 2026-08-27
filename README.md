# POPCRU CMS — Frontend

React + Vite + Tailwind frontend for the POPCRU Case Management System.
Built around the POPCRU torch mark's colors (ember red, gold, ink black on
warm paper).

## What's built so far

- Login (JWT auth against the backend)
- Route protection (redirects to `/login` if not authenticated)
- **Admin/Coordinator dashboard**: live stats, cases-by-month trend chart,
  cases-by-province chart, searchable/filterable case table, case creation
  (with membership-number lookup), case allocation (with workload-limit
  warning surfaced, and required reason on reallocation)

## Not built yet (next iterations)

- Dedicated Cases and Members pages (sidebar links to these currently
  fall back to the dashboard — see the note in `src/App.jsx`)
- Manager, Practitioner, and Attorney dashboards/views
- Document upload/viewing UI
- Internal messaging UI
- Member feedback viewing UI (Manager-only)
- Appointments UI
- Member-facing feedback submission form (public, no login)

## Local development

```bash
npm install
cp .env.example .env      # point VITE_API_URL at your backend
npm run dev
```

Runs on http://localhost:5173. Point `VITE_API_URL` at your local backend
(`http://localhost:5050/api`) or the live Render API.

## Deploying to Vercel

1. Push this folder to its own GitHub repo (or a `frontend/` subfolder of
   an existing one — just set Vercel's "Root Directory" accordingly).
2. In Vercel: **New Project** → import the repo.
3. Framework preset: **Vite**.
4. Environment variable: `VITE_API_URL` = `https://popcru-cms-api.onrender.com/api`
5. Deploy.
6. Once you have the Vercel URL, update `FRONTEND_URL` in Render's
   environment variables to match it — the backend's CORS config uses
   this to decide which origins can call the API.

## Login

Use the seeded admin account (`admin` / — see your notes; recommend
rotating it once you're set up) or any user created via `POST /api/users`.
Only `system_admin`, `coordinator`, and `manager` roles can currently
reach the dashboard's stats/reports endpoints — practitioner/attorney
logins will authenticate fine but won't have a dashboard built for them
yet.
