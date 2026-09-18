import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../bill.ts";

/**
 * Archives a card (soft-delete via `archivedAt`) rather than hard-deleting
 * it — its transactions and bills stay intact for history. Blocked (409)
 * while the currently open cycle has an unpaid balance, so debt can't be
 * hidden from the card picker by archiving it away; the account summary
 * still counts it either way once it materializes at its due date.
 *
 * Already-archived cards stay reachable via `GET /credit-cards/:id` for
 * historical viewing — only `GET /credit-cards` (the picker list) hides
 * them.
 *
 * Re-archiving an already-archived card is a no-op (`204`), not a `404` —
 * archiving is idempotent from the caller's point of view.
 */
export async function deleteCreditCard(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/credit-cards/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "Archive a credit card",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          204: z.void().describe("Archived."),
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "The currently open billing cycle has an unpaid balance.",
          ),
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
      if (card.archivedAt) {
        return reply.status(204).send();
      }

      const available = await getAvailableCredit(card);
      if (available < Number(card.limit)) {
        return reply
          .status(409)
          .send({ message: "can't archive a card with an unpaid balance" });
      }

      await prisma.creditCard.update({
        where: { id },
        data: { archivedAt: new Date() },
      });

      return reply.status(204).send();
    },
  );
}
