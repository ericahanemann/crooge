/**
 * Every business route lives under this prefix; `/health` and `/docs` stay
 * outside it deliberately — a host's health check and the Swagger UI are
 * infra-level, not part of the versioned API contract, so they shouldn't
 * have to change if that contract ever does. There's only one consumer of
 * this API today (this repo's own frontend, deployed in lockstep with the
 * backend from the same commit), so there's nothing to version *against*
 * yet — this exists so that if an uncoordinated second consumer (a mobile
 * app, a future "shared bills" integration between two accounts) ever
 * needs the contract to hold still while it evolves, a `/api/v2` can be
 * added beside this one without an existing client ever being forced to
 * move.
 *
 * Lives in its own module (rather than being defined in `app.ts`) so
 * `modules/auth/constants.ts` can import it for `REFRESH_TOKEN_COOKIE_PATH`
 * without an `app.ts` -> routes -> constants.ts -> `app.ts` import cycle.
 */
export const API_V1_PREFIX = "/api/v1";
