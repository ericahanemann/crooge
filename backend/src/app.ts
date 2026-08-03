import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify from "fastify";
import { z } from "zod";
import { env } from "./env/index.ts";
import { authenticate } from "./http/hooks/authenticate.ts";
import { authenticateSession } from "./http/routes/authenticate-session.ts";
import { createCreditCard } from "./http/routes/create-credit-card.ts";
import { createTransaction } from "./http/routes/create-transaction.ts";
import { getCreditCard } from "./http/routes/get-credit-card.ts";
import { getMe } from "./http/routes/get-me.ts";
import { getTransactionsSummary } from "./http/routes/get-transactions-summary.ts";
import { listCreditCardBills } from "./http/routes/list-credit-card-bills.ts";
import { listCreditCardTransactions } from "./http/routes/list-credit-card-transactions.ts";
import { listCreditCards } from "./http/routes/list-credit-cards.ts";
import { listTransactions } from "./http/routes/list-transactions.ts";
import { logout } from "./http/routes/logout.ts";
import { payCreditCardBill } from "./http/routes/pay-credit-card-bill.ts";
import { refreshSession } from "./http/routes/refresh-session.ts";
import { registerUser } from "./http/routes/register-user.ts";

export const app = fastify();

app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
app.register(cookie);
app.register(jwt, { secret: env.JWT_SECRET });

app.decorate("authenticate", authenticate);

app.register(registerUser);
app.register(authenticateSession);
app.register(refreshSession);
app.register(logout);
app.register(getMe);
app.register(createTransaction);
app.register(listTransactions);
app.register(getTransactionsSummary);
app.register(createCreditCard);
app.register(listCreditCards);
app.register(getCreditCard);
app.register(listCreditCardBills);
app.register(listCreditCardTransactions);
app.register(payCreditCardBill);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      message: "validation error",
      issues: z.flattenError(error).fieldErrors,
    });
  }

  app.log.error(error);

  return reply.status(500).send({ message: "internal server error" });
});
