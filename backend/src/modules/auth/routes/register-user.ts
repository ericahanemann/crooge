import { hash } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";

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
      const { name, email, password } = request.body;

      const passwordHash = await hash(password);

      try {
        await prisma.user.create({
          data: { name, email, password: passwordHash },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return reply.status(409).send({ message: "e-mail already in use" });
        }

        throw error;
      }

      return reply.status(201).send();
    },
  );
}
