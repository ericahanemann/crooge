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
  // Journey tests (sign up, then several dialog round-trips against a real
  // backend) don't fit comfortably in the 30s default.
  timeout: 60_000,
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Default is 'ignore', which only shows this process's output if it fails
    // to *start*. Once it's up, anything it logs — including a server-side
    // error inside a Server Action — is invisible. In CI you can't attach a
    // debugger to the runner, so pay the log noise and keep the visibility.
    stdout: 'pipe',
    stderr: 'pipe',
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

## E2E: the failure modes that actually bite

### A spec you haven't run is a draft, not a test

Write a Playwright spec, then *run it* before moving on to the next one. Specs authored from reading the components — never executed — are reliably full of locator bugs, and you won't find them by re-reading the code. Worse, a suite that has never gone green once gives you nothing to bisect against later: when it fails you can't tell a real regression from a spec that was never right.

If the suite can't run where you are (no browser, not enough memory), say so plainly rather than declaring the specs done.

### Locator ambiguity is the most common first failure

Playwright runs locators in **strict mode**: matching two elements is an error, not a silent "take the first". Three recurring causes:

```ts
// 1. `name` is a case-insensitive SUBSTRING match, so "ADD" also matches
//    "Add category". Pin it down with exact.
page.getByRole('button', { name: 'ADD', exact: true })

// 2. Responsive markup renders the same content twice (one per breakpoint,
//    one hidden). `.first()` can pick the HIDDEN one — filter first.
page.getByText('Nubank').filter({ visible: true }).first()

// 3. A summary figure and a row can share text. Assert the more specific
//    string ("+R$1.000,00" for a row) instead of the bare number.
page.getByText('+R$1.000,00')
```

When a locator is ambiguous, prefer making the assertion *more specific* over slapping `.first()` on it — `.first()` silences the error but often stops testing the thing you meant.

### A click that lands on nothing looks exactly like a hung backend

This one costs hours if you don't know it. Playwright checks actionability and hit-tests the element *before* clicking. If the click itself changes the layout, the press and release land in different places and the click hits whatever moved into that spot.

The nastiest version: **content that appears on focus and unmounts on blur, positioned above the submit button.** Pressing the mouse on the button blurs the input first, the helper content unmounts, everything below it jumps up, and the click resolves onto the container behind the button. Same shape of bug from late-loading banners, images without `width`/`height`, and layout animations.

What makes it so expensive is the symptom: no console error, no page error, no network request, no visible change. The test just waits for a redirect that will never come, and every log you have looks like the server hung. You can burn a lot of CI runs theorising about CSRF, timeouts and concurrency before suspecting the click.

Diagnose it in one step — ask the browser what was actually clicked:

```ts
await page.evaluate(() => {
  document.addEventListener(
    'click',
    (e) => console.log('click landed on:', e.target.tagName, e.target.textContent?.slice(0, 40)),
    true, // capture, so nothing can swallow it
  )
})
```

If that prints an element you didn't aim at, stop reading network logs.

Two defences, and you want both:

- **In the app:** never let a blur handler resize anything above a submit button. Reserve the space, or keep the content mounted while the field has a value. A click that misses in a test is a click that misses for a real user.
- **In the test:** after clicking submit, assert the app *acknowledged* the click (a pending label, a disabled button, an inline error) before asserting the final state. Then a missed click fails in one second pointing at the button, instead of timing out 30 seconds later pointing at a URL.

### Make failures explain themselves

`waitForURL` timing out tells you only that the URL never changed — the same symptom for a rejected request, a swallowed client error, and a click that missed. In CI you can't attach a debugger, so have shared helpers dump the page's own account of itself on failure:

```ts
try {
  await page.waitForURL(/\/dashboard$/, { timeout: 20_000 })
} catch (error) {
  console.error([
    `final url: ${page.url()}`,
    `console: ${consoleMessages.join('\n') || '<none>'}`,
    `page errors: ${pageErrors.join('\n') || '<none>'}`,
    `visible text: ${await page.evaluate(() => document.body.innerText).catch(() => '?')}`,
  ].join('\n'))
  throw error
}
```

Playwright also writes an `error-context.md` next to each failure containing an accessibility snapshot of the page at the moment it broke — read that file before theorising. It answers "what was actually on screen" immediately.

### Reproduce locally before you theorise

If it only fails in CI, the instinct is to keep pushing commits with more logging. That loop is slow and it invites guessing: parallelism, timeouts, retries, CSRF — all plausible, all cheap to "fix", none verifiable. Prefer standing the app up locally and instrumenting the DOM directly, even if that means running the frontend against no backend at all just to watch what a click does. Minutes instead of round trips.

Reach for the `retries`, `workers` and `timeout` knobs **last**. They're how a reproducible bug gets relabelled as flakiness and stays in the codebase.

## Next.js App Router specifics worth knowing before you debug

- **A Server Action is a POST to the current page's URL**, not to a tidy `/api/...` path. Network assertions or `page.route()` filters written against a REST-ish path will match nothing and look like "the request was never made".
- **Server Actions have a CSRF origin check.** The request's `Origin` is compared against the `Host`; a mismatch is rejected. If the E2E app is served on a host that differs from what the browser sends, allow it explicitly via `experimental.serverActions.allowedOrigins` in `next.config.ts` — and make sure that allowance isn't accidentally scoped to only one environment.
- **A `<form onSubmit={...}>` with `e.preventDefault()` has no no-JS fallback.** Clicking it before hydration does a native GET submit to the same URL, which quietly reloads the page and throws the user's input away. `<form action={serverAction}>` is progressively enhanced and doesn't have that hole — prefer it for real submissions.
- **Controlled inputs filled before hydration keep the DOM value but leave React state empty**, so the form submits blank. If you suspect a hydration race, wait for something only a hydrated page can produce before interacting.

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

    # Set this up on day one, not the first time you need it. Without it, a
    # failing CI run points at a trace.zip that doesn't exist anywhere you
    # can reach.
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: frontend/test-results
        retention-days: 7
```

Both jobs live in their own `testing.yml` workflow (`on: pull_request`, matching `linting.yml`) rather than being folded into the lint workflow.

### Make CI observable before you need it

Debugging a browser test you can't watch is the expensive case, so pay the small setup cost up front:

- **`stdout: 'pipe'` / `stderr: 'pipe'` on every `webServer`** (see the config above) — otherwise the app server's output vanishes the moment it starts successfully.
- **Upload `test-results/`** as an artifact on failure, as above — that's where traces and each failure's `error-context.md` page snapshot live.
- **Turn on request logging in the test backend when running under CI** (e.g. Fastify's `logger: !!process.env.CI`). Knowing whether a request ever *arrived* splits the search space in half immediately: it's the difference between "the backend is slow" and "the browser never sent anything".

### Don't promote an E2E job to a required check until it has passed once

Keep a brand-new E2E workflow on `workflow_dispatch` while you get it green, then switch it to `on: pull_request`. Flipping the trigger first means every PR is blocked by a suite nobody has ever seen pass, and there's no known-good run to compare a failure against.
