import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.ts";
import { ensureBill } from "../billing-cycle.ts";
import {
  creditCardBrandSchema,
  creditCardSummaryResponseSchema,
} from "../schemas.ts";
import { serializeCreditCardSummary } from "../serialize.ts";

export const createCreditCardBodySchema = z.object({
  name: z.string().trim().min(1),
  brand: creditCardBrandSchema,
  limit: z.number().positive(),
  closingDay: z
    .number()
    .int()
    .min(1)
    .max(28)
    .describe(
      "Day of month the billing cycle closes (1-28, to stay valid across every month).",
    ),
  dueDay: z
    .number()
    .int()
    .min(1)
    .max(28)
    .describe("Day of month the following month payment is due (1-28)."),
});

export const BRAND_TO_DB = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  amex: "AMEX",
  elo: "ELO",
} as const;

/**
 * Creates a credit card and ensures it has a `CreditCardBill` row for
 * today's cycle so there's immediately something to pay against. Note:
 * there's no "add a card" UI in the frontend yet — this endpoint exists so
 * the feature is reachable, but is currently only exercisable directly.
 */
export async function createCreditCard(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/credit-cards",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "Create a credit card",
        security: [{ bearerAuth: [] }],
        body: createCreditCardBodySchema,
        response: { 201: creditCardSummaryResponseSchema },
      },
    },
    async (request, reply) => {
      const body = request.body;
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
