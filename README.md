TrafficFlow

A lightweight API gateway with built-in authentication, rate limiting, request logging, and observability.

TrafficFlow is a self-hosted API gateway that provides a centralized layer for securing, routing, and monitoring requests to existing backend services.

Developers can configure upstream APIs, generate project-specific API keys, enforce rate limits, and monitor traffic through a centralized dashboard.

Screenshots
Dashboard

!TrafficFlow Dashboard

Real application dashboard showing request analytics, response codes, endpoint activity, and configured projects.

CI Pipeline

!GitHub Actions CI Pipeline

Successful GitHub Actions checks for the TrafficFlow CI pipeline.

Key Features
Authentication & Authorization — JWT-based authentication with bcrypt password hashing and project ownership protection.
API Gateway — Forward HTTP requests to configured upstream services while preserving paths, query parameters, and request bodies.
API Key Management — Generate, replace, and revoke project-specific API keys. Keys are hashed before storage.
Rate Limiting — Redis-powered fixed-window rate limiting configurable per project.
Request Monitoring — Track HTTP methods, response statuses, latency, timestamps, and client IP addresses.
Analytics Dashboard — Visualize request volume, success and failure rates, average latency, top endpoints, and response codes.
Health Monitoring — Automatically check configured upstream endpoints and record their availability and response times.
API Testing — Test gateway endpoints directly from the dashboard without external API tools.
Architecture

TrafficFlow separates the management API, gateway processing, persistence, and monitoring responsibilities.

mermaid
flowchart TD
    Client["Next.js Dashboard"]
    API["Express API"]
    Auth["JWT Authentication"]
    Gateway["API Gateway"]
    Redis[("Redis")]
    DB[("PostgreSQL")]
    Upstream["Upstream API"]
    Monitor["Health Monitor"]

    Client --> API
    API --> Auth
    Auth --> Redis
    API --> DB
    Client --> Gateway
    Gateway --> Redis
    Gateway --> Upstream
    Gateway --> DB
    Monitor --> Upstream
    Monitor --> DB


Request lifecycle:

Client sends a request using a project API key.
Gateway validates the key and checks the project's rate limit.
Redis tracks request counts per project and client IP.
Valid requests are forwarded to the configured upstream API.
Request outcomes and performance metrics are stored in PostgreSQL.
Dashboard displays aggregated traffic and monitoring data.
Technology Stack
Layer	Technologies
Frontend	Next.js 16, React 19, TypeScript, Tailwind CSS 4
Backend	Node.js, Express 5, TypeScript
Database	PostgreSQL 17, Prisma 6
Caching & Rate Limiting	Redis 7
Authentication	JWT, bcryptjs, Node.js Crypto
Infrastructure	Docker, Docker Compose
CI/CD	GitHub Actions
Getting Started
Prerequisites
Node.js 22+
npm
Docker Desktop with Docker Compose
1. Clone the repository
bash
git clone <your-repository-url>
cd TrafficFlow

2. Configure environment variables

Create `server/.env` if it does not already exist. Keep this file private; it is ignored by Git. The settings below show local development values. Use your own database password and JWT secret.

dotenv
PORT=4000
CLIENT_ORIGIN=http://localhost:3000

POSTGRES_USER=trafficflow
POSTGRES_PASSWORD=your-local-password
POSTGRES_DB=trafficflow
DATABASE_URL=postgresql://trafficflow:your-local-password@localhost:5432/trafficflow?schema=public

JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=1d
REDIS_URL=redis://localhost:6379

GATEWAY_BASE_URL=http://localhost:4000
GATEWAY_TIMEOUT_MS=30000
HEALTH_CHECK_INTERVAL_MS=60000
HEALTH_CHECK_TIMEOUT_MS=5000
TRUST_PROXY=false


Use the same database password in POSTGRES_PASSWORD and DATABASE_URL. Keep your .env file private.

3. Run the backend in Docker and the client locally

For the API container to connect to Compose PostgreSQL, change the hostname in `DATABASE_URL` in `server/.env` from `localhost` to `postgres`. Use the same `server/.env` for this run and the full Compose run below.

From the repository root, start only the backend and its dependencies:

```powershell
docker compose up --build -d api
```

This builds the API from `server/Dockerfile` and starts PostgreSQL, Redis, the migration service, and the API. It does not start the client. The API is available at `http://localhost:4000`.

Then start the client in another terminal:

```powershell
Set-Location .\client
npm ci
npm run dev
```

Open `http://localhost:3000`. To stop the backend and its dependencies, run `docker compose down` from the repository root.

4. Run the complete application with Docker Compose

After testing the backend and locally run client, start the full stack from the repository root:

```powershell
docker compose up --build
```

This starts the Next.js client, Express API, PostgreSQL, Redis, and the Prisma migration service. Open `http://localhost:3000`. Stop the stack with `docker compose down`; this keeps the named database volumes. Do not add `-v` unless you intend to delete their data.

To run the backend directly on your computer instead of in Docker, start PostgreSQL and Redis first, then from `server` run:

```powershell
npm ci
npm run db:generate
$env:DATABASE_URL = "postgresql://trafficflow:your-local-password@localhost:5432/trafficflow?schema=public"
npm run db:deploy
npm run dev
```

Replace the example password with the value from `server/.env`. The PowerShell environment override makes Prisma and the backend process use `localhost` while leaving the Docker-compatible hostname in the file.

API Overview
Method	Endpoint	Description
POST	/api/auth/register	Register a new account
POST	/api/auth/login	Authenticate user
POST	/api/auth/logout	Revoke current JWT
GET	/api/projects	Retrieve owned projects
POST	/api/projects	Create a project
PATCH	/api/projects/:projectId	Update project
DELETE	/api/projects/:projectId	Delete project
GET	/api/dashboard	Retrieve dashboard analytics
GET	/api/projects/:projectId/requests	Retrieve request history
GET	/api/projects/:projectId/health	Retrieve health-check results
GET/POST/DELETE	/api/projects/:projectId/api-key	Manage project API keys
ALL	/g/:projectId/*	Authenticate, rate-limit, and forward requests

Management endpoints use JWT authentication. Gateway requests use the X-TrafficFlow-Key header.

CI Pipeline

TrafficFlow uses GitHub Actions to automatically validate changes on pushes and pull requests.

The CI workflow performs:

Client dependency installation
Frontend linting
Frontend production build
Prisma client generation
Backend production build
Project Verification

The following commands can be used to verify the application builds successfully.

Backend

bash
cd server
npm ci
npm run db:generate
npm run typecheck
npm run build


Frontend

bash
cd client
npm ci
npm run lint
npx tsc --noEmit
npm run build


Note: Automated unit, integration, and end-to-end test suites have not yet been implemented.

TrafficFlow — Centralized API routing, access control, and observability for backend services.
