# TrafficFlow — Private Project Context

This file is intentionally excluded from Git. It is working context for AI-assisted development and records the product requirements, verified repository state, and remaining work. Update the status here when implementation changes.

## Product

- **Name:** TrafficFlow
- **Type:** API traffic gateway and monitoring platform
- **Target:** MVP v1.0
- **Learning level:** Basic to intermediate
- **Primary goal:** Let developers register backend APIs, route traffic through a controlled gateway, and inspect requests, performance, analytics, and API health.
- **Implementation style:** Keep the code understandable to a learner and explainable in interviews. Prefer straightforward components, clear API contracts, and only introduce scalable infrastructure where the requirement needs it.
- **Roles:** One developer/user role for MVP. An admin panel is optional and not a priority.

## Product requirements

### Authentication

- Register with name, email, password, and password confirmation.
- Login with email and password.
- Validate email and password; reject duplicate emails; never store plaintext passwords.
- Protected dashboard and project routes require authentication.
- Invalid credentials return an appropriate error; logout invalidates the current session/token.

### Dashboard and analytics

- Show owned projects, total requests, successful/failed requests, success/error rates, average latency, and API health.
- Calculate values from actual persisted database records; never use fabricated statistics.
- Show top endpoints and response status-code counts.
- Define dashboard periods and rates consistently; current implementation uses today's UTC logs.

### Project management

- Create projects with required name and target API URL, optional description, and unique gateway identifier.
- Accept only valid HTTP(S) URLs.
- Users can list, update, and delete only their own projects.
- Provide a gateway URL for each project.
- Configure rate-limit settings and an optional health endpoint.

### Gateway

- Route `/g/:projectId/*` to the configured target's corresponding path.
- Support GET, POST, PUT, PATCH, and DELETE.
- Forward query parameters, request body, and relevant headers; return upstream status, body, and relevant headers.
- Preserve upstream error statuses and bodies; reject unknown projects and unsupported methods.
- Require a valid project API key in `X-TrafficFlow-Key`.
- Rate-limit per client and project; excess traffic returns `429`.
- Record request ID, project, method, path, status, latency, client IP, and timestamp.

### API keys

- Generate a project key, display the full value only once, store only a secure hash, and display masked metadata later.
- Support key replacement and revocation.
- Missing, invalid, or revoked keys must be rejected.

### Health monitoring

- Allow a project health URL.
- Periodically call it and persist healthy/unhealthy status, status code, response time, and check time.
- Expose the latest result to the owner.

### Next.js application

Required small set of routes:

- `/login`, `/register`
- `/dashboard`
- `/projects`
- `/projects/[id]`
- `/projects/[id]/traffic`
- `/projects/[id]/analytics`
- `/projects/[id]/health`
- `/projects/[id]/settings`

Keep UI focused; connect it to the backend and protect authenticated views.

### Docker, AWS, and CI/CD

- Local complete application should run with Docker Compose and document setup in README.
- AWS learning/deployment target includes VPC, public/private subnets, Internet Gateway, route tables, security groups, EC2, RDS PostgreSQL, ALB, CloudWatch, and S3 only where useful. Start with a cost-conscious deployment.
- GitHub Actions should install dependencies, test, build, build/publish a Docker image, deploy, and check application health. The goal is not to SSH manually for each application update.

### Security and quality

- Hash passwords; enforce ownership authorization; protect API keys.
- Validate inputs and configure CORS deliberately.
- Add suitable HTTP security headers.
- Prevent SSRF: target and health URLs are user-controlled and must not permit access to loopback, private, link-local, metadata, or other internal destinations. Account for DNS resolution/rebinding and redirects; do not rely only on string checks.
- Test unit logic (rate limiter, URL validation, auth, project behavior, analytics) and API integrations (registration, login, project, key, gateway, key rejection, limiting, and logs).
- Maintain a manual acceptance checklist in README.

## Verified repository status (2026-10-19)

The codebase was inspected directly. “Implemented” means code/schema/routes exist; it does **not** mean every acceptance check was run against live services. No backend test suite is currently present.

### Implemented backend

- **Authentication:** Express routes exist for registration, login, and logout. Registration checks required fields, basic email format, minimum eight-character password, matching confirmation, and unique email. Passwords are bcrypt-hashed. Login returns a JWT; logout revokes the current token in Redis. Protected project/dashboard endpoints verify the token and reject revoked/invalid tokens.
- **Projects:** Authenticated list/create/update/delete. Queries constrain by owner. Names and HTTP(S) URLs are validated. Project gateway IDs are generated uniquely. Optional description, health endpoint, rate-limit requests, and rate-limit window can be configured.
- **API keys:** One active key per project. Generated using cryptographic random bytes, SHA-256 hash stored, masked metadata returned on read, and key can be replaced/revoked. Full key only appears at generation.
- **Gateway:** `/g/:projectId/*` supports GET/POST/PUT/PATCH/DELETE, forwards path/query and raw body, filters hop-by-hop/key headers, returns upstream status/body/relevant headers, and handles timeout/upstream errors. Requires project API key.
- **Rate limiting:** Redis atomic fixed-window count keyed by project and client IP. Project defaults are 100 requests per 60 seconds. Returns `429` and rate-limit headers; fails closed with `503` if Redis is unavailable.
- **Request logging/history:** Stores request ID, method, path, IP, status, success, latency, timestamp, and project. Auth failures for a known project, unsupported methods, throttles, and upstream outcomes are logged. Owner-scoped request history supports cursor pagination.
- **Analytics:** Dashboard endpoint aggregates real UTC-today logs for owned projects: totals, successes/failures, rates, average latency, top ten paths, status-code counts, and health state counts.
- **Health:** Optional project health URL; periodic GET checks (default every 60 seconds, five-second timeout) write health records. Owner can read latest result. A project without an enabled health URL is reported unknown.
- **Persistence:** PostgreSQL via Prisma. Schema includes User, Project, ApiKey, RequestLog, ApiHealthCheck. Migrations exist for initial schema, API keys, and gateway operational settings/log fields.
- **Local backend Docker:** Compose defines API, one-shot migration service, PostgreSQL, and Redis. API and database migrations have Docker build targets. This is **not** yet a complete frontend-plus-backend application deployment.
- **Validation already reported by prior work:** Prisma generation/schema validation, TypeScript typecheck/build, Compose config validation, and Docker image builds passed. No live Postman acceptance run or automated tests were performed.

### Current backend routes

| Method | Route | Authentication |
|---|---|---|
| GET | `/health` | None |
| POST | `/api/auth/register` | None |
| POST | `/api/auth/login` | None |
| POST | `/api/auth/logout` | Bearer JWT |
| GET | `/api/projects` | Bearer JWT |
| POST | `/api/projects` | Bearer JWT |
| PATCH | `/api/projects/:projectId` | Bearer JWT |
| DELETE | `/api/projects/:projectId` | Bearer JWT |
| GET | `/api/projects/:projectId/requests?limit=&cursor=` | Bearer JWT |
| GET | `/api/projects/:projectId/health` | Bearer JWT |
| POST | `/api/projects/:projectId/api-key` | Bearer JWT |
| GET | `/api/projects/:projectId/api-key` | Bearer JWT |
| DELETE | `/api/projects/:projectId/api-key` | Bearer JWT |
| GET | `/api/dashboard` | Bearer JWT |
| GET, POST, PUT, PATCH, DELETE | `/g/:projectId/*` | `X-TrafficFlow-Key` |

### Not implemented or incomplete

1. **Frontend:** `client/src/app/page.tsx` is still a heading-only starter. No login/register UI, dashboard, project pages, API client, token lifecycle, or backend integration exists.
2. **Full-stack Docker:** Compose currently runs backend/data services only. It does not build or serve the Next.js client. README's local client instructions run it separately.
3. **SSRF protection:** Project target and health URLs accept arbitrary HTTP(S) hostnames. Internal/private destinations and DNS rebinding are not blocked. This is a production-blocking security gap for public/self-service use.
4. **HTTP security headers:** No security-header middleware such as Helmet is configured.
5. **Automated tests:** No test framework or backend unit/integration tests exist; feature behavior has not yet been proven by executable acceptance tests.
6. **Request-log reliability:** Gateway logging catches database write errors, logs to console, and still returns the gateway response. Thus “every request persisted” is best-effort if PostgreSQL write fails. Decide whether to fail requests, use a durable queue/outbox, or explicitly accept this MVP tradeoff.
7. **Health worker scaling:** Every API process runs its own health-check interval. Multiple API replicas duplicate checks. A single worker/leader or job queue is needed before horizontal scale.
8. **AWS:** No AWS infrastructure/IaC or deployment is configured (VPC/subnets/networking, EC2, RDS, ALB, CloudWatch, S3).
9. **CI/CD:** No GitHub Actions workflows are present.
10. **Manual acceptance checklist:** README has setup/API descriptions, but no completed end-to-end acceptance checklist/results. Add and execute it as testing is developed.

### Important design/security notes

- The API uses bearer JWTs; there is no session cookie/browser CSRF design yet. Frontend token storage must be chosen deliberately. Avoid casually storing long-lived secrets in browser local storage.
- Redis is required for authenticated management requests (token revocation checks) and gateway rate limiting. If unavailable, the backend rejects those requests with `503`.
- Client IP rate limiting depends on correct proxy configuration. `TRUST_PROXY` defaults false; only enable it behind a trusted proxy that overwrites forwarded-IP headers.
- Gateway logs include client IP; account for retention/privacy needs before production.
- Gateway health checks are made directly by the API process and are also exposed to SSRF until network restrictions exist.
- Admin functionality is explicitly optional and should remain out of MVP scope unless needed later.

## Main implementation files

- Backend route registration: `server/src/app.ts`
- Authentication: `server/src/controllers/authController.ts`, `server/src/middleware/authenticate.ts`
- Projects: `server/src/controllers/projectController.ts`, `server/src/routes/projectRoutes.ts`
- API keys: `server/src/controllers/apiKeyController.ts`
- Gateway: `server/src/controllers/gatewayController.ts`, `server/src/routes/gatewayRoutes.ts`
- Redis/rate limiting: `server/src/lib/redis.ts`, `server/src/lib/rateLimit.ts`
- Request history: `server/src/controllers/projectOperationsController.ts`
- Dashboard: `server/src/controllers/dashboardController.ts`
- Health monitoring: `server/src/services/healthMonitor.ts`
- Data model/migrations: `server/prisma/schema.prisma`, `server/prisma/migrations/`
- Local containers: `server/Dockerfile`, `server/docker-compose.yml`
- Frontend starter: `client/src/app/page.tsx`, `client/src/app/layout.tsx`
- Public project documentation: `README.md`

## Suggested next steps

1. Add backend unit/integration tests and execute a documented Postman/manual acceptance checklist.
2. Implement SSRF-safe target/health URL validation before exposing the gateway publicly.
3. Add HTTP security headers and review CORS/proxy configuration.
4. Build the Next.js auth flows and authenticated app shell; integrate register/login/logout.
5. Build dashboard, projects list/detail, traffic history, analytics, health, and settings views using the existing API.
6. Add a Next.js Docker service and verify the full application with `docker compose up`.
7. Add CI checks and GitHub Actions build/test workflow.
8. Design and deploy a minimal cost-aware AWS setup; add automated deploy and post-deploy health checks.

Keep future status updates factual: distinguish code written, automated tests passed, manual checks passed, and production deployment completed.
