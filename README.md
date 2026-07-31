# Crooge

Get croogy. Control your finances.

A personal finance app — Next.js frontend, Fastify + Prisma + Postgres backend.

## Prerequisites

- Node.js 24 (see `.nvmrc` in `frontend/` and `backend/`)
- Docker (for the local Postgres instance used by the backend)

## Running on a fresh environment

### 1. Clone and pick a Node version

```bash
git clone <repo-url>
cd crooge
```

### 2. Backend

`backend/.env` is gitignored, so every fresh clone/environment needs its own copy:

```bash
cd backend
npm install

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

cat > .env << EOF
NODE_ENV=dev
PORT=3333
DATABASE_URL=postgresql://docker:docker@localhost:5432/crooge
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=http://localhost:3000
EOF

docker compose up -d          # starts local Postgres
npx prisma generate           # generates the Prisma client (also gitignored)
npx prisma migrate deploy     # applies committed migrations
npm run dev                   # http://localhost:3333
```

### 3. Frontend

`frontend/.env.local` is gitignored too — it just needs to point at wherever the backend from step 2 is reachable:

```bash
cd frontend
npm install

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3333
EOF

npm run dev                   # http://localhost:3000
```

If frontend and backend are exposed on different hosts (e.g. separate forwarded ports in Codespaces), update `NEXT_PUBLIC_API_URL` above and the backend's `FRONTEND_URL` (step 2) to match each other's actual origins — the backend's CORS check and the frontend's auth cookie both depend on these matching reality.

## Other useful commands (run inside `backend/` or `frontend/`)

```bash
npm run typecheck     # backend only
npm run lint          # Biome check
npm run format        # Biome format --write
```
