# ReliefDesk – Disaster Assistance Request System (HACK-P437)

A web app where people affected by a disaster can request help, and responders can triage and dispatch it.

## Features
- **Citizen request form:** need type, urgency, group size, vulnerable people, location (with GPS), details
- **Tracking:** each request gets an ID (e.g. `RD-4821`) with a live status timeline
- **Responder desk (login required):** requests ranked by priority score, filters, team assignment, status updates, auto-refresh
- **Priority score:** urgency weight + group size (capped at 20) x 1.5 + 6 per vulnerable group, capped at 100
- **Security basics:** hashed passwords (bcrypt), JWT auth, input validation, rate limiting on public endpoints, tracking endpoint hides name and phone

## Tech stack
Node.js 22+, Express, SQLite (built-in `node:sqlite`), JWT, vanilla HTML/CSS/JS frontend.

## Run locally
```bash
git clone <your-repo-url>
cd reliefdesk
npm install
cp .env.example .env      # edit the values, or export them in your shell
npm start                 # http://localhost:3000
npm test                  # API smoke tests
```
Environment variables: `JWT_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `PORT`. The app reads them from the shell, so on
Windows PowerShell use `$env:ADMIN_PASS="..."` before `npm start`. Without them, defaults are used
(`admin` / `admin123`), which are **only for local development**.

## API
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/requests` | No | Submit a request |
| GET | `/api/track/:id` | No | Public status of one request |
| POST | `/api/login` | No | Get a responder token |
| GET | `/api/requests` | Yes | List all requests, highest priority first |
| PATCH | `/api/requests/:id` | Yes | Update `status` and/or `team` |

## Deploy (Render, free tier)
1. Push this repo to GitHub.
2. On render.com: **New > Web Service**, connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Environment: add `NODE_VERSION=22`, `JWT_SECRET` (long random string), `ADMIN_USER`, `ADMIN_PASS`.
5. Deploy and open the URL.

Note: on the free tier the SQLite file is wiped on redeploy or restart. For a persistent demo, attach a Render disk
mounted at `/opt/render/project/src/data`, or switch to a hosted Postgres.

## Project structure
```
server.js     API routes, auth, validation
db.js         SQLite schema and admin seeding
public/       Frontend (index.html)
test.js       Smoke tests
```

## Limitations and future work
Map view, SMS/WhatsApp alerts, multilingual UI, offline-first submission, multiple responder roles, Postgres for production scale.
