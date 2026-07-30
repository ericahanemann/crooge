# Crooge — Functional Requirements, Business Rules and Non-Functional Requirements

## The project

Crooge is a personal finance app: account balance, monthly income/expenses, expense categorization, and credit cards (current bill, future bills, early bill payment). This document is the starting point for the back-end: an API in **Fastify** + **Prisma** + **PostgreSQL**, living in a `backend/` folder next to `frontend/` in this repo.

Each user has exactly one implicit account/balance — it isn't a modeled "bank account" the user creates or manages, just a running tally of what's coming in and going out. There's no separate account-creation step; it exists as soon as the user signs up.

---

## Functional Requirements

### Authentication and user

- [ ] It should be possible to sign up (name, email, password)
- [ ] It should be possible to sign in (email, password)
- [ ] It should be possible to sign in with Google
- [ ] It should be possible to get the logged-in user's profile
- [ ] It should be possible to edit the logged-in user's profile
- [ ] It should be possible to log out

### Monthly summary, income and expenses

- [ ] It should be possible to get the financial summary of a month
- [ ] It should be possible to navigate to other months and get that month's summary/transactions
- [ ] It should be possible to register a one-time income
- [ ] It should be possible to register a one-time expense
- [ ] It should be possible to register an installment expense
- [ ] It should be possible to register a recurring expense
- [ ] It should be possible to get the list of transactions for a month
- [ ] It should be possible to search transactions by description
- [ ] It should be possible to filter transactions by category

### Categories

- [ ] It should be possible to get the list of default categories
- [ ] It should be possible to register a custom category

### Credit cards

- [ ] It should be possible to register a credit card
- [ ] It should be possible to get the user's list of credit cards (a user may have multiple)
- [ ] It should be possible to get a card's current bill
- [ ] It should be possible to get a card's bill history
- [ ] It should be possible to get the transactions for a specific bill/month of a card
- [ ] It should be possible to register a purchase on a credit card
- [ ] It should be possible to pay off one or more of a card's bills (current and/or future) in a single action

---

## Business Rules

### Authentication and user

- [ ] The user must not be able to sign up with a duplicate email
- [ ] The password must meet minimum security requirements: a minimum length, plus at least one number and one symbol (exact minimum length to be defined during implementation)

### Income and expenses

- [ ] The amount of an income or expense must be greater than zero
- [ ] Description, date, and category are required on every transaction
- [ ] An installment expense must have at least 2 installments
- [ ] An installment expense automatically generates one installment on each of the following bills/months, for the total amount divided by the number of installments
- [ ] A recurring expense repeats automatically every month (or year, depending on frequency) until canceled
- [ ] Every expense has a payment method: debit/pix (debits the account balance immediately) or credit (goes into the card's bill, doesn't affect the balance until the bill is paid)
- [ ] The account balance is the sum of income minus debit/pix expenses minus the current month's credit card bill (the bill closing/due that month)
- [ ] "Spent this month" (shown on the Spending Card) is debit/pix expenses plus that same current credit card bill total used in the balance calculation
- [ ] The daily limit is the remaining monthly budget divided by the days left in the month

### Categories

- [ ] A custom category belongs only to the user who created it — other users can't see it
- [ ] A custom category can be edited and deleted after creation

### Credit cards

- [ ] A purchase on a card must not exceed the available credit limit
- [ ] A user can have multiple credit cards
- [ ] A user can only see/edit their own cards, transactions, and categories (per-user isolation)
- [ ] Paying the current bill and paying future bills early are the same underlying action — settling one or more bills — modeled as a single operation: it takes a set of bill months/ids (current and/or future) plus an amount (defaulting to the sum of the selected bills, editable by the user). Only future bills can be included ahead of their due date; the current bill can always be included. The front-end's "pay" and "antecipate" dialogs are just two entry points into this same operation, pre-selecting different bills by default.

---

## Non-Functional Requirements

- [ ] The user's password needs to be encrypted (hash — bcrypt/argon2)
- [ ] The application's data needs to be persisted in a PostgreSQL database, via Prisma
- [ ] The API must be built with Fastify
- [ ] The user must be identified by a JWT
- [ ] Transaction and bill lists need to be paginated
- [ ] Monetary amounts must be stored in a way that avoids floating-point errors (Prisma's `Decimal`, or integer cents)
- [ ] The API needs to allow CORS for the Next.js front-end to consume the routes
- [ ] Authenticated routes must validate the JWT before running the handler (Fastify hook/middleware)
