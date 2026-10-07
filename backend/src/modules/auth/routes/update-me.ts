import { verify } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  colorThemeSchema,
  currencySchema,
  localeSchema,
  meResponseSchema,
  savingsRateSchema,
  themeSchema,
} from "../schemas.ts";
import { serializeMe } from "../serialize.ts";

const updateMeBodySchema = z
  .object({
    name: z.string().trim().min(1).optional().describe("Full display name."),
    email: z
      .email()
      .trim()
      .toLowerCase()
      .optional()
      .describe("Must be unique across all users."),
    currentPassword: z
      .string()
      .optional()
      .describe(
        "Required when `email` is present and the account has a password — changing the account's identity is gated behind reauth, same reasoning as `PATCH /me/password`. Not required for a Google-only account with no password set (nothing to reauth against); see `hasPassword` on `GET /me`.",
      ),
    locale: localeSchema.optional(),
    theme: themeSchema.optional(),
    colorTheme: colorThemeSchema.optional(),
    currency: currencySchema
      .optional()
      .describe(
        "Display-only: changes formatting, never converts stored amounts.",
      ),
    savingsRate: savingsRateSchema
      .optional()
      .describe(
        "Whole percent (0-100) of income treated as savings rather than budget. 0 (default) leaves today's behavior (budget == income) unchanged.",
      ),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field is required",
  })
  .describe(
    "Partial update to the authenticated user's own profile — every field is optional, but at least one is required.",
  );

/**
 * Updates the authenticated user's profile and/or account-scoped
 * preferences. Password changes have their own endpoint
 * (`PATCH /me/password`) — see its docstring for why they aren't folded in
 * here.
 */
export async function updateMe(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Update the current user's profile",
        security: [{ bearerAuth: [] }],
        body: updateMeBodySchema,
        response: {
          200: meResponseSchema,
          401: errorResponseSchema.describe(
            "`email` was present but `currentPassword` didn't match.",
          ),
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "A user with this email already exists.",
          ),
          422: errorResponseSchema.describe(
            "`email` was present, the account has a password, and `currentPassword` was missing. Whether this applies depends on `hasPassword` (`GET /me`), not just on the request body, so it can't be a static schema check.",
          ),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { currentPassword, ...fields } = request.body;

      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        return reply.status(404).send({ message: "user not found" });
      }

      // Whether `currentPassword` is required depends on `existing.password`
      // (DB state, not just this request's body), so this can't be a static
      // Zod refine the way `updateMeBodySchema`'s "at least one field"
      // check is — see the 422 response's description.
      if (fields.email && existing.password) {
        if (!currentPassword) {
          return reply.status(422).send({
            message: "currentPassword is required to change email",
          });
        }

        // The caller is already authenticated (the access token proves
        // identity), so there's no email-enumeration question here — just
        // "did you type your own password right." No dummy-hash timing
        // trick needed, unlike sign-in.
        const passwordMatches = await verify(
          existing.password,
          currentPassword,
        );
        if (!passwordMatches) {
          return reply.status(401).send({ message: "incorrect password" });
        }
      }
      // else: no password on the account (Google-only) — nothing to
      // reauth against; the access token alone is sufficient, same trust
      // level as any other field here.

      try {
        const user = await prisma.user.update({
          where: { id: userId },
          data: fields,
        });

        return reply.status(200).send(serializeMe(user));
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return reply.status(409).send({ message: "e-mail already in use" });
        }

        throw error;
      }
    },
  );
}
