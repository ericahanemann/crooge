import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../bill.ts";
import { creditCardSummaryResponseSchema } from "../schemas.ts";
import { serializeCreditCardSummary } from "../serialize.ts";
import {
  BRAND_TO_DB,
  createCreditCardBodySchema,
} from "./create-credit-card.ts";

/**
 * Updates a card's own fields (name/brand/limit/closing+due day). Existing
 * `CreditCardBill` rows aren't re-keyed if closing/due day change — a
 * schedule edit only affects cycles computed after the change, same
 * known-limit tradeoff as everywhere else the cycle math isn't backfilled.
 */
export async function updateCreditCard(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/credit-cards/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "Update a credit card",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: createCreditCardBodySchema,
        response: {
          200: creditCardSummaryResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;

      const existing = await prisma.creditCard.findFirst({
        where: { id, userId: request.user.sub },
      });
      if (!existing) {
        return reply.status(404).send({ message: "credit card not found" });
      }

      const card = await prisma.creditCard.update({
        where: { id },
        data: {
          name: body.name,
          brand: BRAND_TO_DB[body.brand],
          limit: body.limit,
          closingDay: body.closingDay,
          dueDay: body.dueDay,
        },
      });

      const available = await getAvailableCredit(card);

      return reply
        .status(200)
        .send(serializeCreditCardSummary(card, available));
    },
  );
}
