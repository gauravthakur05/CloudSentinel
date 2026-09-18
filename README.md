# CloudSentinel — Phase 1 MVP

Intelligent Cloud Log Monitoring platform (final-year B.Tech project).
This is the **Phase 1 MVP**: authentication, synthetic log generation,
log ingestion/storage, filtered retrieval, and a basic React dashboard.
No Kafka/RabbitMQ, no ML anomaly detection yet — those are later phases.

Everything here runs entirely on synthetic, locally generated data. No real
cloud credentials, external systems, or third-party data are used anywhere.

## Folder structure

```
cloudsentinel/
├── docker-compose.yml        # Wires mongo + backend + frontend together
├── backend/
│   ├── src/
│   │   ├── config/db.js      # MongoDB connection
│   │   ├── models/           # User, Log (Mongoose schemas + indexes)
│   │   ├── middleware/       # JWT auth, role-based access control
│   │   ├── controllers/      # auth + log/analytics business logic
│   │   ├── routes/           # Express route definitions
│   │   ├── utils/logGenerator.js   # Synthetic log generator
│   │   ├── scripts/generateLogs.js # One-off DB seeding script
│   │   ├── app.js            # Express app assembly (testable, no listen())
│   │   └── server.js         # Entry point: connects DB, starts server + generator
│   ├── test/                 # Jest + Supertest test suite
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── api/client.js     # Axios instance with JWT injection
    │   ├── context/AuthContext.jsx
    │   ├── pages/Login.jsx, Dashboard.jsx
    │   └── components/OverviewCards.jsx, ServiceChart.jsx, LogTable.jsx, ProtectedRoute.jsx
    ├── package.json
    ├── .env.example
    └── Dockerfile
```

## Prerequisites

- Docker + Docker Compose (recommended path), **or**
- Node.js 20+ and a local/Atlas MongoDB instance (manual path)

## Option A — Run everything with Docker Compose (recommended)

```bash
cd cloudsentinel
docker compose up --build
```

This starts three containers:

| Service  | URL                      | Notes                                   |
|----------|--------------------------|------------------------------------------|
| mongo    | localhost:27017          | Persists to a named volume               |
| backend  | http://localhost:5000    | Express API, auto-generates synthetic logs every 2s |
| frontend | http://localhost:5173    | React dashboard                          |

Open **http://localhost:5173**, register a user (choose role "admin" or
"analyst"), and you'll land on the dashboard. Logs start appearing within a
couple of seconds because the backend's background generator is running.

To stop: `docker compose down` (add `-v` to also wipe the Mongo volume).

## Option B — Run manually (without Docker)

**1. Start MongoDB** — either `mongod` locally on port 27017, or use a free
MongoDB Atlas cluster and copy its connection string.

**2. Backend**
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI (local or Atlas), and change JWT_SECRET to any long random string
npm install
npm run dev          # nodemon, auto-restarts on change
# or: npm start
```
Verify it's up: `curl http://localhost:5000/health` → `{"status":"ok",...}`

**3. Frontend** (in a second terminal)
```bash
cd frontend
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev
```
Open the printed URL (usually http://localhost:5173).

## Testing each module

The backend has an automated Jest + Supertest suite covering the pieces
that don't require a live database connection (pure logic, mocked models):

```bash
cd backend
npm install
npm test
```

Expected: **21 tests passing**, covering:
- `logGenerator.js` — valid field ranges, unique request IDs, ERROR/CRITICAL
  logs skewing toward higher response times than INFO (this shape matters
  later for anomaly detection).
- `authController` — registration validation, password hashing (verified
  with `bcrypt.compare`, not just "a hash exists"), duplicate-email
  rejection, role defaulting to `analyst`, JWT claims, login success/failure.
- Log routes — auth required on every route, RBAC (`DELETE` restricted to
  `admin`), query-param → MongoDB filter construction, pagination limits,
  ingestion validation.

> **Why mocked models instead of a real test database?** This environment's
> network is restricted to package registries, so it can't download a real
> `mongod` binary for an in-memory test database. The tests instead mock
> the Mongoose model calls to verify all the *logic* (validation, RBAC,
> hashing, filter-building) deterministically. Full end-to-end behavior
> against a real MongoDB is verified manually below and via Docker Compose,
> where a real `mongo:7` container is used.

**Manual end-to-end test** (after `docker compose up` or Option B):

```bash
# 1. Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"password123","role":"admin"}'
# → returns { token, user }. Copy the token.

TOKEN="paste_token_here"

# 2. Generate synthetic logs on demand
curl -X POST http://localhost:5000/api/logs/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"count": 50}'

# 3. Fetch logs, filtered
curl "http://localhost:5000/api/logs?level=ERROR&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 4. Dashboard overview stats
curl http://localhost:5000/api/analytics/overview -H "Authorization: Bearer $TOKEN"

# 5. Confirm RBAC: an "analyst" token should get 403 on DELETE
curl -X DELETE http://localhost:5000/api/logs/<some_id> -H "Authorization: Bearer $ANALYST_TOKEN"
```

Then check the React dashboard at http://localhost:5173 — it polls the
overview/service endpoints every 5 seconds and lets you filter the log
table live.

## API reference (Phase 1)

| Method | Endpoint                       | Auth       | Description                          |
|--------|---------------------------------|------------|---------------------------------------|
| POST   | /api/auth/register              | none       | Create a user (role: admin/analyst)   |
| POST   | /api/auth/login                 | none       | Get a JWT                             |
| GET    | /api/auth/me                    | required   | Current user info                     |
| POST   | /api/logs                       | required   | Ingest one or many logs               |
| POST   | /api/logs/generate              | required   | Generate N synthetic logs now         |
| GET    | /api/logs                       | required   | List logs (filters: service, level, from, to, q, hostname, requestId; pagination: page, limit) |
| GET    | /api/logs/:id                   | required   | Fetch a single log                    |
| DELETE | /api/logs/:id                   | admin only | Delete a log                          |
| GET    | /api/analytics/overview         | required   | Totals, last-hour count, level counts |
| GET    | /api/analytics/services         | required   | Per-service log count, avg response time, error count |

## What's deliberately deferred to later phases

- Kafka/RabbitMQ-based async ingestion (Phase 2) — right now the collector
  writes straight to MongoDB, which is fine at MVP log volumes.
- Rule-based and ML (Isolation Forest) anomaly detection (Phase 3).
- Alerts and incident management modules (Phase 3/5).
- CI/CD pipeline and cloud deployment (Phase 4).

## Security notes

- Passwords are hashed with bcrypt (10 salt rounds), never stored or logged
  in plaintext.
- JWT secret and Mongo URI are supplied via environment variables only —
  `.env` files are gitignored, only `.env.example` templates are committed.
- All log data is synthetically generated in-process; nothing here reads
  from or writes to any real, third-party, or unauthorized system.
