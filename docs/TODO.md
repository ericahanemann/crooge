# TODO

- [ ] Deploy in prod (needs a real Google Cloud OAuth Client ID in both
      `backend/.env`'s `GOOGLE_CLIENT_ID` and `frontend/.env.local`'s
      `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — both are placeholders today; also set
      the OAuth consent screen's app name/logo/support email and "Authorized
      JavaScript origins" in Google Cloud Console, not code)

## Next Features (after prod deploy)

- [ ] Add password recovery
- [ ] Add email verification
- [ ] Design and build the dashboard page
- [ ] Shared bills — split a bill with one or more friends; track how much
      you owe each other. Likely needs a "friends" concept first (connecting
      two accounts).
