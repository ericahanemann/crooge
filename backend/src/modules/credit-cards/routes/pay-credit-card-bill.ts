import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idAndMonthParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getBillAmount } from "../bill.ts";
import { getCycleForDate } from "../billing-cycle.ts";
import { materializeBillTransaction } from "../materialize-bill-transaction.ts";
import { creditCardBillResponseSchema } from "../schemas.ts";
import { serializeCreditCardBill } from "../serialize-bill.ts";

const bodySchema = z
  .object({
    amount: z
      .number()
      .positive()
      .optional()
      .describe(
        "Overrides the computed bill amount. Omit to pay exactly the computed amount — the common case.",
      ),
  })
  .default({});

/**
 * Marks one billing cycle as paid. Backs both "pay this month's bill"
 * (current cycle) and "antecipar" — paying a future cycle early, which the
 * frontend does by calling this once per selected future bill. Keyed by
 * `month` (the cycle key) rather than a bill ID, since bills have no ID in
 * the frontend's existing data shape and `month` is already unique per card.
 *
 * Also materializes (or, if the due date already auto-materialized it,
 * corrects the amount of) the read-only account-side Transaction this bill
 * turns into once it hits the balance — see `materialize-bill-transaction.ts`.
 */
export async function payCreditCardBill(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/credit-cards/:id/bills/:month/pay",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "Pay a bill",
        security: [{ bearerAuth: [] }],
        params: idAndMonthParamSchema,
        body: bodySchema,
        response: {
          200: creditCardBillResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id, month } = request.params;
      const { amount } = request.body;
      const userId = request.user.sub;

      const bill = await prisma.creditCardBill.findFirst({
        where: {
          cycleMonth: month,
          creditCardId: id,
          creditCard: { userId },
        },
        include: { creditCard: true },
      });
      if (!bill) {
        return reply.status(404).send({ message: "bill not found" });
      }

      const paidAmount =
        amount ?? (await getBillAmount(bill.creditCardId, bill.closingDate));

      const updated = await prisma.$transaction(async (tx) => {
        const updatedBill = await tx.creditCardBill.update({
          where: { id: bill.id },
          data: { paidAt: new Date(), paidAmount },
        });

        await materializeBillTransaction(tx, {
          userId,
          card: bill.creditCard,
          bill: updatedBill,
          amount: paidAmount,
          date: new Date(),
        });

        return updatedBill;
      });

      const { cycleMonth: currentCycleMonth } = getCycleForDate(
        bill.creditCard.closingDay,
        bill.creditCard.dueDay,
        new Date(),
      );
      const amountDue = await getBillAmount(
        updated.creditCardId,
        updated.closingDate,
      );

      return reply
        .status(200)
        .send(serializeCreditCardBill(updated, amountDue, currentCycleMonth));
    },
  );
}
