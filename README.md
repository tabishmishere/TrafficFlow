# TrafficFlow

TrafficFlow is an early-stage API gateway and monitoring platform. The repository currently contains a minimal Next.js client starter and an Express/TypeScript backend. The backend implements account registration and login, authenticated project management, and a dashboard summary API backed by PostgreSQL through Prisma. The client currently renders only a TrafficFlow heading; it has no login, project-management, or dashboard UI and does not call the backend yet.

> **Current scope:** project and dashboard management APIs are implemented. The gateway URL is generated and saved with a project, but traffic forwarding, API-key authentication, rate limiting, request-log ingestion, and scheduled health probes are not implemented yet. The dashboard reads request and health records if they exist; it does not generate sample metrics.

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
    controllers/                Auth, project, and dashboard handlers
    lib/prisma.ts               Shared Prisma Client instance
    middleware/authenticate.ts  JWT bearer-token verification
    routes/                     HTTP endpoint definitions
    types/                      Request and user TypeScript types
```

## Backend request flow

1. `src/index.ts` reads `PORT` and starts the Express application (default port `4000`).
2. `src/app.ts` loads environment variables, configures CORS for `CLIENT_ORIGIN`, accepts JSON bodies up to 10 KB, exposes `/health`, mounts API routers, and returns a generic 500 response for unhandled errors.
3. Authentication routes call the auth controller. Project and dashboard routers first run the JWT middleware, which verifies a bearer token and attaches its subject as `req.userId`.
4. Controllers validate input and call the shared Prisma Client. Prisma maps those operations to PostgreSQL using the schema and migration in `server/prisma`.

### Authentication flow

- Registration trims the name, normalizes the email to lowercase, checks the email format, and requires a password of at least eight characters.
- The password is hashed with bcryptjs (cost factor 12) before the user is inserted. The database unique constraint prevents duplicate email addresses; duplicates return `409`.
- Successful registration returns `201` with a public user object and a signed JWT. Login looks up the normalized email, compares the submitted password to the stored hash, and returns the same public user shape plus a JWT.
- Password hashes are never selected in the registration response and are explicitly excluded from the login response.
- JWTs contain the user ID in `sub`; lifetime is configured by `JWT_EXPIRES_IN` (default `1d`). Protected endpoints expect `Authorization: Bearer <token>`.

### Project flow

- `POST /api/projects` validates a non-empty project name and an absolute HTTP or HTTPS target URL. Description is optional.
- A project is saved with the authenticated user's ID and a generated, unique identifier such as `proj_...`. The response also includes a gateway URL based on `GATEWAY_BASE_URL`.
- Listing filters by the authenticated owner. Updates and deletes include both the project identifier and authenticated owner in the database condition. A missing project and another user's project both return `404`.
- Updates use `PATCH`, accept one or more of `name`, `description`, and `targetApiUrl`, and reject empty names or invalid target URLs.

The returned gateway URL is currently a project value only. There is no `/g/:projectId` route yet, so it does not forward requests to the configured target API.

### Dashboard flow and metric definitions

`GET /api/dashboard` returns data for the authenticated user's projects:

- `projects`: number of owned projects.
- `requestsToday`: request-log rows since midnight UTC for those projects.
- `successfulRequests` and `failedRequests`: today's request logs grouped by their stored `success` flag.
- `successRatePercent`: successful logs divided by today's total logs, rounded to one decimal place; `null` when there are no logs.
- `averageLatencyMs`: today's mean stored latency rounded to the nearest millisecond; `null` when there are no logs.
- `apiHealth`: counts the latest recorded health-check state per project as `healthy`, `unhealthy`, or `unknown` when no check exists.
- `asOf`: timestamp for the dashboard calculation.

The schema includes `RequestLog` and `ApiHealthCheck` tables, but there is not yet a gateway or health-check worker that writes to them. Until those components exist and record observations, request counts remain zero, rates and latency are `null`, and project health is unknown. These values are intentionally not fabricated.

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
| `GET` | `/api/dashboard` | Bearer JWT | Read project counts and persisted operational metrics |

### Example requests

Register:

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "at-least-8-characters"
}
```

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

Validation and authorization errors return a JSON body with a `message`. Typical status codes include `400` for invalid input, `401` for missing/invalid/expired bearer tokens or bad credentials, `404` for projects not found or not owned by the caller, and `409` for duplicate registration email.

## Local development

### Prerequisites

- Node.js and npm
- PostgreSQL

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
```

`JWT_SECRET` and `POSTGRES_PASSWORD` must be kept private. The shown PostgreSQL password is for local development only; use strong, securely managed values in production. `DATABASE_URL` credentials must match `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. `GATEWAY_BASE_URL` controls the URL returned for a project; it does not enable forwarding by itself.

Start PostgreSQL with Docker Compose, then install dependencies, generate Prisma Client, and apply migrations:

```powershell
cd server
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Docker Desktop must be running before `docker compose up -d`. The database data is stored in the named `trafficflow-postgres-data` volume and survives container restarts. Stop the container with `docker compose down`; `docker compose down -v` also deletes the local database volume and its data.

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
- `Project` belongs to a user and stores its gateway identifier, name, optional description, and target API URL. Gateway identifiers are unique.
- `RequestLog` stores a project's response status code, success flag, latency, and timestamp for future traffic metrics.
- `ApiHealthCheck` stores a project's health state and optional response information for future API health monitoring.
- Deleting a user cascades to their projects; deleting a project cascades to its request logs and health checks.

## Current implementation boundaries

- No gateway proxy/forwarding endpoint exists yet; project target URLs are stored but not contacted.
- No API-key authentication, Redis rate limiting, request logging writer, or health-probe scheduler exists yet.
- Dashboard data access is implemented, but meaningful request and health metrics require those future writers.
- There are no automated backend test suites in the repository yet; the package currently provides typecheck and build scripts.
- The current error middleware logs the server-side error and returns a generic `500` response. Request validation is handled locally by the relevant controllers.