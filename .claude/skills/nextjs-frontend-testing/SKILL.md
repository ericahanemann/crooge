---
name: nextjs-frontend-testing
description: Guides writing automated tests for a Next.js App Router frontend (React 19) — component-level tests with Vitest + React Testing Library, and end-to-end user-flow tests with Playwright — favoring tests that exercise the app the way a user actually would over tests of internal implementation details. Use this whenever the user asks to add tests, write test coverage, set up a test suite, prevent UI regressions, or test a page/component/form/user flow in this frontend — even if they just say "add tests for this form" or "make sure this page doesn't break" without naming a framework. Also use it when scaffolding a new frontend project's testing setup (Vitest config, Playwright config, a CI test job), and to decide whether a given component needs a real browser (async Server Components, multi-page flows, auth) or can be tested with Vitest + RTL alone.
---

# Testing a Next.js (App Router, React 19) frontend

## The core idea

A user doesn't call `useState` or check that a prop got passed down — they click a button, see a label, get redirected. Tests should watch for the same things: what's on screen, what happens when you click or type, where you end up. That's what React Testing Library and Playwright are both built around (querying by role and label text, driving interaction like a real person), and it's why tests written this way survive a refactor that changes *how* a component works without changing *what* it does.

Two tools, two jobs:

- **Vitest + React Testing Library** — render one component (or a small tree) in isolation, interact with it, assert on what's visible. Fast, no browser, no server.
- **Playwright** — drive a real browser against the real running app: full navigation, real cookies/auth, real network. Slower, but the only way to test what a user experiences end-to-end.

The majority of your coverage should be integration-shaped: components rendered with their real children (not shallow-rendered), tested through what the user sees and does — plus Playwright for the handful of critical journeys (login, checkout, the core workflow of the product) where only a real browser proves the whole thing actually works together.

## Deciding which tool a given test needs

This isn't just a style preference — with the App Router, it's a hard technical boundary. **Vitest cannot currently render `async` Server Components** (Next.js's own testing docs call this out explicitly). Most `page.tsx` files that fetch data directly are `async` Server Components. So:

| What you're testing | Tool |
|---|---|
| A synchronous Client Component (`'use client'`) — a form, a button, a modal | Vitest + RTL |
| A synchronous Server Component with no `async` | Vitest + RTL |
| An `async` Server Component (fetches data itself) | **Playwright** — Vitest can't render it |
| A full page, including layout, data fetching, and navigation | Playwright |
| A flow spanning multiple pages, or requiring real auth/cookies | Playwright |

When in doubt: if you can render the component with the props you'd pass it in a unit test, Vitest + RTL is enough. If the component reaches out and fetches its own data or the test needs to *navigate*, it's a Playwright job.

## Setup: Vitest + React Testing Library

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths msw
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'], // keep Playwright specs out of Vitest's run
  },
})
```

```ts
// tests/setup/vitest.setup.ts
import '@testing-library/jest-dom/vitest'
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### A render helper for your providers

Real components render inside `next-intl` and `next-themes` providers — test them the same way, or you'll get confusing failures that have nothing to do with the component under test:

```tsx
// tests/setup/test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import type { ReactElement } from 'react'
import messages from '../../messages/en.json'

function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ThemeProvider attribute="class">{ui}</ThemeProvider>
    </NextIntlClientProvider>,
    options,
  )
}

export * from '@testing-library/react'
export { renderWithProviders as render }
```

### Mocking API calls with MSW

Your components call your Fastify API via `fetch`. Mock at the network layer with `msw` so the component's actual fetch logic runs, but hits a fake server instead of a real one:

```ts
// tests/setup/msw-server.ts
import { setupServer } from 'msw/node'
export const server = setupServer()
```

```ts
// tests/setup/vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './msw-server.js'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Writing a component test

```tsx
// app/(auth)/login/login-form.test.tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../tests/setup/msw-server.js'
import { render } from '../../../tests/setup/test-utils.js'
import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('shows a validation message when the password is left empty', async () => {
    render(<LoginForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'erica@example.com')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
  })

  it('submits the form and shows a success state', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ ok: true }, { status: 200 })),
    )
    render(<LoginForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'erica@example.com')
    await user.type(screen.getByLabelText(/password/i), 'correct-horse-battery-staple')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
  })

  it('shows the API error message when login fails', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    )
    render(<LoginForm />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'erica@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
  })
})
```

Query by role and accessible label (`getByRole`, `getByLabelText`), the way a screen reader or a real user would find these elements — not by CSS class or `data-testid`. This has a second benefit beyond durability: if a query is hard to write because an element has no accessible role or label, that's usually a real accessibility gap worth fixing, not just a test inconvenience.

## Setup: Playwright

```bash
npm init playwright@latest
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Building the app before starting it (rather than `next dev`) catches build-only failures and matches what actually ships. It's slower per run, so keep `reuseExistingServer` on for local iteration and only pay the full build cost in CI.

## Writing an end-to-end test

```ts
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('a user can log in and reach their dashboard', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel(/email/i).fill('erica@example.com')
  await page.getByLabel(/password/i).fill('correct-horse-battery-staple')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
})

test('an invalid login shows an error and keeps the user on the page', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel(/email/i).fill('erica@example.com')
  await page.getByLabel(/password/i).fill('wrong-password')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  await expect(page).toHaveURL('/login')
})
```

### Talking to the backend in E2E tests

Reserve Playwright for the journeys where hitting the real backend is the point — auth, checkout, anything where wiring between frontend and backend is exactly what could break. Two ways to give it a backend:

- **Real backend, seeded database.** Point the app under test at a real (test) Fastify instance backed by a disposable Postgres — the same Testcontainers approach as the backend's own test suite, or a dedicated seeded test database. Highest fidelity; use this for the handful of journeys that matter most.
- **Mocked network, for frontend-only flows.** When a test is really about frontend behavior (routing, layout, client-side state) and not about proving frontend/backend integration, intercept requests with `page.route()` instead of running a real backend. Cheaper and faster, but it's no longer testing the seam between the two — don't reach for it on the journeys where that seam is the point.

## What not to test

- **Don't snapshot entire component trees or full-page DOM.** Large snapshots fail on any incidental markup change and get updated without being read. Assert on the specific text, role, or state the test is about.
- **Don't test exact CSS classes or Tailwind utility strings.** They change with every restyle and say nothing about whether the feature works. If a visual regression matters, that's a job for a dedicated screenshot-diffing tool, not a unit assertion on `className`.
- **Don't re-test shadcn or Base UI's internals.** A `<Select>` opening and closing is already tested upstream. Test *your* usage of it — that choosing an option updates *your* form state, not that the dropdown mechanism itself works.
- **Don't assert on Recharts' internal SVG paths or pixel positions.** Test the data-driven, user-visible parts instead — that the right labels/values appear in the accessible text, or that the chart renders without throwing given a given dataset. Pixel-level chart correctness belongs to Recharts' own tests.
- **Don't reach for `data-testid` as a first choice.** It's a valid last resort when an element genuinely has no accessible role or text (a decorative icon button with no label, say) — but reaching for it by default hides real accessibility gaps that `getByRole`/`getByLabelText` would have caught.

## Directory layout

```
tests/
  setup/
    vitest.setup.ts
    test-utils.tsx      # renderWithProviders
    msw-server.ts
e2e/
  login.spec.ts
  checkout.spec.ts
app/
  (auth)/
    login/
      login-form.tsx
      login-form.test.tsx   # colocated component test
```

Colocating component tests next to the component they cover (`Component.tsx` + `Component.test.tsx`) tends to keep them from going stale; `e2e/` stays separate both physically and in Vitest's `exclude` config so the two runners never trip over each other's files.

## CI

Same per-app, per-check job style as linting (`.github/workflows/linting.yml`): one named job per concern, scoped via `defaults.run.working-directory: frontend`, checkout → `actions/setup-node` with `node-version-file: "frontend/.nvmrc"` → `npm ci` → run the script. Split unit tests and E2E into separate jobs — E2E is meaningfully slower (browser install + a full `next build && next start`) and shouldn't block the fast unit-test signal:

```yaml
frontend-unit-tests:
  name: Frontend Unit Tests
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: frontend
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version-file: "frontend/.nvmrc"

    - run: npm ci

    - run: npm test

frontend-e2e-tests:
  name: Frontend E2E Tests
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: frontend
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version-file: "frontend/.nvmrc"

    - run: npm ci

    - run: npx playwright install --with-deps chromium

    - run: npm run test:e2e
```

Both jobs live in their own `testing.yml` workflow (`on: pull_request`, matching `linting.yml`) rather than being folded into the lint workflow. Once this is running, consider uploading the Playwright report/trace as a build artifact on failure — a failing PR check with a downloadable trace is far easier to debug than red text alone.
