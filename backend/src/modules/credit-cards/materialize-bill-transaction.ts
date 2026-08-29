import type {
  CreditCard,
  CreditCardBill,
  Prisma,
} from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { getBillAmount } from "./bill.ts";

/**
 * Backend-managed, per-user, non-deletable expense category every
 * materialized bill transaction is filed under (`Category.isSystem`).
 * Lazily find-or-created rather than seeded at signup, since creation
 * happens from routes with no locale context — the label is always
 * English. Known limitation (same tradeoff already accepted for seeded
 * categories that don't retranslate after signup, see `DESIGN.md`).
 */
const CREDIT_CARD_BILL_CATEGORY_LABEL = "Credit Card Bill";
const CREDIT_CARD_BILL_CATEGORY_ICON = "banknote";

export async function ensureCreditCardBillCategory(
  client: Prisma.TransactionClient,
  userId: string,
): Promise<string> {
  const category = await client.category.upsert({
    where: {
      userId_kind_label: {
        userId,
        kind: "EXPENSE",
        label: CREDIT_CARD_BILL_CATEGORY_LABEL,
      },
    },
    update: {},
    create: {
      userId,
      kind: "EXPENSE",
      label: CREDIT_CARD_BILL_CATEGORY_LABEL,
      icon: CREDIT_CARD_BILL_CATEGORY_ICON,
      isSystem: true,
    },
  });

  return category.id;
}

/**
 * Creates (or, if one already exists for this bill, updates the amount of)
 * the read-only account-side Transaction representing this bill hitting the
 * balance — no `creditCardId`, linked back via `creditCardBillId` so it
 * only ever materializes once per bill (enforced by that column's unique
 * constraint; `upsert` makes this safe to call repeatedly).
 *
 * `date` only applies on first creation — once materialized, later calls
 * (e.g. paying a bill that was already auto-materialized at its due date)
 * only correct the `amount`, never move the date. This keeps the semantics
 * consistent: the money is presumed to have left the account on whichever
 * happened first, the due date or an explicit early payment, and that
 * moment doesn't change if the bill is later paid or re-paid.
 */
export async function materializeBillTransaction(
  client: Prisma.TransactionClient,
  params: {
    userId: string;
    card: Pick<CreditCard, "name">;
    bill: Pick<CreditCardBill, "id">;
    amount: number;
    date: Date;
  },
): Promise<void> {
  const { userId, card, bill, amount, date } = params;
  const categoryId = await ensureCreditCardBillCategory(client, userId);

  await client.transaction.upsert({
    where: { creditCardBillId: bill.id },
    update: { amount },
    create: {
      userId,
      type: "EXPENSE",
      category: categoryId,
      description: `${card.name} bill`,
      amount,
      date,
      timing: "ONE_TIME",
      creditCardBillId: bill.id,
    },
  });
}

/**
 * Lazy catch-up for bills nobody explicitly paid: finds every bill across
 * the caller's cards whose due date has passed with no linked transaction
 * yet, and materializes each one dated at its real due date — not "now" —
 * so this is correct no matter how many days pass between the user's
 * visits. No cron/scheduled-job infra exists in this backend, so this runs
 * inline at the top of the read endpoints whose response depends on it
 * (`GET /transactions`, `GET /transactions/summary`) instead, the same
 * "compute on next read" pattern already used for recurring transactions
 * (see `transactions/generate-occurrences.ts`).
 */
export async function materializeOverdueBills(
  userId: string,
  now = new Date(),
): Promise<void> {
  const overdueBills = await prisma.creditCardBill.findMany({
    where: {
      creditCard: { userId },
      paidAt: null,
      dueDate: { lte: now },
      transaction: null,
    },
    include: { creditCard: true },
  });

  for (const bill of overdueBills) {
    const amount = await getBillAmount(bill.creditCardId, bill.closingDate);
    await materializeBillTransaction(prisma, {
      userId,
      card: bill.creditCard,
      bill,
      amount,
      date: bill.dueDate,
    });
  }
}
