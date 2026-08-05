import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { billStatus, getAvailableCredit, getBillAmount } from "../bill.ts";
import { getCycleForDate } from "../billing-cycle.ts";
import { creditCardDetailResponseSchema } from "../schemas.ts";
import { serializeCreditCardSummary } from "../serialize.ts";

/** A single card's detail: summary fields plus its currently open bill and how many unpaid future bills exist. */
export async function getCreditCard(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/credit-cards/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "Get a credit card",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          200: creditCardDetailResponseSchema,
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
