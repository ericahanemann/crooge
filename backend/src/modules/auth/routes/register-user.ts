import { hash } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  categoryKindSchema,
  iconKeySchema,
  KIND_TO_DB,
} from "../../categories/schemas.ts";

const registerUserBodySchema = z.object({
  name: z.string().trim().min(1).describe("Full display name."),
  email: z
    .email()
    .trim()
    .toLowerCase()
    .describe("Must be unique across all users."),
  password: z
    .string()
    .min(8)
    .refine((value) => /\d/.test(value), {
      message: "must contain at least one number",
    })
    .refine((value) => /[^A-Za-z0-9]/.test(value), {
      message: "must contain at least one symbol",
    })
    .describe(
      "Minimum 8 characters, with at least one number and one symbol. Hashed with argon2 before storage.",
    ),
  categories: z
    .array(
      z.object({
        kind: categoryKindSchema,
        label: z.string().trim().min(1),
        icon: iconKeySchema,
        isFallback: z.boolean().optional(),
      }),
    )
    .optional()
    .describe(
      "Starter categories to seed for the new account, pre-localized by the caller — the backend has no translation content of its own.",
    ),
});

/**
 * Creates a new user account. Does not sign the user in — follow up with
 * `POST /sessions` to get an access/refresh token pair.
 */
export async function registerUser(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/users",
    {
      schema: {
        tags: ["auth"],
        summary: "Register a new user",
        body: registerUserBodySchema,
        response: {
          201: z.void().describe("User created."),
          409: errorResponseSchema.describe(
            "A user with this email already exists.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password, categories } = request.body;

      const passwordHash = await hash(password);

      let userId: string;
      try {
        const user = await prisma.user.create({
          data: { name, email, password: passwordHash },
        });
        userId = user.id;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return reply.status(409).send({ message: "e-mail already in use" });
        }

        throw error;
      }

      if (categories?.length) {
        await prisma.category.createMany({
          data: categories.map((c) => ({
            userId,
            kind: KIND_TO_DB[c.kind],
            label: c.label,
            icon: c.icon,
            isFallback: c.isFallback ?? false,
          })),
        });
      }

      return reply.status(201).send();
    },
  );
}
