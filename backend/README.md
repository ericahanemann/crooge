# Crooge backend

Fastify 5 + Prisma 7 (Postgres) + Zod 4 API for Crooge, a personal finance
tracker. Covers auth, monthly income/expense transactions, and credit cards.

## Stack

- **Fastify 5** — HTTP server, one route per file (see [Project structure](#project-structure)).
- **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`) — Postgres access. Generated client lives in `src/generated/prisma` (gitignored from linting, not from git).
- **Zod 4** — request/response validation, wired into Fastify via `fastify-type-provider-zod`. The same zod schemas that validate requests also generate the OpenAPI document (see [API docs](#api-docs) below) — one definition, three jobs (validate, serialize, document).
- **@node-rs/argon2** — password hashing.
- **@fastify/jwt** — short-lived access tokens; refresh tokens are a separate, DB-backed, rotating mechanism (`modules/auth/`).

## Project structure

```
src/
  app.ts, server.ts     # composition root + entrypoint (see below)
  env/                  # zod-validated env vars
  lib/prisma.ts         # the one truly generic shared piece: the Prisma client
  http/
    hooks/authenticate.ts   # onRequest hook shared by every protected route
    schemas/common.ts       # response/param shapes shared across modules (errors, "YYYY-MM" query, uuid params)
  modules/
    auth/              # users, sessions, refresh tokens
    transactions/      # income/expense transactions, monthly summary
    credit-cards/      # cards, billing cycles, bills
```

Each module owns everything specific to its resource:

```
modules/<resource>/
  routes/*.ts   # one file per endpoint (handler + its schema.body/querystring/params/response)
  schemas.ts    # zod response shapes reused across that module's routes
  *.ts          # domain logic + DTO mappers (e.g. credit-cards/billing-cycle.ts, transactions/serialize.ts)
```

`app.ts` still imports and registers every route explicitly, one line each —
that list doubles as a full index of the API surface, which is worth more
than the indirection an autoloader would save at this size.

Modules aren't fully isolated: a transaction charged to a card needs
`credit-cards/billing-cycle.ts#ensureBill`, and a card's transaction list
needs `transactions/serialize.ts#serializeTransaction`. Cross-module imports
like those are expected — the module split is about primary ownership of a
resource's routes/schemas/logic, not a hard dependency boundary.

## Running locally

```bash
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET
docker compose up -d   # starts Postgres on :5432
npx prisma migrate dev # applies migrations
npm run dev            # starts the server with --watch, reads .env
```

Other scripts: `npm run typecheck` (tsc), `npm run lint` (biome check), `npm run format` (biome format --write).

## API docs

Once the server is running, interactive Swagger UI is at
[`/docs`](http://localhost:3333/docs); the raw OpenAPI 3.1 document is at
`/docs/json`. Every route file declares its own `schema.body` /
`querystring` / `params` / `response` using zod — that's the single source
of truth for validation, response serialization, _and_ these docs, so they
can't drift out of sync with each other. Response shapes reused across a
module's routes live in that module's `schemas.ts` (plus
`src/http/schemas/common.ts` for shapes shared across modules — errors, the
"YYYY-MM" query param, uuid params) and are registered once
(`z.globalRegistry.add(schema, { id: "..." })`) so the spec `$ref`s them
instead of repeating them per endpoint.

Two response shapes are intentionally _not_ declared per-route, since
they're identical everywhere and documented once in the top-level
description instead (see `src/app.ts`'s `setErrorHandler`):

- **`400` validation error** — `{ message, issues }`, where `issues` maps
  each invalid field path to its error message(s).
- **Other 4xx from Fastify itself** — e.g. an empty body sent with
  `Content-Type: application/json` — forwarded as `{ message }` with
  Fastify's own status code, before a route's schema ever runs.

## Testing
