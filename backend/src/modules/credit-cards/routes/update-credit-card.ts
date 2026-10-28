import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../bill.ts";
import { datesForCycleMonth } from "../billing-cycle.ts";
import { creditCardSummaryResponseSchema } from "../schemas.ts";
import { serializeCreditCardSummary } from "../serialize.ts";
import {
  BRAND_TO_DB,
  createCreditCardBodySchema,
} from "./create-credit-card.ts";

/**
 * Updates a card's own fields (name/brand/limit/closing+due day). Unpaid
 * `CreditCardBill` rows have their stored `closingDate`/`dueDate` refreshed
 * to match the new schedule, so an already-displayed statement doesn't keep
 * showing stale dates — but they keep their existing `cycleMonth` key (which
 * transactions belong to which cycle isn't re-derived; only a known,
 * accepted limitation, not part of this fix). Paid bills are left alone —
 * they're historical record, not something an edit should rewrite.
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
        where: { id, userId: request.user.sub, archivedAt: null },
      });
      if (!existing) {
        return reply.status(404).send({ message: "credit card not found" });
      }

      // One update per unpaid bill, and every long installment purchase adds
      // a dozen future bills — against the remote prod database that can
      // outgrow Prisma's default 5s interactive-transaction timeout. Each
      // bill's dates differ, so this can't collapse into one updateMany.
      const card = await prisma.$transaction(
        async (tx) => {
          const updated = await tx.creditCard.update({
            where: { id },
            data: {
              name: body.name,
              brand: BRAND_TO_DB[body.brand],
              limit: body.limit,
              closingDay: body.closingDay,
              dueDay: body.dueDay,
            },
          });

          const unpaidBills = await tx.creditCardBill.findMany({
            where: { creditCardId: id, paidAt: null },
          });
          for (const bill of unpaidBills) {
            const { closingDate, dueDate } = datesForCycleMonth(
              updated.closingDay,
              updated.dueDay,
              bill.cycleMonth,
            );
            await tx.creditCardBill.update({
              where: { id: bill.id },
              data: { closingDate, dueDate },
            });
          }

          return updated;
        },
        { timeout: 30_000 },
      );

      const available = await getAvailableCredit(card);

      return reply
        .status(200)
        .send(serializeCreditCardSummary(card, available));
    },
  );
}
