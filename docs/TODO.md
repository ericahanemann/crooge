# TODO

- [x] Allow editing/deleting a custom category after creation (already shipped with the unified-categories work — `update-category.ts`/`delete-category.ts` — checkbox was just stale)
- [x] Paginate `GET /credit-cards/:id/bills` (`GET /transactions` stayed unpaginated — see `docs/next-steps.md`)
- [x] Include the current month's open credit card bill in `/transactions/summary`'s `balance`/`spent`
- [x] Add edit/delete for transactions and credit cards
- [x] Add a way to keep recurring transactions going past their initial horizon
- [x] Add an "edit profile" endpoint (`PATCH /me` + `PATCH /me/password` — see `docs/edit-profile-spec.md`)
- [x] Add account/profile settings page (`/profile` — name/email, locale/theme/accent/currency/savings-rate preferences, change-password dialog)
- [ ] Add automated tests
- [x] Add Google sign-in (OAuth) — `POST /sessions/google` (sign in or sign up) + `POST /me/google` (link to an already-authenticated account); frontend renders Google's own "Sign in/up with Google" button via Identity Services (`GoogleSignInButton`), no custom OAuth redirect flow
- [ ] Add password recovery
- [ ] Add email verification
- [ ] Design and build the dashboard page

- [x] Add "add credit card" dialog (also grew an edit dialog for the same fields)
- [x] Enforce password complexity (number + symbol), not just a minimum length
- [x] Enforce that a credit card purchase can't exceed the card's available credit
