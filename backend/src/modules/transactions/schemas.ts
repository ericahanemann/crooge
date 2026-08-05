import { z } from "zod";

export const transactionTimingSchema = z.enum([
  "oneTime",
  "installment",
  "recurring",
]);

/**
 * A single materialized transaction row. Installments and recurring series
 * are stored as one row per occurrence (sharing a hidden `groupId`, not
 * exposed in the API) rather than being projected virtually at read time —
 * see `backend/README.md` for why.
 */
export const transactionResponseSchema = z
  .object({
    id: z.uuid(),
    date: z.iso
      .date()
      .describe(
        "Local calendar date (YYYY-MM-DD), no time/timezone component.",
      ),
    category: z
      .string()
      .describe(
        "Free-text category key. Built-in keys are defined client-side; users may also type a custom one, which is stored verbatim.",
      ),
    description: z.string(),
    amount: z
      .number()
      .describe("Signed: positive for income, negative for expenses."),
    timing: transactionTimingSchema,
    installmentCurrent: z
      .number()
      .int()
      .optional()
      .describe(
        '1-based position within the installment series. Only present when timing is "installment".',
      ),
    installmentTotal: z
      .number()
      .int()
      .optional()
      .describe(
        'Total number of installments in the series. Only present when timing is "installment".',
      ),
  })
  .describe("A single transaction occurrence.");

z.globalRegistry.add(transactionResponseSchema, { id: "Transaction" });
