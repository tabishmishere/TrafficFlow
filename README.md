# TrafficFlow

TrafficFlow is an API gateway and observability MVP for developers who need to route requests to backend services through a managed gateway, control access with project API keys, and inspect the resulting request and health-check records. The repository contains an Express API and gateway plus a Next.js frontend connected to the API for authentication, project management, request history, dashboard aggregates, and health data.

The backend implements account registration and login, owner-scoped project management, gateway forwarding, Redis-backed rate limiting and token revocation, PostgreSQL request logs and dashboard aggregates, and scheduled health checks. Docker Compose supports local backend development. This is an in-progress project, not a production-ready hosted service.

## Implementation status

| Area | Status |
| --- | --- |
| Express API, Prisma schema, and PostgreSQL migrations | Implemented |
| Registration, login, bearer-token authentication, and logout revocation | Implemented |
| Project create, list, update, and delete | Implemented |
| Per-project API-key generation, masked metadata, and revocation | Implemented |
| HTTP gateway forwarding, per-project rate limits, and request logging | Implemented |
| Daily dashboard aggregates, paginated project request logs, latest health result | Implemented |
| Next.js UI and backend integration | Implemented for auth, projects, dashboard, request history, health, and project keys/settings |
| Per-project analytics | Not provided by the backend; the route links to supported dashboard and request-history views |
| Automated test suite, CI workflow, hosted deployment | Not present in the repository |

## Features

- **Gateway routing:** forwards `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` requests to a configured HTTP(S) target, preserving the request path and query parameters.
- **Project management:** creates, lists, updates, and deletes projects within the authenticated user's ownership scope. Projects can configure an optional description, health endpoint, and fixed-window rate limit.
- **API keys:** generates one key per project, returns the full key only on generation, exposes masked metadata later, and supports replacement and revocation.
- **Rate limiting:** uses a Redis atomic increment/expiry script for a fixed window, keyed by project and a SHA-256 hash of the client IP. Gateway responses include rate-limit headers.
- **Request history:** stores request ID, method, path, client IP, response status, success flag, latency, and timestamp for known projects, including rejected gateway keys and requests blocked by the rate limit.
- **Dashboard aggregates:** calculates per-user daily request totals, success/error counts and rates, average latency, top paths, status-code counts, and latest project health-state counts from persisted data.
- **Health monitoring:** checks configured health endpoints on startup and at a configured interval, stores results, and exposes the latest check for each project.
- **Frontend:** signs in/registers against the backend, persists the returned bearer-token session in browser local storage, and loads live project, dashboard, request-history, API-key, and health data. Existing public routes remain directly accessible; workspace routes show an API/sign-in state when a session is unavailable.

The dashboard and request/health APIs are based on stored backend records. The backend does not provide time-series analytics or a per-project analytics endpoint, so the project analytics route does not invent those metrics.

## Screenshots

No product screenshots are currently checked into the repository. The SVG files in `client/public` are framework starter assets, not TrafficFlow product screenshots.

## Architecture

```mermaid
flowchart LR
    Browser["Browser<br/>Next.js UI"]
    API["Express API<br/>:4000"]
    Auth["Auth and project controllers"]
    Gateway["Gateway controller"]
    Health["Scheduled health monitor"]
    Prisma["Prisma Client"]
    PostgreSQL[("PostgreSQL")]
    Redis[("Redis")]
    Target["Configured target API"]

    Browser -->|"JSON + bearer JWT"| API
    API --> Auth
    API --> Gateway
    API --> Health
    Auth --> Prisma
    Gateway --> Prisma
    Health --> Prisma
    Prisma --> PostgreSQL
    Auth -. "JWT revocation checks" .-> Redis
    Gateway -. "Fixed-window counters" .-> Redis
    Gateway --> Target
```

The API mounts management routes under `/api` and gateway routes under `/g/:projectId`. Management requests pass through bearer-token authentication and use Prisma for owner-scoped database operations. Gateway requests use a project API key instead: the controller loads the project, verifies the key hash, applies the Redis rate limit, forwards the request, and records the outcome in PostgreSQL. A background timer in each API process checks configured health endpoints; there is no distributed scheduler or leader election.

The browser frontend stores the JWT in local storage and sends it as `Authorization: Bearer <jwt>` for protected management requests. This keeps the current integration straightforward but leaves the token exposed to same-origin JavaScript; an HttpOnly cookie/BFF design and security review are appropriate before production use.

## Technology stack

| Layer | Technologies in the repository |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Lucide React, Source Code Pro |
| API and gateway | Node.js 22 in the Docker image, Express 5, TypeScript |
| Persistence | PostgreSQL 17 in Compose, Prisma 6 |
| Shared ephemeral state | Redis 7, using the Node Redis client |
| Authentication | JSON Web Tokens, `jsonwebtoken`, `bcryptjs` |
| Local container orchestration | Docker Compose |

## Project structure

```text
client/
  src/app/                  Next.js App Router pages and global styles
    (workspace)/            Dashboard and project routes
  src/components/           Shared layout, form, and page components
  src/lib/api.ts            Typed API requests and backend response types
  src/lib/session.ts        Browser JWT session storage
  src/lib/use-api-data.ts   Shared client-side resource loading
server/
  docker-compose.yml        API, migration, PostgreSQL, and Redis services
  Dockerfile                Multi-stage API image
  prisma/
    schema.prisma           PostgreSQL data model
    migrations/             Three checked-in schema migrations
  src/
    app.ts                  Express middleware and route registration
    index.ts                Redis connection, health monitor, HTTP server
    controllers/            Auth, project, API-key, dashboard, and gateway handlers
    middleware/             Bearer-token authentication
    routes/                 Auth, project, dashboard, and gateway route tables
    services/healthMonitor.ts
    lib/                    Prisma, Redis, and rate-limit helpers
```

## Getting started

### Prerequisites

- Node.js and npm. The backend Docker image uses Node.js 22; no `engines` field pins a local Node.js version.
- Docker Desktop / Docker Compose for the local PostgreSQL and Redis services (or existing compatible services).

### Configure local environment

Create `server/.env` (this file is ignored by Git). The following is a **placeholder example**, not a credential. Replace the passwords and JWT secret locally; do not commit the file.

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:3000

# Used by Docker Compose for its PostgreSQL container.
POSTGRES_USER=trafficflow
POSTGRES_PASSWORD=replace-with-a-local-password
POSTGRES_DB=trafficflow

# For local processes, PostgreSQL must be reachable at localhost.
DATABASE_URL=postgresql://trafficflow:replace-with-a-local-password@localhost:5432/trafficflow?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
REDIS_URL=redis://localhost:6379
GATEWAY_BASE_URL=http://localhost:4000
GATEWAY_TIMEOUT_MS=30000
HEALTH_CHECK_INTERVAL_MS=60000
HEALTH_CHECK_TIMEOUT_MS=5000
TRUST_PROXY=false
```

Use a URL-encoded password in `DATABASE_URL` if it contains characters that have special meaning in a URL. Compose requires `POSTGRES_PASSWORD` and `JWT_SECRET`; the Compose file supplies the container database and Redis URLs. `POSTGRES_USER` and `POSTGRES_DB` have local defaults in Compose. The two health-monitor variables and `GATEWAY_TIMEOUT_MS` are read by the Node process but are not currently passed through the API service's Compose environment; Compose therefore uses the code defaults for these settings. `GATEWAY_BASE_URL` changes the gateway URL returned in project responses; it does not itself configure a public network route.

For a local frontend-to-API connection, optionally create `client/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The frontend defaults to this URL when the variable is unset. If the API uses another origin, set its `CLIENT_ORIGIN` to the browser origin (for example `http://localhost:3000`) and set `NEXT_PUBLIC_API_URL` to the API origin, then restart both processes.

### Run the backend locally

In PowerShell, from the repository root:

```powershell
Set-Location server
docker compose up -d postgres redis
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

The API listens at `http://localhost:4000` by default. Check process liveness at `GET http://localhost:4000/health`.

Alternatively, build and run the API, database, and Redis in Compose:

```powershell
Set-Location server
docker compose up --build
```

Compose waits for PostgreSQL and Redis health checks, applies committed migrations with the `migrate` service, and then starts the API. PostgreSQL and Redis use named volumes. `docker compose down` stops the services while retaining their data; `docker compose down -v` also deletes those local volumes.

### Run the frontend

In a separate terminal:

```powershell
Set-Location client
npm ci
npm run dev
```

Open `http://localhost:3000`. All frontend routes remain directly accessible; sign in or register to load protected workspace data. Login, registration, project creation and editing, API-key management, dashboard, request history, health results, and project deletion call the API. The project analytics route remains informational because the backend does not provide per-project analytics.

## Environment variables

| Variable | Required | Default / use |
| --- | --- | --- |
| `DATABASE_URL` | Yes for Prisma and API operation | PostgreSQL connection string; Compose constructs the container value from `POSTGRES_*`. |
| `JWT_SECRET` | Yes for issuing or verifying tokens | No default; the API returns a configuration error for authentication if it is missing. |
| `PORT` | No | `4000`; Express listening port. |
| `CLIENT_ORIGIN` | No | `http://localhost:3000`; the single CORS origin. |
| `JWT_EXPIRES_IN` | No | `1d`; JWT lifetime. |
| `REDIS_URL` | No | `redis://localhost:6379`; Redis connection URL. |
| `GATEWAY_BASE_URL` | No | `http://localhost:4000`; base URL used to construct project gateway URLs. |
| `GATEWAY_TIMEOUT_MS` | No | `30000`; timeout for an upstream gateway request. |
| `HEALTH_CHECK_INTERVAL_MS` | No | `60000`; scheduled health-check interval. |
| `HEALTH_CHECK_TIMEOUT_MS` | No | `5000`; timeout for each health check. |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:4000`; browser-visible API origin used by the Next.js frontend. |
| `TRUST_PROXY` | No | `false`; when exactly `true`, Express trusts one proxy hop for client IP handling. |
| `POSTGRES_USER` | Compose only | `trafficflow`; PostgreSQL container user. |
| `POSTGRES_PASSWORD` | Required by Compose | No default; PostgreSQL container password, also used to construct Compose's `DATABASE_URL`. |
| `POSTGRES_DB` | Compose only | `trafficflow`; PostgreSQL container database name. |

`PORT`, `CLIENT_ORIGIN`, `JWT_SECRET`, and `JWT_EXPIRES_IN` are read by the API startup, application, and authentication code. The health-monitor settings and gateway timeout have safe code fallbacks. In the current Compose file, only `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GATEWAY_BASE_URL`, and `TRUST_PROXY` are forwarded as API environment settings; Compose provides `DATABASE_URL` and `REDIS_URL` for its services.

## API reference

Base URL for local development: `http://localhost:4000`. JSON management routes are mounted beneath `/api`; all `/api/projects` and `/api/dashboard` routes require a bearer token. Authentication routes and `/health` are public. Gateway routes use a project API key rather than a bearer token.

### Routes

| Method | Path | Authentication | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Returns `{ "status": "ok" }`. Process liveness only. |
| `POST` | `/api/auth/register` | None | Registers a user and returns `201`, a public user object, and a JWT. |
| `POST` | `/api/auth/login` | None | Verifies credentials and returns a public user object and a JWT. |
| `POST` | `/api/auth/logout` | Bearer JWT | Revokes the current JWT until its expiry; returns `204`. |
| `GET` | `/api/projects` | Bearer JWT | Lists projects owned by the authenticated user. |
| `POST` | `/api/projects` | Bearer JWT | Creates a project; returns `201`. |
| `PATCH` | `/api/projects/:projectId` | Bearer JWT | Updates one or more supported project fields. |
| `DELETE` | `/api/projects/:projectId` | Bearer JWT | Deletes an owned project and cascading records; returns `204`. |
| `GET` | `/api/projects/:projectId/requests?limit=50&cursor=<requestId>` | Bearer JWT | Returns a page of request logs and `nextCursor`; limit is 1–100, default 50. |
| `GET` | `/api/projects/:projectId/health` | Bearer JWT | Returns the latest recorded health result, or `null`. |
| `POST` | `/api/projects/:projectId/api-key` | Bearer JWT | Generates or replaces the project's key; full key returned once with `201`. |
| `GET` | `/api/projects/:projectId/api-key` | Bearer JWT | Returns masked key metadata or `null`. |
| `DELETE` | `/api/projects/:projectId/api-key` | Bearer JWT | Revokes the active key; returns `204`. |
| `GET` | `/api/dashboard` | Bearer JWT | Returns daily aggregates for the authenticated user's projects. |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/g/:projectId/*` | `X-TrafficFlow-Key` | Forwards an allowed request to the configured project target. |

There is no `GET /api/projects/:projectId` detail endpoint and no per-project analytics endpoint in the current backend. Project detail and analytics UI routes are frontend pages, not corresponding API capabilities.

### Authentication example

Registration requires `name`, `email`, `password`, and `confirmPassword`; the password must have at least eight characters. The API returns `{ "user": { "id": "...", "name": "...", "email": "..." }, "token": "..." }`.

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "replace-with-a-local-password",
  "confirmPassword": "replace-with-a-local-password"
}
```

For protected endpoints, send the returned token as:

```http
Authorization: Bearer <jwt>
```

### Project example

`targetApiUrl` must be an absolute HTTP or HTTPS URL. Description, health endpoint, and rate-limit settings are optional; the defaults are 100 requests per 60 seconds.

```http
POST /api/projects
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Store API",
  "description": "Store backend",
  "targetApiUrl": "https://api.example.com",
  "healthEndpoint": "https://api.example.com/health",
  "rateLimitRequests": 100,
  "rateLimitWindowSeconds": 60
}
```

A successful response wraps the project in a `project` property; that object contains `projectId`, `name`, `description`, `targetApiUrl`, `healthEndpoint`, `rateLimit: { requests, windowSeconds }`, `gatewayUrl`, `createdAt`, and `updatedAt`. `PATCH /api/projects/:projectId` accepts any non-empty subset of `name`, `description`, `targetApiUrl`, `healthEndpoint`, `rateLimitRequests`, and `rateLimitWindowSeconds`. Rate limits must be integers from 1 to 1,000,000 requests and 1 to 86,400 seconds.

### API key and gateway example

Generate a key through `POST /api/projects/:projectId/api-key`. Store the returned `apiKey` securely; it cannot be retrieved in full again. Send it to the gateway as `X-TrafficFlow-Key`:

```http
GET /g/proj_<generated-id>/products?page=2
X-TrafficFlow-Key: <project-api-key>
Accept: application/json
```

The gateway appends the incoming path to the configured target URL, appends incoming query parameters, and forwards the request body (up to 10 MB) and headers other than hop-by-hop headers. It returns the upstream status and response body. Gateway responses include an `X-Request-Id`; rate-limited responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`, with `Retry-After` when the request is blocked.

### Dashboard response fields

`GET /api/dashboard` returns `projects`, `requestsToday`, `successfulRequests`, `failedRequests`, `successRatePercent`, `errorRatePercent`, `averageLatencyMs`, `topEndpoints`, `statusCodes`, `apiHealth`, and `asOf`. Request aggregates cover the current UTC day. Rates and average latency are `null` when there are no request records; counts and arrays are empty/zero as appropriate. `apiHealth` contains `healthy`, `unhealthy`, and `unknown` counts.

Validation errors return a JSON `message`; common outcomes include `400` for invalid input, `401` for invalid/missing credentials, `404` for a missing or unowned project, and `409` for a duplicate registration email. Redis unavailability causes protected management requests and gateway forwarding to return `503` rather than bypassing revocation checks or rate limits.

## Security considerations

- **Passwords:** stored as bcrypt hashes with cost factor 12; password hashes are excluded from authentication responses.
- **JWTs:** signed with `JWT_SECRET`, include a token ID and expiry, and are checked against Redis revocation state on every protected request. Logout stores a revocation entry until the token expires.
- **API keys:** generated from cryptographically random bytes; only their SHA-256 hash and display metadata are stored. The full key is returned only on generation. **Current limitation:** the gateway forwards incoming headers other than hop-by-hop headers, which includes `X-TrafficFlow-Key`; the configured upstream therefore receives the presented gateway key. Do not treat the key as isolated from the target service. Filtering this credential from forwarded headers is a security-hardening item.
- **Authorization:** project list, update, delete, request, health, and key operations are scoped to the authenticated user. The gateway addresses projects by gateway ID and key.
- **Rate limiting:** Redis applies an atomic fixed-window counter keyed by project and hashed client IP. It is not a per-user or per-API-key limit. Correct client IP handling behind a proxy depends on carefully configuring `TRUST_PROXY`.
- **Availability dependency:** Redis is required for authentication revocation checks and gateway rate limiting. If unavailable, those paths fail closed with `503`.
- **SSRF exposure:** project target and health URLs accept arbitrary HTTP(S) URLs. There are no destination allowlists or private-network/IP-range protections; deploying this for untrusted users would expose server-side request forgery risk.
- **Additional hardening required:** the repository does not implement authentication endpoint throttling, account verification, password reset, or a documented production secrets/deployment model. CORS is configured for one origin and should be set deliberately for each deployment.
- **Operational privacy:** request logs persist client IPs and paths. The current schema has no retention or deletion policy independent of project deletion.

Do not expose the local placeholder values from the setup example as production credentials. Use a securely generated `JWT_SECRET`, managed database and Redis credentials, and TLS at the deployment edge before handling real user traffic.

## Engineering decisions and trade-offs

- **PostgreSQL with Prisma** stores durable users, project configuration, API-key hashes, gateway request logs, and health-check records. Relational constraints and indexes support ownership and the time/path/status query patterns currently used.
- **Redis** holds short-lived token revocations and rate counters, keeping high-frequency fixed-window updates out of PostgreSQL. This makes Redis availability part of the authentication and gateway availability path.
- **Atomic fixed-window limiting** uses a Lua script so increment and initial expiry happen as a single Redis operation. The trade-off is fixed-window boundary behavior and per-client-IP rather than identity-based quotas.
- **Request logging** records outcomes for requests to known projects, including authorization failures and upstream errors. Logging is best-effort: a failed log write is reported but does not replace the gateway response.
- **Scheduled health checks** run in the API process and persist only check results. This is straightforward for a single local instance, but multiple API replicas will run duplicate probes.
- **Browser API integration** uses bearer JWTs stored in local storage and typed fetch helpers. This avoids adding a server-side proxy or authentication framework, at the cost of exposing tokens to same-origin JavaScript.

## Testing and verification

No automated unit, integration, or end-to-end test files or test scripts are currently present. The repository has the following static verification scripts:

```powershell
# From server/
npm run typecheck
npm run build

# From client/
npx tsc --noEmit
npm run lint
npm run build
```

These commands check TypeScript, lint the client, and build both applications; they do not exercise API behavior against PostgreSQL/Redis. For the frontend integration, the client TypeScript check, lint, and production build passed. A live end-to-end run against a configured API/database was not performed in this change. No automated test suite or CI workflow is currently checked in. Manual API acceptance tests and a repeatable test database setup remain to be added.

## Current limitations

- The frontend stores bearer JWTs in local storage rather than an HttpOnly cookie; token theft is possible if an XSS vulnerability is introduced.
- Project analytics is not available as a backend endpoint. Dashboard analytics are daily and aggregated across the user's projects; request history is available per project as a cursor-paginated list.
- The backend has no automated test suite, and this repository has no CI workflow.
- Arbitrary project target and health URLs are accepted, leaving an SSRF risk if the service is exposed to untrusted users.
- Health checks are scheduled in each API process. Multiple replicas duplicate checks; no retention policy for request or health records is implemented.
- Docker Compose is configured for local development. AWS or another hosted deployment, production secret management, TLS/reverse-proxy configuration, and deployment automation are not included.
- There is no product screenshot or root-level license file in the repository.

## Roadmap

Planned work, not represented as completed:

1. Replace local-storage bearer-token handling with a reviewed HttpOnly-cookie or backend-for-frontend session design before production use.
2. Add unit and integration tests for auth, project ownership, API-key lifecycle, gateway forwarding, rate-limit behavior, and dashboard aggregation; add browser tests for frontend flows.
3. Add SSRF controls for configured target and health-check URLs, filter gateway credentials from upstream headers, add login/register throttling, and review production security configuration.
4. Move health checks to a single scheduled worker or distributed scheduler before running multiple API replicas; define retention and privacy requirements for operational logs.
5. Add CI for lint, typecheck, Prisma validation/migration checks, and test/build jobs.
6. Document and automate a deployment topology, TLS/proxy handling, secret management, backups, and service monitoring. No cloud deployment is currently configured.

## Contributing

There is no formal contribution guide or CI gate yet. For a proposed change, keep it scoped, describe its behavior and security implications, and run the relevant build/typecheck/lint commands above. Add automated tests when test infrastructure is introduced.

## License

No license file is present. The repository's licensing and reuse terms are therefore unspecified; do not assume an open-source license.
