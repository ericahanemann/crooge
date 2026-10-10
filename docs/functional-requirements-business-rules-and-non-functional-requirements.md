# Crooge — Functional Requirements, Business Rules and Non-Functional Requirements

## The project

Crooge is a personal finance app: account balance, monthly income/expenses, expense categorization, and credit cards (current bill, future bills, early bill payment). This document is the starting point for the back-end: an API in **Fastify** + **Prisma** + **PostgreSQL**, living in a `backend/` folder next to `frontend/` in this repo.

Each user has exactly one implicit account/balance — it isn't a modeled "bank account" the user creates or manages, just a running tally of what's coming in and going out. There's no separate account-creation step; it exists as soon as the user signs up.

---

## Functional Requirements

### Authentication and user

- [x] It should be possible to sign up (name, email, password)
- [x] It should be possible to sign in (email, password)
- [x] It should be possible to sign in with Google (ID-token flow via Google Identity Services — `POST /sessions/google` creates an account on first use or signs into an existing one; see the business rules below for the account-linking policy) 
- [x] It should be possible to get the logged-in user's profile
- [x] It should be possible to edit the logged-in user's profile (`PATCH /me` — name/email/preferences; `PATCH /me/password` for password changes, kept separate)
- [x] It should be possible to log out

### Monthly summary, income and expenses

- [x] It should be possible to get the financial summary of a month
- [x] It should be possible to navigate to other months and get that month's summary/transactions
- [x] It should be possible to register a one-time income
- [x] It should be possible to register a one-time expense
- [x] It should be possible to register an installment expense
- [x] It should be possible to register a recurring expense
- [x] It should be possible to edit or delete a one-time/installment/recurring transaction (`PATCH`/`DELETE /transactions/:id` — editing an installment/recurring occurrence is limited to description/category, see business rule below; deleting a recurring occurrence offers "this one" vs. "this and all future")
- [x] It should be possible to get the list of transactions for a month
- [x] It should be possible to search transactions by description (client-side, over the fetched month)
- [x] It should be possible to filter transactions by category (client-side, over the fetched month)

### Categories

- [x] It should be possible to get the list of a user's categories — seeded at signup with a starter set (13 expense + 5 income), persisted as real per-user `Category` rows; there's no separate hardcoded "built-in" list, a seeded category is just an ordinary row from that point on (see `frontend/DESIGN.md` "Categories")
- [x] It should be possible to register, rename/re-icon, and delete a custom category (persisted, scoped to the creating user)

### Credit cards

- [x] It should be possible to register a credit card
- [x] It should be possible to edit or archive (soft-delete) a credit card
- [x] It should be possible to get the user's list of credit cards (a user may have multiple)
- [x] It should be possible to get a card's current bill
- [x] It should be possible to get a card's bill history
- [x] It should be possible to get the transactions for a specific bill/month of a card
- [x] It should be possible to register a purchase on a credit card
- [x] It should be possible to pay off one or more of a card's bills (current and/or future) — see business rule below for how this is actually modeled

---

## Business Rules

### Authentication and user

- [x] The user must not be able to sign up with a duplicate email
- [x] The password must meet minimum security requirements: a minimum length, plus at least one number and one symbol (minimum length 8, at least one digit, at least one symbol)
- [x] A Google sign-in whose email matches an existing *passwordless* account (or has no match at all) is linked/created automatically; a Google sign-in whose email matches an existing account that **has** a password is refused (`409`) rather than auto-linked — this app's own signup never verifies email ownership, so an attacker could have pre-created an account under someone else's email, and auto-linking would hand the real owner into an account the attacker's password still unlocks. Completing that link requires proving the existing password first (`POST /sessions`, then the authenticated `POST /me/google`)
- [x] A user may have both a password and a linked Google account at once, in either order — a password account can link Google later (profile page), and a Google-only account can set a password later (same page, no `currentPassword` required since none exists yet)

### Income and expenses

- [x] The amount of an income or expense must be greater than zero
- [x] Description, date, and category are required on every transaction
- [x] An installment expense must have at least 2 installments
- [x] An installment expense automatically generates one installment on each of the following bills/months, for the total amount divided by the number of installments
- [x] A recurring expense repeats automatically every month (or year, depending on frequency) until canceled — no fixed horizon or cron infra: each occurrence is a real `Transaction` row materialized lazily (on the next `GET /transactions`/`GET /transactions/summary` read that needs it), computed directly from the series' rule rather than walking forward from the last occurrence, so it's correct arbitrarily far into the future or past. "Delete from here forward" on an occurrence sets the series' `endDate`, after which no later occurrence is ever materialized.
- [x] Every expense has a payment method: debit/pix (debits the account balance immediately) or credit (goes into the card's bill, doesn't affect the balance until the bill is paid)
- [x] The account balance is the sum of income minus debit/pix expenses minus credit card bills that have come due (the bill materializes into a real, read-only, non-card `Transaction` once its due date passes — or earlier, if paid ahead of time — and is counted here from that point on; a still-open bill with no passed due date and no early payment doesn't affect the balance yet)
- [x] "Spent this month" (shown on the Spending Card) uses that same materialized-bill mechanism — a bill counts once due/paid, not before
- [x] The daily limit is the remaining monthly budget divided by the days left in the month, where the budget is income times `(1 − savingsRate / 100)` — `savingsRate` is an optional per-user preference (`PATCH /me`, default `0`%), so this is `income` unless the user has set one

### Categories

- [x] A custom category belongs only to the user who created it — other users can't see it (every `Category` row is scoped by `userId`)
- [x] A custom category can be edited (relabel/re-icon) and deleted after creation. One seeded category per kind (the "Other" fallback, `isFallback: true`) can be edited but never deleted — deleting any other category reassigns its transactions (and any `RecurringSeries` using it) to that kind's fallback, so it must always exist. A backend-managed category (`isSystem`, e.g. the "Credit Card Bill" category materialized bill transactions are filed under) can't be edited or deleted by the user at all.

### Credit cards

- [x] A purchase on a card must not exceed the available credit limit (checked against `getAvailableCredit` — the same figure exposed as `available` on the card summary; a purchase whose total amount, including all future installments, would exceed it is rejected with `422`)
- [x] A user can have multiple credit cards
- [x] A user can only see/edit their own cards, transactions, and categories (per-user isolation — every query is scoped by `userId`)
- [x] Paying the current bill and paying future bills early are the same underlying action — settling a bill. Implemented as `POST /credit-cards/:id/bills/:month/pay`, one bill per call (an optional `amount` overrides the computed default). Only future bills can be paid ahead of their due date; the current bill can always be paid. The front-end's "pay" and "antecipar" dialogs are two entry points into this same endpoint — "antecipar" calls it once per selected future bill rather than in one batched request.

---

## Non-Functional Requirements

- [x] The user's password needs to be encrypted (hash — bcrypt/argon2) (argon2, via `@node-rs/argon2`)
- [x] The application's data needs to be persisted in a PostgreSQL database, via Prisma
- [x] The API must be built with Fastify
- [x] The user must be identified by a JWT (access/refresh token pair, refresh tokens rotated and revocable)
- [x] Transaction and bill lists are paginated (`GET /credit-cards/:id/bills` — max page size 60, 5 years of monthly cycles; `GET /transactions` also accepts `page`/`pageSize`, plus `search` — a case-insensitive substring match against the description — and `category` — an exact category id — both scoped to the already-selected month, not all-time history; see `backend/src/modules/transactions/schemas.ts`)
- [x] Monetary amounts must be stored in a way that avoids floating-point errors (Prisma's `Decimal`, or integer cents) (`Decimal` throughout)
- [x] The API needs to allow CORS for the Next.js front-end to consume the routes
- [x] Authenticated routes must validate the JWT before running the handler (Fastify hook/middleware) (`app.authenticate`, applied via `onRequest` on every protected route)
