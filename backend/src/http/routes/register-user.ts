import { hash } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";

const registerUserBodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8),
});

export async function registerUser(app: FastifyInstance) {
  app.post("/users", async (request, reply) => {
    const { name, email, password } = registerUserBodySchema.parse(
      request.body,
    );

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
  });
}
