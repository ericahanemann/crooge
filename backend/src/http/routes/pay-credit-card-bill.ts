import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCycleForDate } from "../../lib/billing-cycle.ts";
import { getBillAmount } from "../../lib/credit-card-bill.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeCreditCardBill } from "../../lib/serialize-credit-card-bill.ts";

const paramsSchema = z.object({
  id: z.uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
const bodySchema = z.object({ amount: z.number().positive().optional() });

/**
 * Backs both "pay this month's bill" (`AddCardExpenseDialog`'s "pay" mode)
 * and "antecipar" (`AnteciparDialog` calls this once per selected future
 * bill). Keyed by `month` (the frontend's `CreditCardBill.month`, e.g.
 * `AnteciparDialog`'s `selected` set) rather than a DB id, since bills have
 * no id in the frontend's existing shape and `month` is already unique per card.
 */
export async function payCreditCardBill(app: FastifyInstance) {
  app.post(
    "/credit-cards/:id/bills/:month/pay",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id, month } = paramsSchema.parse(request.params);
      const { amount } = bodySchema.parse(request.body ?? {});

      const bill = await prisma.creditCardBill.findFirst({
        where: {
          cycleMonth: month,
          creditCardId: id,
          creditCard: { userId: request.user.sub },
        },
      });
      if (!bill) {
        return reply.status(404).send({ message: "bill not found" });
      }

      const paidAmount =
        amount ?? (await getBillAmount(bill.creditCardId, bill.closingDate));

      const updated = await prisma.creditCardBill.update({
        where: { id: bill.id },
        data: { paidAt: new Date(), paidAmount },
      });

      const card = await prisma.creditCard.findUniqueOrThrow({
        where: { id: updated.creditCardId },
      });
      const { cycleMonth: currentCycleMonth } = getCycleForDate(
        card.closingDay,
        card.dueDay,
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
