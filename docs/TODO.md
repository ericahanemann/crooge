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
Server Actions origin, `db:migrate:deploy` script — see git history).
What's left needs an external interface, not code:

- [ ] Create the Neon project, get its pooled connection string
- [ ] Create the Render web service from `backend/Dockerfile` (Root
      Directory: `backend`), set its env vars (`DATABASE_URL` from Neon,
      `JWT_SECRET`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `NODE_ENV=production`,
      `TRUST_PROXY=true` — safe here specifically because Render's free web
      service has no direct-to-container public ingress, only its own
      proxy)
- [ ] Real Google Cloud OAuth Client ID in both `backend/.env`'s
      `GOOGLE_CLIENT_ID` and `frontend/.env.local`'s
      `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (both are placeholders today) — also
      set the OAuth consent screen's app name/logo/support email and
      "Authorized JavaScript origins" in Google Cloud Console
- [ ] DNS: point `crooge.mycustomdomain.com.br` at Vercel, and a subdomain
      (e.g. `api.crooge.mycustomdomain.com.br`) at the Render service
- [ ] Set `SERVER_ACTIONS_ALLOWED_ORIGIN` (frontend) to the real prod
      domain — see `next.config.ts`
- [ ] Set `FRONTEND_URL` (backend, for CORS) and `NEXT_PUBLIC_API_URL`
      (frontend) to each other's real prod URLs
- [ ] Vercel project settings: Root Directory → `frontend`

## Next Features (after prod deploy)

- [ ] Add password recovery
- [ ] Add email verification
- [ ] Design and build the dashboard page
- [ ] Shared bills — split a bill with one or more friends; track how much
      you owe each other. Likely needs a "friends" concept first (connecting
      two accounts).
