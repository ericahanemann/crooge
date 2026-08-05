import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../bill.ts";
import { creditCardSummaryResponseSchema } from "../schemas.ts";
import { serializeCreditCardSummary } from "../serialize.ts";

/** Lists the caller's credit cards, oldest first (matches creation order for the card picker). */
export async function listCreditCards(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/credit-cards",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "List credit cards",
        security: [{ bearerAuth: [] }],
        response: { 200: z.array(creditCardSummaryResponseSchema) },
      },
    },
    async (request, reply) => {
      const cards = await prisma.creditCard.findMany({
        where: { userId: request.user.sub },
        orderBy: { createdAt: "asc" },
      });

      const serialized = await Promise.all(
        cards.map(async (card) =>
          serializeCreditCardSummary(card, await getAvailableCredit(card)),
        ),
      );

      return reply.status(200).send(serialized);
    },
  );
}
