# Crooge — Functional Requirements, Business Rules and Non-Functional Requirements

## The project

Crooge is a personal finance app: account balance, monthly income/expenses, expense categorization, and credit cards (current bill, future bills, early bill payment). This document is the starting point for the back-end: an API in **Fastify** + **Prisma** + **PostgreSQL**, living in a `backend/` folder next to `frontend/` in this repo.

Each user has exactly one implicit account/balance — it isn't a modeled "bank account" the user creates or manages, just a running tally of what's coming in and going out. There's no separate account-creation step; it exists as soon as the user signs up.

---

## Functional Requirements

### Authentication and user

- [x] It should be possible to sign up (name, email, password)
- [x] It should be possible to sign in (email, password)
- [ ] It should be possible to sign in with Google 
- [x] It should be possible to get the logged-in user's profile
- [ ] It should be possible to edit the logged-in user's profile
- [x] It should be possible to log out

### Monthly summary, income and expenses

- [x] It should be possible to get the financial summary of a month
- [x] It should be possible to navigate to other months and get that month's summary/transactions
- [x] It should be possible to register a one-time income
- [x] It should be possible to register a one-time expense
- [x] It should be possible to register an installment expense
- [x] It should be possible to register a recurring expense
- [x] It should be possible to get the list of transactions for a month
- [x] It should be possible to search transactions by description (client-side, over the fetched month)
- [x] It should be possible to filter transactions by category (client-side, over the fetched month)

### Categories

- [x] It should be possible to get the list of default categories (static list on the frontend, `lib/categories.ts` — no persisted `Category` table, see design decision below)
- [x] It should be possible to register a custom category (session-local — see business rules)

### Credit cards

- [x] It should be possible to register a credit card
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
- [ ] The password must meet minimum security requirements: a minimum length, plus at least one number and one symbol (currently only a minimum length of 8 is enforced — the number/symbol requirement isn't implemented yet)

### Income and expenses

- [x] The amount of an income or expense must be greater than zero
- [x] Description, date, and category are required on every transaction
- [x] An installment expense must have at least 2 installments
- [x] An installment expense automatically generates one installment on each of the following bills/months, for the total amount divided by the number of installments
- [ ] A recurring expense repeats automatically every month (or year, depending on frequency) until canceled (currently materializes a fixed horizon upfront instead — 12 occurrences for monthly, 3 for annual — since there's no cron infra yet; see TODO.md)
- [x] Every expense has a payment method: debit/pix (debits the account balance immediately) or credit (goes into the card's bill, doesn't affect the balance until the bill is paid)
- [ ] The account balance is the sum of income minus debit/pix expenses minus the current month's credit card bill (the bill closing/due that month) (currently `balance` is all-time income minus all-time debit/pix expenses — it doesn't yet subtract the open card bill; see TODO.md)
- [ ] "Spent this month" (shown on the Spending Card) is debit/pix expenses plus that same current credit card bill total used in the balance calculation (currently only the month's debit/pix expenses; the card bill isn't added in yet — same gap as above)
- [x] The daily limit is the remaining monthly budget divided by the days left in the month

### Categories

- [x] A custom category belongs only to the user who created it — other users can't see it (trivially true today: custom categories are session-local, never persisted or shared)
- [ ] A custom category can be edited and deleted after creation (can currently only be added, not edited/removed, within a dialog session)

### Credit cards

- [ ] A purchase on a card must not exceed the available credit limit (not enforced yet — a credit purchase is accepted regardless of available credit; see TODO.md)
- [x] A user can have multiple credit cards
- [x] A user can only see/edit their own cards, transactions, and categories (per-user isolation — every query is scoped by `userId`)
- [x] Paying the current bill and paying future bills early are the same underlying action — settling a bill. Implemented as `POST /credit-cards/:id/bills/:month/pay`, one bill per call (an optional `amount` overrides the computed default). Only future bills can be paid ahead of their due date; the current bill can always be paid. The front-end's "pay" and "antecipar" dialogs are two entry points into this same endpoint — "antecipar" calls it once per selected future bill rather than in one batched request.

---

## Non-Functional Requirements

- [x] The user's password needs to be encrypted (hash — bcrypt/argon2) (argon2, via `@node-rs/argon2`)
- [x] The application's data needs to be persisted in a PostgreSQL database, via Prisma
- [x] The API must be built with Fastify
- [x] The user must be identified by a JWT (access/refresh token pair, refresh tokens rotated and revocable)
- [ ] Transaction and bill lists need to be paginated (not implemented yet — `GET /transactions` and `GET /credit-cards/:id/bills` currently return the full result set; see TODO.md)
- [x] Monetary amounts must be stored in a way that avoids floating-point errors (Prisma's `Decimal`, or integer cents) (`Decimal` throughout)
- [x] The API needs to allow CORS for the Next.js front-end to consume the routes
- [x] Authenticated routes must validate the JWT before running the handler (Fastify hook/middleware) (`app.authenticate`, applied via `onRequest` on every protected route)
