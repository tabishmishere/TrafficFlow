# TrafficFlow

TrafficFlow is an API gateway and monitoring MVP with a minimal Next.js starter and an Express/TypeScript backend. The backend uses PostgreSQL through Prisma for accounts, projects, gateway request logs, analytics, and health history, and Redis for shared rate-limit counters.

> **Backend status:** authentication with token revocation, project management, API keys, gateway forwarding, Redis rate limiting, request history and analytics, and scheduled health checks are implemented. The client remains a starter UI and does not yet call these APIs. AWS deployment and production CI/CD are not configured.

## Repository layout

```text
client/                         Next.js App Router and Tailwind starter
server/
  prisma/
    schema.prisma               PostgreSQL models and relationships
    migrations/                 Initial database migration
  src/
    app.ts                      Express middleware and route registration
    index.ts                    HTTP server entry point
    controllers/                Auth, project, API-key, gateway, and dashboard handlers
    lib/                        Shared Prisma Client, Redis client, and rate limiter
    middleware/authenticate.ts  JWT bearer-token verification
    routes/                     Auth, project, dashboard, and gateway routes
    services/                   Scheduled API health checks
    types/                      Request and user TypeScript types
```

## Backend request flow

1. `src/index.ts` reads `PORT` and starts the Express application (default port `4000`).
2. `src/app.ts` loads environment variables, configures CORS, exposes `/health`, mounts the gateway before the regular JSON parser, and then mounts management APIs.
3. The gateway uses a route-local raw-body parser so payloads can be forwarded without JSON re-serialization. Project and dashboard management routes verify bearer JWTs and attach the token subject as `req.userId`; gateway clients use a project API key instead.
4. Controllers validate input and call the shared Prisma Client. Prisma maps those operations to PostgreSQL using the schema and migrations in `server/prisma`.

### Authentication flow

- Registration trims the name, normalizes the email to lowercase, checks the email format, and requires a password of at least eight characters.
- The password is hashed with bcryptjs (cost factor 12) before the user is inserted. The database unique constraint prevents duplicate email addresses; duplicates return `409`.
- Successful registration returns `201` with a public user object and a signed JWT. Login looks up the normalized email, compares the submitted password to the stored hash, and returns the same public user shape plus a JWT.
- Password hashes are never selected in the registration response and are explicitly excluded from the login response.
- JWTs contain the user ID in `sub`; lifetime is configured by `JWT_EXPIRES_IN` (default `1d`). Protected endpoints expect `Authorization: Bearer <token>`.
- `POST /api/auth/logout` revokes the current JWT in Redis until its expiry; subsequent protected requests with that token return `401`.

### Project flow

- `POST /api/projects` validates a non-empty project name and an absolute HTTP or HTTPS target URL. Description is optional.
- A project is saved with the authenticated user's ID and a generated, unique identifier such as `proj_...`. The response also includes a gateway URL based on `GATEWAY_BASE_URL`.
- Listing filters by the authenticated owner. Updates and deletes include both the project identifier and authenticated owner in the database condition. A missing project and another user's project both return `404`.
- Updates use `PATCH`, accept one or more of `name`, `description`, and `targetApiUrl`, and reject empty names or invalid target URLs.
- Projects default to 100 requests per 60 seconds. Update `rateLimitRequests` and `rateLimitWindowSeconds` with project fields. Configure an optional `healthEndpoint`; set it to `null` to disable checks.

### API keys and gateway forwarding

- Project owners can generate one API key per project. Keys use the `tf_live_` prefix and cryptographic random bytes. Only the SHA-256 hash and masking metadata are stored in PostgreSQL.
- The full key is returned once by the generation endpoint. Retrieval returns a masked key; generating another key replaces and invalidates the previous one. Revocation deletes the active key.
- Gateway clients send `X-TrafficFlow-Key`. The gateway resolves the project first, then checks the supplied key hash for that project. Unknown projects return `404`; missing, invalid, or revoked keys return `401`.
- The gateway supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`. It appends the incoming path to the configured target URL, preserves query parameters already on the target, and appends incoming query parameters, including repeated values.
- Request headers are forwarded except hop-by-hop headers, the gateway key, and headers that would be incorrect after body normalization. Request bodies are forwarded as bytes up to 10 MB. The gateway returns the upstream status, body, and relevant response headers.
- Unsupported methods return `405`. Upstream connection failures return `502`; requests exceeding `GATEWAY_TIMEOUT_MS` return `504` (default: 30 seconds). Upstream `4xx`/`5xx` responses are returned with their original status and body.
- Each request for a known project is logged with a generated request ID, method, path, status, latency, client IP, and timestamp. This includes rejected keys/methods, throttling, upstream errors, and connection failures. Request bodies and API keys are not logged.
- Redis stores JWT revocations and uses an atomic fixed-window counter per project and client IP. Rate-limit headers are returned with gateway responses; exceeding the project limit returns `429`. If Redis is unavailable, authenticated management calls and gateway requests fail with `503` rather than bypassing revocation or configured limits.

Project owners configure target and health URLs, so they are trusted configuration. Before production use with arbitrary customers, add explicit network restrictions to prevent server-side request forgery (SSRF) to internal addresses.

### Dashboard flow and metric definitions

`GET /api/dashboard` returns data for the authenticated user's projects:

- `projects`: number of owned projects.
- `requestsToday`: request-log rows since midnight UTC for those projects.
- `successfulRequests` and `failedRequests`: today's request logs grouped by their stored `success` flag.
- `successRatePercent` and `errorRatePercent`: successful or failed logs divided by today's total logs, rounded to one decimal place; `null` when there are no logs.
- `averageLatencyMs`: today's mean stored latency rounded to the nearest millisecond; `null` when there are no logs.
- `topEndpoints` and `statusCodes`: today's top ten paths and status-code counts, computed from stored request logs.
- `apiHealth`: counts the latest recorded health-check state per project as `healthy`, `unhealthy`, or `unknown` when no check exists.
- `asOf`: timestamp for the dashboard calculation.

The dashboard metrics use real gateway request logs. Health endpoints are checked immediately when the API process starts and every `HEALTH_CHECK_INTERVAL_MS` (default 60 seconds); the latest result is available from the project health endpoint. Empty request periods show zero counts and `null` rates/latency rather than fabricated data.

## API reference

Base URL for local development: `http://localhost:4000`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Process liveness response: `{ "status": "ok" }` |
| `POST` | `/api/auth/register` | No | Create an account and return a JWT |
| `POST` | `/api/auth/login` | No | Verify credentials and return a JWT |
| `GET` | `/api/projects` | Bearer JWT | List the signed-in user's projects |
| `POST` | `/api/projects` | Bearer JWT | Create a project |
| `PATCH` | `/api/projects/:projectId` | Bearer JWT | Update an owned project |
| `DELETE` | `/api/projects/:projectId` | Bearer JWT | Delete an owned project (returns `204`) |
| `POST` | `/api/projects/:projectId/api-key` | Bearer JWT | Generate/replace a project key; full key returned once |
| `GET` | `/api/projects/:projectId/api-key` | Bearer JWT | Read masked key metadata |
| `DELETE` | `/api/projects/:projectId/api-key` | Bearer JWT | Revoke the project key (returns `204`) |
| `GET` | `/api/dashboard` | Bearer JWT | Read project counts and persisted operational metrics |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/g/:projectId/*` | `X-TrafficFlow-Key` | Forward a request to the configured target API |

Additional authenticated endpoints:

- `GET /api/projects/:projectId/requests?limit=50&cursor=<requestId>`: paginate request history (up to 100 records per page).
- `GET /api/projects/:projectId/health`: read the latest health result, or `null` if no probe has run.
- `PATCH /api/projects/:projectId`: also accepts `rateLimitRequests`, `rateLimitWindowSeconds`, and optional `healthEndpoint`.

Project-settings example:

```json
{
  "rateLimitRequests": 100,
  "rateLimitWindowSeconds": 60,
  "healthEndpoint": "https://api.example.com/health"
}
```

### Example requests

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "at-least-8-characters",
  "confirmPassword": "at-least-8-characters"
}
```

Logout revokes the current JWT server-side; clients should also discard the token locally.

Create a project:

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Store API",
  "description": "Store backend",
  "targetApiUrl": "https://api.example.com"
}
```

Update a project (send one or more fields):

```http
PATCH /api/projects/proj_<id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetApiUrl": "https://api-new.example.com"
}
```

Read the dashboard:

```http
GET /api/dashboard
Authorization: Bearer <token>
```

Generate a project API key (the full key is returned only once):

```http
POST /api/projects/proj_<id>/api-key
Authorization: Bearer <token>
```

Call the gateway. This request is forwarded to the target as `/products?page=2`:

```http
GET /g/proj_<id>/products?page=2
X-TrafficFlow-Key: tf_live_<secret>
Accept: application/json
```

Validation and authorization errors return a JSON body with a `message`. Typical status codes include `400` for invalid input, `401` for missing/invalid/expired bearer tokens or bad credentials, `404` for projects not found or not owned by the caller, and `409` for duplicate registration email.

## Local development

### Prerequisites

- Node.js and npm
- Docker Desktop (recommended; Compose starts PostgreSQL and Redis)
- Node.js and npm (for running the API outside Docker)

### Configure the backend

Configure `server/.env` directly. This file is ignored by Git and contains local secrets and connection settings. The development values in it should match `server/docker-compose.yml`:

```dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
POSTGRES_USER=trafficflow
POSTGRES_PASSWORD=trafficflow_dev_password
POSTGRES_DB=trafficflow
DATABASE_URL=postgresql://trafficflow:trafficflow_dev_password@localhost:5432/trafficflow?schema=public
JWT_SECRET=use-a-long-random-secret
JWT_EXPIRES_IN=1d
GATEWAY_BASE_URL=http://localhost:4000
REDIS_URL=redis://localhost:6379
HEALTH_CHECK_INTERVAL_MS=60000
HEALTH_CHECK_TIMEOUT_MS=5000
GATEWAY_TIMEOUT_MS=30000
TRUST_PROXY=false
```

`JWT_SECRET` and `POSTGRES_PASSWORD` must be kept private. The shown PostgreSQL password is for local development only; use strong, securely managed values in production. `DATABASE_URL` credentials must match `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. `GATEWAY_BASE_URL` controls the URL returned for a project; it does not enable forwarding by itself.
Set `TRUST_PROXY=true` only when the API is behind a trusted reverse proxy that overwrites forwarded client-IP headers.

For local development, start the PostgreSQL and Redis dependencies, then install dependencies, generate Prisma Client, and apply migrations:

```powershell
cd server
docker compose up -d postgres redis
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

To run the backend container with both data services and automatic migrations, use `docker compose up --build`. Docker Desktop must be running. Database and Redis data use named volumes. `docker compose down -v` deletes those local data volumes.

The API listens at `http://localhost:4000` unless `PORT` is changed. `npm run build` compiles TypeScript to `server/dist`; `npm start` runs that compiled build. `npm run typecheck` performs a no-output TypeScript check.

### Start the client

In a separate terminal:

```powershell
cd client
npm install
npm run dev
```

The Next.js starter runs at `http://localhost:3000`. The frontend is not yet integrated with the backend APIs. Its available commands are `npm run dev`, `npm run build`, `npm start`, and `npm run lint`. The current document metadata still uses the generated Next.js defaults.

## Database model

- `User` stores account identity and the bcrypt password hash. Email is unique.
- `Project` belongs to a user and stores its gateway identifier, name, optional description, target API URL, rate-limit settings, and optional health endpoint. Gateway identifiers are unique.
- `ApiKey` stores one project's key hash, masked display metadata, creation time, and last-use time. The raw key is never persisted.
- `RequestLog` stores request ID, method, path, client IP, status, success flag, latency, and timestamp for history and dashboard analytics.
- `ApiHealthCheck` stores the project's health state, response time, status code, and check timestamp.
- Deleting a user cascades to their projects; deleting a project cascades to its request logs and health checks.

## Current implementation boundaries

- Run one API instance for scheduled health checks in the MVP. Multiple API replicas currently perform duplicate health probes; move the checker to a single worker when scaling horizontally.
- Docker Compose provides a local backend deployment. AWS infrastructure, managed secrets, and production deployment automation still need environment-specific configuration.
- Gateway targets currently accept arbitrary HTTP(S) URLs. Production use should add target-network restrictions to mitigate SSRF.
- There are no automated backend test suites in the repository yet; the package currently provides typecheck and build scripts.
- The current error middleware logs the server-side error and returns a generic `500` response. Request validation is handled locally by the relevant controllers.