import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCycleForDate } from "../../lib/billing-cycle.ts";
import {
  billStatus,
  getAvailableCredit,
  getBillAmount,
} from "../../lib/credit-card-bill.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeCreditCardSummary } from "../../lib/serialize-credit-card.ts";

const paramsSchema = z.object({ id: z.uuid() });

export async function getCreditCard(app: FastifyInstance) {
  app.get(
    "/credit-cards/:id",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);

      const card = await prisma.creditCard.findFirst({
        where: { id, userId: request.user.sub },
      });
      if (!card) {
        return reply.status(404).send({ message: "credit card not found" });
      }

      const { cycleMonth, closingDate, dueDate } = getCycleForDate(
        card.closingDay,
        card.dueDay,
        new Date(),
      );

      const [currentBillRow, amount, available, upcomingBillsCount] =
        await Promise.all([
          prisma.creditCardBill.findUnique({
            where: {
              creditCardId_cycleMonth: { creditCardId: card.id, cycleMonth },
            },
          }),
          getBillAmount(card.id, closingDate),
          getAvailableCredit(card),
          prisma.creditCardBill.count({
            where: {
              creditCardId: card.id,
              cycleMonth: { gt: cycleMonth },
              paidAt: null,
            },
          }),
        ]);

      return reply.status(200).send({
        ...serializeCreditCardSummary(card, available),
        currentBill: {
          month: cycleMonth,
          amount,
          status: currentBillRow
            ? billStatus(currentBillRow, cycleMonth)
            : "current",
          closingDate: closingDate.toISOString().slice(0, 10),
          dueDate: dueDate.toISOString().slice(0, 10),
        },
        upcomingBillsCount,
      });
    },
  );
}
