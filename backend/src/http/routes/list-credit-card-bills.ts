import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCycleForDate } from "../../lib/billing-cycle.ts";
import { getBillAmount } from "../../lib/credit-card-bill.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeCreditCardBill } from "../../lib/serialize-credit-card-bill.ts";

const paramsSchema = z.object({ id: z.uuid() });

export async function listCreditCardBills(app: FastifyInstance) {
  app.get(
    "/credit-cards/:id/bills",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);

      const card = await prisma.creditCard.findFirst({
        where: { id, userId: request.user.sub },
      });
      if (!card) {
        return reply.status(404).send({ message: "credit card not found" });
      }

      const { cycleMonth: currentCycleMonth } = getCycleForDate(
        card.closingDay,
        card.dueDay,
        new Date(),
      );

      const bills = await prisma.creditCardBill.findMany({
        where: { creditCardId: card.id },
        orderBy: { cycleMonth: "asc" },
      });

      const serialized = await Promise.all(
        bills.map(async (bill) => {
          const amount = await getBillAmount(card.id, bill.closingDate);
          return serializeCreditCardBill(bill, amount, currentCycleMonth);
        }),
      );

      return reply.status(200).send(serialized);
    },
  );
}
