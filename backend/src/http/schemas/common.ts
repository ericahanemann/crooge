import { z } from "zod";

/** Shape of every non-2xx response body across the API (besides the 400 validation-error shape, which the global error handler documents separately — see `app.ts`). */
export const errorResponseSchema = z
  .object({
    message: z.string(),
    code: z
      .string()
      .optional()
      .describe(
        "Stable machine-readable error code, present only where a client needs to branch on *why* a request failed rather than just its status (e.g. `credit_limit_exceeded`) instead of on the status code alone, which can't disambiguate two different failures sharing one status.",
      ),
    requestId: z
      .string()
      .optional()
      .describe(
        "Only present on a 500 — pair it with this ID in Sentry (`tags.requestId`) to find the exact event behind a report.",
      ),
  })
  .describe("Error response.");

z.globalRegistry.add(errorResponseSchema, { id: "Error" });

/** "YYYY-MM" cycle/month key shared by every route that scopes data to a calendar month or billing cycle. */
export const MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthKeySchema = z
  .string()
  .regex(MONTH_KEY_REGEX)
  .describe('Month key in "YYYY-MM" format, e.g. "2026-08".');

export const monthQuerySchema = z.object({ month: monthKeySchema });

export const idParamSchema = z.object({
  id: z.uuid().describe("Resource ID (UUID)."),
});

export const idAndMonthParamSchema = z.object({
  id: z.uuid().describe("Credit card ID (UUID)."),
  month: monthKeySchema.describe(
    "Billing cycle key identifying one of the card's bills.",
  ),
});
