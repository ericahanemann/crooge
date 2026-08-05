import { z } from "zod";

/**
 * Access/refresh token pair issued by `POST /sessions` and `POST
 * /sessions/refresh`. The refresh token is also set as an httpOnly cookie,
 * but is returned in the body too since some clients (e.g. a Next.js BFF
 * running server-side) need to persist it themselves rather than relying on
 * a browser cookie jar.
 */
export const sessionResponseSchema = z
  .object({
    accessToken: z
      .string()
      .describe(
        'Short-lived JWT (15 minutes). Send as an "Authorization: Bearer <token>" header on every authenticated request.',
      ),
    refreshToken: z
      .string()
      .describe(
        "Long-lived, single-use opaque token (30 days). Rotates on every refresh; reusing a stale one revokes the whole session family.",
      ),
  })
  .describe("Access/refresh token pair.");

z.globalRegistry.add(sessionResponseSchema, { id: "Session" });

export const meResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
  })
  .describe("The authenticated user's profile.");

z.globalRegistry.add(meResponseSchema, { id: "Me" });
