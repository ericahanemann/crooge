---
name: fastify-prisma-testing
description: Guides writing automated tests for a Node/TypeScript backend built on Fastify, Prisma, PostgreSQL, and Zod, favoring integration tests that exercise real routes against a real database over mocked unit tests. Use this whenever the user asks to add tests, write test coverage, set up a test suite, prevent regressions, or test an API route/endpoint/service/repository/auth flow in this backend — even if they just say "add tests for this route" or "make sure this doesn't break again" without naming a framework. Also use it when scaffolding a new backend project's testing setup (Vitest config, Testcontainers, a CI test job).
---

# Testing a Fastify + Prisma + PostgreSQL backend

## The core idea

Nobody calls your Zod schema or your Prisma model directly — they call your HTTP API. A test that sends a real request through `fastify.inject()`, hits a real Postgres database, and checks the real response is testing the thing your users (API consumers: the frontend, a mobile client, another service) actually depend on. A test that mocks Prisma and asserts a handler function returned the right object is testing your implementation, and it will happily stay green while the real endpoint 500s.

So the majority of this test suite should be **integration tests**: real Fastify app, real routes, real Postgres (via Testcontainers), asserting on HTTP status codes and response bodies. Reach for a narrower **unit test** only when something has enough branching logic that hitting every case through HTTP would be slow or awkward to read — a permission calculator, a pricing rule, a tricky Zod refinement. If a unit test and an integration test would cover the same bug, keep the integration test and skip the unit test; redundant coverage is cost without benefit.

## Stack

- **Vitest** — test runner. Fast, native ESM/TypeScript, built-in mocking and coverage.
- **`fastify.inject()`** — Fastify's own recommended way to test routes without binding a real port (powered by `light-my-request`). This is Fastify's documented preferred pattern, not a workaround.
- **Testcontainers** (`@testcontainers/postgresql`) — spins up a real, disposable Postgres container for the test run, so tests exercise real constraints, real JSONB behavior, real Prisma queries — not a stand-in.

## One-time setup

### 1. Split `server.ts` into an app factory

Right now `src/server.ts` likely both builds the Fastify instance and calls `.listen()`. Tests need the first part without the second. Pull the app construction into its own factory:

```ts
// src/app.ts
import Fastify, { type FastifyServerOptions } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { buildPrismaClient } from './db/client.js'
// ... your other plugin imports (cors, cookie, jwt, swagger, routes)

export async function buildApp(
  opts: FastifyServerOptions & { prisma?: PrismaClient } = {},
) {
  const { prisma = buildPrismaClient(), ...fastifyOpts } = opts
  const app = Fastify(fastifyOpts)

  app.decorate('prisma', prisma)
  await app.register(import('@fastify/cors'))
  await app.register(import('@fastify/cookie'))
  await app.register(import('@fastify/jwt'), { secret: process.env.JWT_SECRET! })
  // ... register your route plugins here

  return app
}
```

```ts
// src/server.ts
import { buildApp } from './app.js'

const app = await buildApp()
await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
```

This is the single change that makes everything below possible: tests can now call `buildApp({ prisma: testPrisma })` and get a fully-booted app to `inject()` against, with no open port and no production database anywhere nearby.

### 2. Install test dependencies

```bash
npm install -D vitest @testcontainers/postgresql
```

`pg`, `@prisma/adapter-pg`, and `prisma` (the CLI) are already in the project.

### 3. Package scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### 4. Testcontainers global setup

Start one Postgres container for the entire test run (not per file — that would be slow) and run real Prisma migrations against it:

```ts
// tests/setup/global-setup.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'node:child_process'

let container: StartedPostgreSqlContainer

export async function setup() {
  container = await new PostgreSqlContainer('postgres:17-alpine').start()
  const databaseUrl = container.getConnectionUri()
  process.env.DATABASE_URL = databaseUrl
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })
}

export async function teardown() {
  await container.stop()
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './tests/setup/global-setup.ts',
    hookTimeout: 30_000, // container start + migrations can take a few seconds
    fileParallelism: false, // see "Speeding this up later" below
  },
})
```

`fileParallelism: false` runs test files one at a time against the single shared database, which keeps the reset strategy below simple and correct. See the note at the end for how to parallelize once the suite gets big enough to matter.

### 5. A shared test Prisma client + reset helper

```ts
// tests/setup/test-db.ts
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })

/** Truncates every table so each test starts from a clean, empty database. */
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `
  if (tables.length === 0) return
  const names = tables.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
}
```

Truncating between tests (rather than trying to roll back a transaction) is the simplest thing that's reliably correct with driver adapters, and it stays correct as your schema grows — you never have to remember to update a list of tables.

### 6. Test data builders

Don't hand-write `prisma.user.create({ data: { ...ten fields... } })` in every test. One builder per entity, with sensible defaults and overrides:

```ts
// tests/setup/factories.ts
import { hash } from '@node-rs/argon2'
import { prisma } from './test-db.js'

export async function createTestUser(overrides: { email?: string; password?: string } = {}) {
  const password = overrides.password ?? 'correct-horse-battery-staple'
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.test`,
      passwordHash: await hash(password),
    },
  })
}
```

## Directory layout

```
tests/
  setup/
    global-setup.ts    # Testcontainers lifecycle (runs once per test run)
    test-db.ts          # shared Prisma client + resetDatabase()
    factories.ts         # test data builders
  integration/
    routes/
      auth.test.ts
      users.test.ts
  unit/
    lib/
      permissions.test.ts
```

## Writing an integration test

```ts
// tests/integration/routes/auth.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../../../src/app.js'
import { prisma, resetDatabase } from '../../setup/test-db.js'
import { createTestUser } from '../../setup/factories.js'

describe('auth routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>

  beforeAll(async () => {
    app = await buildApp({ prisma, logger: false })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  describe('POST /auth/register', () => {
    it('creates a user and returns a session cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'erica@example.com', password: 'correct-horse-battery-staple' },
      })

      expect(response.statusCode).toBe(201)
      expect(response.cookies.some((c) => c.name === 'session')).toBe(true)

      const user = await prisma.user.findUnique({ where: { email: 'erica@example.com' } })
      expect(user).not.toBeNull()
    })

    it('rejects a password below the minimum length with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'erica@example.com', password: 'short' },
      })

      expect(response.statusCode).toBe(400)
    })

    it('rejects a duplicate email with 409', async () => {
      await createTestUser({ email: 'erica@example.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: 'erica@example.com', password: 'correct-horse-battery-staple' },
      })

      expect(response.statusCode).toBe(409)
    })
  })

  describe('GET /me', () => {
    it('rejects requests without a valid token', async () => {
      const response = await app.inject({ method: 'GET', url: '/me' })
      expect(response.statusCode).toBe(401)
    })

    it('returns the current user for a valid token', async () => {
      const user = await createTestUser()
      const token = app.jwt.sign({ sub: user.id })

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ id: user.id, email: user.email })
    })
  })
})
```

Notice what these tests check: HTTP status, cookies, JSON shape, and real rows in the real database — the same things a frontend developer or an API consumer would notice if the endpoint broke.

## Writing a unit test

Reach for these when logic is genuinely independent of HTTP and Postgres and has enough branches to deserve isolated coverage:

```ts
// tests/unit/lib/permissions.test.ts
import { describe, it, expect } from 'vitest'
import { canEditPost } from '../../../src/lib/permissions.js'

describe('canEditPost', () => {
  it('allows the author to edit their own post', () => {
    expect(canEditPost({ authorId: 'u1', role: 'member' }, { authorId: 'u1' })).toBe(true)
  })

  it('allows an admin to edit any post', () => {
    expect(canEditPost({ authorId: 'u2', role: 'admin' }, { authorId: 'u1' })).toBe(true)
  })

  it('denies a member editing someone else\'s post', () => {
    expect(canEditPost({ authorId: 'u2', role: 'member' }, { authorId: 'u1' })).toBe(false)
  })
})
```

Zod schemas are a good unit-test target too, when a schema has non-obvious refinements (custom `.refine()`, cross-field checks) — test the schema's `.safeParse()` directly rather than only through an HTTP request, since that isolates whether a failure is a validation bug or a route-wiring bug.

## What not to test

- **Don't mock Prisma inside an "integration" test.** If the database is mocked, you're not testing the query, the constraint, or the migration — you're testing that your mock returns what you told it to. That's a unit test wearing an integration test's name.
- **Don't test Prisma, Zod, or Fastify themselves.** They have their own test suites. Test *your* schemas, *your* routes, *your* business logic.
- **Don't snapshot the whole Swagger/OpenAPI document or a full JSON response.** Snapshots of large objects fail on any incidental change (a new optional field, a timestamp) and get rubber-stamp-updated without anyone reading the diff. Assert on the specific fields the test is about.
- **Don't write one test per CRUD verb combinatorially if it doesn't map to real usage.** A generic "PATCH updates every field" test is less valuable than a test for the one or two fields that actually have interesting update logic (e.g., email requires re-verification, role changes require admin).

## External services

Real integration tests should hit your real Fastify app and your real Postgres — but a genuinely external third party (a payment provider, an email service, an external API) doesn't belong in a test run: it's slow, flaky, costs money, or sends real emails. Inject that client instead of the database:

- Give the external service its own thin client module (`src/services/email.ts`) and pass a fake implementation into `buildApp()` for tests, the same way `prisma` is injected above.
- Or mock at the network boundary with `msw` (`msw/node`) if the client makes raw `fetch` calls you don't own.

The line to hold: mock things you don't control (third-party APIs), never mock things you do (your own database, your own handlers).

## CI

Mirror the same per-app, per-check job style already used for linting (`.github/workflows/linting.yml`): one named job, scoped to `backend` via `defaults.run.working-directory`, checkout → `actions/setup-node` with `node-version-file: "backend/.nvmrc"` → `npm ci` → run the script. Testcontainers needs nothing extra beyond that — `ubuntu-latest` runners already run a Docker daemon, so `@testcontainers/postgresql` just works with no `services:` block to declare, which is the one thing about this job that has no lint equivalent:

```yaml
backend-tests:
  name: Backend Tests
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: backend
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version-file: "backend/.nvmrc"

    - run: npm ci

    - run: npm test
```

Keep this job in its own `testing.yml` workflow (triggered `on: pull_request`, same as `linting.yml`) rather than folding it into the lint workflow — a slow or flaky test run shouldn't block the fast lint signal, and the two checks answer different questions (lint: is this styled correctly; test: is this correct).

## Speeding this up later

`fileParallelism: false` (one Postgres instance, test files run one at a time) is the simple default and is worth keeping until it's actually slow — don't add complexity you don't need yet. If the suite grows large enough that serial execution is the bottleneck, the standard fix is one Postgres **schema** per Vitest worker (via `VITEST_POOL_ID`), each migrated independently, so files can run in parallel against isolated schemas in the same container without touching each other's data. Cross that bridge when you're actually waiting on `npm test`, not before.
