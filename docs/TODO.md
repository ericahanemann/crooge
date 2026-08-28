# TODO

- [ ] Allow editing/deleting a custom category after creation
- [x] Paginate `GET /credit-cards/:id/bills` (`GET /transactions` stayed unpaginated — see `docs/next-steps.md`)
- [ ] Include the current month's open credit card bill in `/transactions/summary`'s `balance`/`spent`
- [ ] Add edit/delete for transactions and credit cards
- [ ] Add a way to keep recurring transactions going past their initial horizon
- [ ] Add an "edit profile" endpoint
- [ ] Add account/profile settings page
- [ ] Add automated tests
- [ ] Add Google sign-in (OAuth) — frontend already has the button, no handler wired up yet
- [ ] Add password recovery
- [ ] Add email verification
- [ ] Design and build the dashboard page

- [x] Add "add credit card" dialog (also grew an edit dialog for the same fields)
- [x] Enforce password complexity (number + symbol), not just a minimum length
- [x] Enforce that a credit card purchase can't exceed the card's available credit
