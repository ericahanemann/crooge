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

/**
 * Shared by `POST /users`' `password` and `PATCH /me/password`'s
 * `newPassword` — one definition for the complexity rule so the two never
 * drift apart.
 */
export const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => /\d/.test(value), {
    message: "must contain at least one number",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "must contain at least one symbol",
  })
  .describe(
    "Minimum 8 characters, with at least one number and one symbol. Hashed with argon2 before storage.",
  );

// Allowed values for each account-scoped preference. Kept here (not as
// Prisma enums — see schema.prisma's comment on `User.locale` etc.) so
// growing the set (a new accent color, a new supported currency) is a
// one-line change here, not a migration.
export const localeSchema = z.enum(["en", "pt-BR"]);
export const themeSchema = z.enum(["light", "dark"]);
export const colorThemeSchema = z.enum([
  "pink",
  "violet",
  "emerald",
  "amber",
  "sky",
]);
// Display-only — see `currency` column comment in schema.prisma.
export const currencySchema = z.enum(["BRL", "USD", "EUR"]);
export const savingsRateSchema = z.int().min(0).max(100);

export type Locale = z.infer<typeof localeSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type ColorTheme = z.infer<typeof colorThemeSchema>;
export type Currency = z.infer<typeof currencySchema>;

export const meResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    locale: localeSchema,
    theme: themeSchema,
    colorTheme: colorThemeSchema,
    currency: currencySchema,
    savingsRate: savingsRateSchema,
  })
  .describe("The authenticated user's profile.");

z.globalRegistry.add(meResponseSchema, { id: "Me" });
