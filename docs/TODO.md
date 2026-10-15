# TODO

## Deploy in prod

Hosts decided (2026-10-10): **Vercel** (frontend), **Render free web
service + Neon free Postgres** (backend) — not Firebase (Cloud SQL has no
real free tier; Firestore would mean abandoning Prisma/Postgres entirely),
not Render's own free Postgres (expires 30 days after creation, deleted
after a 14-day grace period — confirmed on Render's own docs), not
Railway/Fly (neither has an unconditional free tier as of Oct 2026).

Code-side prep is done (health check, `trustProxy`, `--env-file-if-exists`,
backend `Dockerfile` — now runs `prisma migrate deploy` on every boot,
safe specifically because Render's free plan hard-caps at one instance;
see the Dockerfile's comment if this ever moves to a multi-instance plan —
Server Actions origin, `db:migrate:deploy` script, `/api/v1` route
versioning — see git history). What's left needs an external interface,
not code:

- [x] Create the Neon project, get its pooled connection string — done,
      migrations applied against it
- [x] Create the Render web service from `backend/Dockerfile` — live at
      https://crooge.onrender.com, `/health` returns 200. `FRONTEND_URL`
      and `GOOGLE_CLIENT_ID` are still set to placeholders there (see the
      two items below)
- [x] Google Cloud Console — done. Branding filled in, stayed in Testing
      publishing status with the 3-4 real users added as test users
      (avoids any verification-review risk at this scale — see the "Move
      Google OAuth config to production" item below for later), and
      `https://crooge.ericahanemann.com.br` added alongside the existing
      `http://localhost:3000` under the existing client's Authorized
      JavaScript origins. Same `GOOGLE_CLIENT_ID` as before — no new
      client, nothing to change in either `.env`
- [ ] DNS: point `crooge.ericahanemann.com.br` at Vercel, and a subdomain
      (e.g. `api.crooge.ericahanemann.com.br`) at the Render service
- [ ] Set `SERVER_ACTIONS_ALLOWED_ORIGIN` (frontend) to the real prod
      domain — see `next.config.ts`
- [ ] Set `FRONTEND_URL` (backend, for CORS) and `NEXT_PUBLIC_API_URL`
      (frontend) to each other's real prod URLs — `NEXT_PUBLIC_API_URL` is
      just the host (e.g. `https://api.crooge.ericahanemann.com.br`), no
      `/api/v1` suffix — the frontend code appends that itself
- [ ] Vercel project settings: Root Directory → `frontend`

## Next Features (after prod deploy)

- [ ] Move Google OAuth config to production — flip the Google Auth
      platform's publishing status from Testing to "In production" once
      this needs to be open to more than the handful of people added as
      test users. Not expected to trigger Google's verification review
      (only basic identity scopes are requested, no sensitive/restricted
      data), but confirm that's still true when the time comes.
- [ ] Add password recovery
- [ ] Add email verification
- [ ] Design and build the dashboard page
- [ ] Shared bills — split a bill with one or more friends; track how much
      you owe each other. Likely needs a "friends" concept first (connecting
      two accounts).
