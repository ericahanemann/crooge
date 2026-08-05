import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getBillAmount } from "../bill.ts";
import { getCycleForDate } from "../billing-cycle.ts";
import { creditCardBillResponseSchema } from "../schemas.ts";
import { serializeCreditCardBill } from "../serialize-bill.ts";

/** All billing cycles the card has ever had a row for (past, current, and any future ones already touched by a transaction or an early payment), oldest first. */
export async function listCreditCardBills(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/credit-cards/:id/bills",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "List a card's bills",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: z.array(creditCardBillResponseSchema),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

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
