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
        "The id of one of the caller's categories (see GET /categories) — every category, seeded or user-created, is a real per-user row.",
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
    paymentMethod: z
      .enum(["debit_pix", "credit"])
      .optional()
      .describe("Expense only — absent for income."),
    creditCardId: z
      .uuid()
      .optional()
      .describe('Only present when paymentMethod is "credit".'),
    readOnly: z
      .boolean()
      .describe(
        "True for a row materialized from a credit card bill — it's a side effect of paying/the due date passing, not something the user filed directly, so PATCH/DELETE both 409 on it.",
      ),
  })
  .describe("A single transaction occurrence.");

z.globalRegistry.add(transactionResponseSchema, { id: "Transaction" });

/**
 * Partial update for `PATCH /transactions/:id`. What's actually accepted
 * depends on the target row, checked in the handler (not expressible at the
 * schema level since it depends on existing state):
 * - A one-time income or expense accepts every field here. `type`
 *   (income/expense) can never change — delete and recreate instead.
 * - An installment/recurring occurrence (any row with a series) only
 *   accepts `description`/`category` — sending `amount`/`date`/
 *   `paymentMethod`/`creditCardId` against one is a 409; changing those
 *   means deleting the series and creating a new one.
 * - A row materialized from a credit card bill (`creditCardBillId` set)
 *   can't be edited at all (409).
 */
export const updateTransactionBodySchema = z
  .object({
    description: z.string().trim().min(1).optional(),
    amount: z
      .number()
      .positive()
      .optional()
      .describe(
        "Always positive; sign stays implied by the transaction's existing type.",
      ),
    date: z.iso.date().optional(),
    category: z.string().trim().min(1).optional(),
    paymentMethod: z
      .enum(["debit_pix", "credit"])
      .optional()
      .describe(
        'Expense only. Switching to "credit" requires a resolvable creditCardId (this request\'s, or the one already on the row); switching to "debit_pix" clears creditCardId.',
      ),
    creditCardId: z
      .uuid()
      .optional()
      .describe(
        'Expense only. Only meaningful when paymentMethod is "credit".',
      ),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field is required",
  })
  .describe(
    "Partial update — every field is optional, but at least one is required.",
  );
