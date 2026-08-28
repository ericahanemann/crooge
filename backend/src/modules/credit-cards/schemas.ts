import { z } from "zod";

export const creditCardBrandSchema = z.enum([
  "visa",
  "mastercard",
  "amex",
  "elo",
]);

export const creditCardSummaryResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    brand: creditCardBrandSchema,
    limit: z.number(),
    closingDay: z
      .number()
      .int()
      .describe("Day of month the billing cycle closes (1-28)."),
    dueDay: z
      .number()
      .int()
      .describe("Day of month the following month payment is due (1-28)."),
    available: z
      .number()
      .describe(
        "limit minus whatever's outstanding on the currently open billing cycle (0 once that cycle is paid off).",
      ),
    currentMonth: z
      .string()
      .describe('Cycle key ("YYYY-MM") of the currently open billing cycle.'),
  })
  .describe("A credit card, with its currently available credit.");

z.globalRegistry.add(creditCardSummaryResponseSchema, {
  id: "CreditCardSummary",
});

export const creditCardBillStatusSchema = z.enum(["paid", "current", "future"]);

/**
 * A billing cycle. `amount` is always computed from that cycle's
 * transactions rather than stored, so it can never drift out of sync — only
 * `status`/dates persist server-side (as a `CreditCardBill` row).
 */
export const creditCardBillResponseSchema = z
  .object({
    month: z.string().describe('Cycle key ("YYYY-MM").'),
    amount: z.number().describe("Sum of the cycle's transactions."),
    status: creditCardBillStatusSchema,
    closingDate: z.iso.date(),
    dueDate: z.iso.date(),
  })
  .describe("One billing cycle's statement.");

z.globalRegistry.add(creditCardBillResponseSchema, { id: "CreditCardBill" });

export const creditCardDetailResponseSchema = creditCardSummaryResponseSchema
  .extend({
    currentBill: creditCardBillResponseSchema,
    upcomingBillsCount: z
      .number()
      .int()
      .describe("Count of unpaid cycles after the current one."),
  })
  .describe("A credit card plus its currently open bill.");

z.globalRegistry.add(creditCardDetailResponseSchema, {
  id: "CreditCardDetail",
});

export const listCreditCardBillsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(12),
});

/** One page of a card's bills, most recent cycle first (mirrors `GET /transactions`' newest-first convention). */
export const creditCardBillsPageResponseSchema = z
  .object({
    items: z.array(creditCardBillResponseSchema),
    total: z.number().int().describe("Total bills the card has ever had."),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .describe("A page of a card's bills.");

z.globalRegistry.add(creditCardBillsPageResponseSchema, {
  id: "CreditCardBillsPage",
});
