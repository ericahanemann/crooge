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
// No upload infra (see schema.prisma's `User.avatarUrl` comment) — just a
// plain image URL the user pastes in, or Google's own picture URL.
export const avatarUrlSchema = z.url().max(2048);

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
    avatarUrl: z
      .url()
      .nullable()
      .describe(
        "Set by hand on the profile page, or automatically from Google's own picture on first Google sign-in/link (never overwrites a value the user already set). Null if neither has happened.",
      ),
    hasPassword: z
      .boolean()
      .describe(
        "False for a Google-only account that's never set one — `PATCH /me/password` doesn't require `currentPassword` in that case (see its own docs).",
      ),
    hasGoogleAccount: z
      .boolean()
      .describe(
        "Whether a Google account is linked (`POST /sessions/google` or `POST /me/google`).",
      ),
  })
  .describe("The authenticated user's profile.");

z.globalRegistry.add(meResponseSchema, { id: "Me" });
