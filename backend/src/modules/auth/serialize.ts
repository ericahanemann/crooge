import type { User } from "../../generated/prisma/client.ts";
import type { ColorTheme, Currency, Locale, Theme } from "./schemas.ts";

type MeSource = Pick<
  User,
  | "id"
  | "name"
  | "email"
  | "password"
  | "googleId"
  | "locale"
  | "theme"
  | "colorTheme"
  | "currency"
  | "savingsRate"
>;

/**
 * `locale`/`theme`/`colorTheme`/`currency` are plain DB columns (not
 * Postgres enums — see schema.prisma), validated against their Zod enums
 * only at write time (`PATCH /me`) — trusted here, not re-checked. Same
 * pattern as `categories/serialize.ts`'s `icon` cast.
 */
export function serializeMe(user: MeSource) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    locale: user.locale as Locale,
    theme: user.theme as Theme,
    colorTheme: user.colorTheme as ColorTheme,
    currency: user.currency as Currency,
    savingsRate: user.savingsRate,
    // Never serialize `password`/`googleId` themselves — only derived
    // booleans.
    hasPassword: user.password !== null,
    hasGoogleAccount: user.googleId !== null,
  };
}
