import type { FastifyInstance } from "fastify";
import { getAvailableCredit } from "../../lib/credit-card-bill.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeCreditCardSummary } from "../../lib/serialize-credit-card.ts";

export async function listCreditCards(app: FastifyInstance) {
  app.get(
    "/credit-cards",
    { onRequest: [app.authenticate] },
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
