import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureBill } from "../../lib/billing-cycle.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeCreditCardSummary } from "../../lib/serialize-credit-card.ts";

const createCreditCardBodySchema = z.object({
  name: z.string().trim().min(1),
  brand: z.enum(["visa", "mastercard", "amex", "elo"]),
  limit: z.number().positive(),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
});

const BRAND_TO_DB = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  amex: "AMEX",
  elo: "ELO",
} as const;

export async function createCreditCard(app: FastifyInstance) {
  app.post(
    "/credit-cards",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = createCreditCardBodySchema.parse(request.body);
      const userId = request.user.sub;

      const card = await prisma.creditCard.create({
        data: {
          userId,
          name: body.name,
          brand: BRAND_TO_DB[body.brand],
          limit: body.limit,
          closingDay: body.closingDay,
          dueDay: body.dueDay,
        },
      });

      // so a freshly created card already has a "current" bill to pay against
      await ensureBill(
        prisma,
        card.id,
        card.closingDay,
        card.dueDay,
        new Date(),
      );

      return reply
        .status(201)
        .send(serializeCreditCardSummary(card, Number(card.limit)));
    },
  );
}
