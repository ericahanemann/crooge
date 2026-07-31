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

cat > .env << 'EOF'
NODE_ENV=dev
PORT=3333
DATABASE_URL=postgresql://docker:docker@localhost:5432/crooge
EOF

docker compose up -d          # starts local Postgres
npx prisma generate           # generates the Prisma client (also gitignored)
npx prisma migrate deploy     # applies committed migrations
npm run dev                   # http://localhost:3333
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

## Other useful commands (run inside `backend/` or `frontend/`)

```bash
npm run typecheck     # backend only
npm run lint          # Biome check
npm run format        # Biome format --write
```
