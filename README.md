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

Create the backend environment file:

powershell
Copy-Item .\server\.env.example .\server\.env


Update server/.env with your local configuration:

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

3. Start the application

The easiest way to run the complete application is with Docker Compose:

bash
docker compose up --build


This starts:

Next.js frontend
Express backend
PostgreSQL database
Redis
Database migration service

Open the application:

http://localhost:3000

The API is available at:

http://localhost:4000

To stop the application:

bash
docker compose down


To run the frontend and backend separately, install dependencies in their respective directories using npm ci and follow the local development scripts in their package.json files.

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