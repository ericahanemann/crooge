import { z } from "zod";

/** Shape of every non-2xx response body across the API (besides the 400 validation-error shape, which the global error handler documents separately — see `app.ts`). */
export const errorResponseSchema = z
  .object({ message: z.string() })
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
