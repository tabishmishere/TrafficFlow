# TrafficFlow

**A lightweight API gateway and observability for routing, protecting, and inspecting backend API traffic.**

TrafficFlow gives developers one managed entry point in front of an API they already operate. Configure an upstream service, issue a project key, and send requests through a gateway that checks credentials, enforces a request limit, forwards traffic, and records the result. A small workspace provides project management, request history, daily aggregates, and optional health checks.

## Working application

The screenshot below shows the local TrafficFlow dashboard with request aggregates and configured projects:

![TrafficFlow dashboard displaying request totals, endpoint counts, response codes, and projects](docs/screenshots/dashboard.png)

## The problem it solves

When several backend APIs are called directly, access keys, request limits, and operational visibility can end up scattered across services. TrafficFlow explores a simple alternative: put a configurable gateway in front of an existing API and centralize basic access checks and request visibility.

TrafficFlow does **not** build or host the upstream API. It provides a gateway and a small management UI around services you configure.

## Features

- **Accounts and project ownership** — register, log in, and manage only your own projects.
- **API gateway** — forward `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` requests to a configured HTTP(S) target, preserving the path and query parameters and forwarding request bodies for non-GET methods.
- **Project API keys** — generate, replace, and revoke one key per project. The full key is displayed once; only its SHA-256 hash and masked metadata are stored.
- **Fixed-window rate limits** — count requests in Redis per project and client IP. Configure the request limit and time window per project.
- **Request history** — inspect status, path, method, latency, time, and client IP for gateway requests. The UI supports path/method filtering and paginated history.
- **Dashboard** — view actual request totals, success/failure rates, average latency, top paths, response-code counts, and health-state counts for the current UTC day.
- **Optional health monitoring** — periodically check a configured URL and save its status, HTTP code, response time, and check time.
- **In-page API tester** — send a GET request through a project gateway and inspect its status and response without using browser developer tools. The key is held in page state and is not saved by the tester.
- **Project settings** — update the upstream URL, health URL, request limit, and project details; replace/revoke the key or delete the project.

## Product flow

```mermaid
flowchart LR
    Browser["Browser workspace"]
    API["Express API"]
    Auth["JWT authentication"]
    Gateway["Project gateway"]
    Redis[("Redis")]
    Database[("PostgreSQL")]
    Target["Configured upstream API"]
    Monitor["Scheduled health checks"]

    Browser -->|"Management requests + bearer JWT"| API
    API --> Auth
    Auth -. "JWT revocation" .-> Redis
    API -->|"Prisma"| Database
    Browser -->|"Gateway request + project key"| Gateway
    Gateway -. "Fixed-window counter"| Redis
    Gateway -->|"Forward request"| Target
    Gateway -->|"Persist request log"| Database
    Monitor -->|"Check configured URL"| Target
    Monitor -->|"Persist check result"| Database
```

The browser calls the management API with a bearer token. Gateway calls use a separate project key in the `X-TrafficFlow-Key` header. The API verifies the key, applies the Redis rate limit, forwards the request, and writes its outcome to PostgreSQL. Health checks run in the API process on startup and at a configured interval.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide React |
| API and gateway | Node.js, Express 5, TypeScript |
| Data access and persistence | Prisma 6, PostgreSQL 17 (Docker Compose image) |
| Ephemeral state | Redis 7 (Docker Compose image) |
| Authentication and credentials | JWT (`jsonwebtoken`), `bcryptjs`, Node.js crypto |
| Local services | Docker Compose |

## Repository layout

```text
client/
  src/app/                  Next.js pages, layouts, and global styles
  src/components/           Workspace, project, tester, and shared UI
  src/lib/                  API client, session state, and data helpers
  package.json              Frontend scripts and dependencies
  Dockerfile                Frontend production image
server/
  src/app.ts                Express middleware and route registration
  src/index.ts              API startup, Redis connection, health monitor
  src/controllers/          Authentication, project, dashboard, and gateway logic
  src/routes/               Management and gateway route tables
  src/services/healthMonitor.ts
  prisma/schema.prisma      PostgreSQL data model
  prisma/migrations/        Checked-in database migrations
  Dockerfile                Backend build and runtime images
docker-compose.yml          Full-stack API, frontend, migration, PostgreSQL, and Redis services
docs/screenshots/
  dashboard.png             Screenshot of the working local dashboard
```

## Run locally

### Prerequisites

- Node.js 22 and npm (the backend Docker image uses Node.js 22; use the same major version locally).
- Docker Desktop with Docker Compose.
- Internet access if you want to test requests against a public upstream API.

There is no root-level package manager workspace. Install dependencies separately in `server/` and `client/`.

### 1. Configure the backend

Create `server/.env` from the checked-in template. This file should remain private and must not be committed. Replace the placeholder password and JWT secret with local values; use the same password in `POSTGRES_PASSWORD` and `DATABASE_URL`.

```powershell
Copy-Item .\server\.env.example .\server\.env
```

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:3000

POSTGRES_USER=trafficflow
POSTGRES_PASSWORD=change-this-local-password
POSTGRES_DB=trafficflow
DATABASE_URL=postgresql://trafficflow:change-this-local-password@localhost:5432/trafficflow?schema=public

JWT_SECRET=replace-with-a-long-random-local-secret
JWT_EXPIRES_IN=1d
REDIS_URL=redis://localhost:6379

GATEWAY_BASE_URL=http://localhost:4000
GATEWAY_TIMEOUT_MS=30000
HEALTH_CHECK_INTERVAL_MS=60000
HEALTH_CHECK_TIMEOUT_MS=5000
TRUST_PROXY=false
```

Use the **same local password** in `POSTGRES_PASSWORD` and `DATABASE_URL`. URL-encode special characters in the password when placing it in `DATABASE_URL` for the locally run API. Do not use the example secret or password for a deployed environment.

### 2. Start PostgreSQL and Redis, migrate the database, and run the API

In PowerShell, from the repository root:

```powershell
docker compose up -d postgres redis
Set-Location .\server
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:4000`. In another PowerShell window, check that it is responding:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

Expected response:

```text
status
------
ok
```

`/health` is a process liveness check; it does not verify database or Redis health.

### 3. Configure and run the frontend

The frontend defaults to `http://localhost:4000` for its API URL. If you need to set it explicitly, create `client/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

In a separate PowerShell window:

```powershell
Set-Location .\client
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and create a project. The backend CORS origin (`CLIENT_ORIGIN`) must match the origin in your browser. Restart the relevant process after changing environment variables.

### Run the whole app with Docker Compose

From the repository root, start the app with:

```powershell
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Compose builds and starts the frontend, API, database migration job, PostgreSQL, and Redis; the API waits for healthy Redis and completed migrations, and the frontend waits for a healthy API. The Compose file automatically loads `server/.env` for the backend and database services, so no `--env-file` flag or root `.env` is needed. To stop the app while preserving database and Redis data, run `docker compose down` from the repository root.

The root `docker-compose.yml` is the single orchestration file so one command can build and run both application tiers together with their dependencies. The backend `Dockerfile` stays in `server/`, where its build context and source are; a Compose file is not needed in that folder because Compose is now managed from the repository root. The frontend has its own `client/Dockerfile`. The PostgreSQL and Redis volume names are kept compatible with the previous `server/` Compose stack, so its existing default-named data volumes are reused. The backend `docker-entrypoint.js` is kept because it builds a correctly encoded PostgreSQL URL from the credentials and switches the local `localhost` database URL to the Compose hostname before starting the API or migrations.

The Compose file loads settings from `server/.env`. The API and migration container construct an encoded PostgreSQL URL from its database credentials, so passwords containing URL-special characters are supported. `NEXT_PUBLIC_API_URL` is compiled into the frontend image at build time; its default is suitable for local use. For a remote deployment, set it to the API's browser-accessible public URL and rebuild the frontend image. `docker compose down` stops containers but preserves named data volumes; `docker compose down -v` also deletes local database and Redis data.

## Environment variables

| Variable | Required | Default / purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for local API/Prisma commands | PostgreSQL URL; use `localhost` when running the API on the host. Compose constructs its own container URL. |
| `JWT_SECRET` | Yes for authentication | Secret used to sign and verify JWTs. |
| `POSTGRES_PASSWORD` | Yes for Compose | PostgreSQL container password; set it in `server/.env`. |
| `POSTGRES_USER` | No | Compose default: `trafficflow`. |
| `POSTGRES_DB` | No | Compose default: `trafficflow`. |
| `PORT` | No | API port; default `4000`. |
| `CLIENT_ORIGIN` | No | Allowed browser origin; default `http://localhost:3000`. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; default `1d`. |
| `REDIS_URL` | No | Redis URL; local-process default `redis://localhost:6379`. |
| `GATEWAY_BASE_URL` | No | Base used to construct project gateway URLs; default `http://localhost:4000`. |
| `GATEWAY_TIMEOUT_MS` | No | Upstream request timeout; default `30000`. |
| `HEALTH_CHECK_INTERVAL_MS` | No | Health-check interval; default `60000`. |
| `HEALTH_CHECK_TIMEOUT_MS` | No | Per-check timeout; default `5000`. |
| `TRUST_PROXY` | No | Set to exactly `true` to trust one proxy hop; default `false`. |
| `NEXT_PUBLIC_API_URL` | No | Browser-visible API origin; default `http://localhost:4000`. |

The Compose API service overrides `REDIS_URL` for container networking and constructs the PostgreSQL URL from the credentials in `server/.env`. `NEXT_PUBLIC_API_URL` is a frontend build argument rather than an API runtime variable.

## Try the gateway

1. In the workspace, create a project with target URL `https://jsonplaceholder.typicode.com/posts`.
2. Open **Settings**, optionally set the health endpoint to `https://jsonplaceholder.typicode.com/posts/1`, and save.
3. Generate a project API key and copy it immediately. The full key is only returned once.
4. Open the project **Overview**, paste the key into **Test your API**, and choose `/` or `/1` as the path.
5. Select **Send test**. A successful JSONPlaceholder response should display HTTP `200`; the request should also appear under **Traffic**.
6. Optionally lower the project rate limit to `2` requests per `60` seconds and send a third request within the same window. It should be rejected with HTTP `429`.
7. Open **Health** after a scheduled check has run. Health checks default to roughly once per minute; HTTP responses in the `2xx` or `3xx` range are considered healthy.

The API tester currently sends **GET** requests only. The gateway API itself supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`. The gateway URL appends the incoming path and query parameters to the configured target URL, so a target ending in `/posts` with tester path `/1` calls `/posts/1`.

## API overview

Management routes are mounted under `/api`. Project and dashboard routes require a bearer JWT; gateway routes require the project's `X-TrafficFlow-Key`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process liveness. |
| `POST` | `/api/auth/register` | Register and receive a JWT. |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT. |
| `POST` | `/api/auth/logout` | Revoke the current JWT using Redis. |
| `GET`, `POST` | `/api/projects` | List owned projects or create one. |
| `PATCH`, `DELETE` | `/api/projects/:projectId` | Update or delete an owned project. |
| `GET` | `/api/projects/:projectId/requests` | Read cursor-paginated request history. |
| `GET` | `/api/projects/:projectId/health` | Read the latest health result. |
| `GET`, `POST`, `DELETE` | `/api/projects/:projectId/api-key` | Read masked key metadata, generate/replace, or revoke a key. |
| `GET` | `/api/dashboard` | Read UTC-today aggregates for the user's projects. |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/g/:projectId/*` | Authenticate, rate-limit, and forward a gateway request. |

## Verification

There is currently no automated unit, integration, or browser test suite in the repository. These scripts perform static checks and production builds; they do not replace testing against running services.

```powershell
# Backend, from server/
npm run typecheck
npm run build

# Frontend, from client/
npm run lint
npx tsc --noEmit
npm run build
```

For an end-to-end smoke test, use **Try the gateway** above and confirm that the response appears in the tester and the matching request is recorded under **Traffic**.

## Current scope and limitations

- Docker Compose provides a local full-stack setup; it is not a production deployment configuration.
- Dashboard aggregates are based on persisted requests for the current UTC day. There is no time-series reporting or per-project analytics API; the analytics route is an informational placeholder.
- Health monitoring runs in each API process. Multiple API replicas would perform duplicate checks; there is no distributed scheduler.
- Rate limits are fixed-window counters keyed by project and client IP, not by user or API key.
- Bearer JWTs are stored in browser local storage. A future production deployment should review the session design and XSS exposure.
- Project target and health URLs accept HTTP(S) destinations without private-network/SSRF protections. Do not expose this MVP to untrusted users without adding destination controls.
- Authentication endpoint throttling, account verification, password recovery, data-retention policies, automated tests, CI, and deployment automation are not implemented.
- Request and health records are retained until their project is deleted; there is no independent retention policy.

## License

No license file is included. Reuse and distribution terms are therefore unspecified.
