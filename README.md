# TrafficFlow

TrafficFlow currently has a Next.js dashboard starter in `client` and an Express TypeScript API in `server`.

## Run locally

1. In `server`, copy `.env.example` to `.env` and set `JWT_SECRET` to a long random value.
2. In one terminal, run `cd server`, `npm install`, and `npm run dev`.
3. In another terminal, run `cd client`, `npm install`, and `npm run dev`.
4. Open `http://localhost:3000`. The API listens on `http://localhost:4000`.

Auth endpoints:

- `POST /api/auth/register` with `{ "name": "Ada", "email": "ada@example.com", "password": "at-least-8-chars" }`
- `POST /api/auth/login` with `{ "email": "ada@example.com", "password": "at-least-8-chars" }`
- `GET /health`

The API currently stores users in memory for this first milestone. Restarting the server clears them. Passwords are hashed, and responses never include the password hash. PostgreSQL/Prisma will replace the in-memory store in a later milestone.