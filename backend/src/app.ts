import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastify, { type FastifyError } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "./env/index.ts";
import { authenticate } from "./http/hooks/authenticate.ts";
import { authenticateSession } from "./modules/auth/routes/authenticate-session.ts";
import { getMe } from "./modules/auth/routes/get-me.ts";
import { logout } from "./modules/auth/routes/logout.ts";
import { refreshSession } from "./modules/auth/routes/refresh-session.ts";
import { registerUser } from "./modules/auth/routes/register-user.ts";
import { createCategory } from "./modules/categories/routes/create-category.ts";
import { deleteCategory } from "./modules/categories/routes/delete-category.ts";
import { listCategories } from "./modules/categories/routes/list-categories.ts";
import { updateCategory } from "./modules/categories/routes/update-category.ts";
import { createCreditCard } from "./modules/credit-cards/routes/create-credit-card.ts";
import { getCreditCard } from "./modules/credit-cards/routes/get-credit-card.ts";
import { listCreditCardBills } from "./modules/credit-cards/routes/list-credit-card-bills.ts";
import { listCreditCardTransactions } from "./modules/credit-cards/routes/list-credit-card-transactions.ts";
import { listCreditCards } from "./modules/credit-cards/routes/list-credit-cards.ts";
import { payCreditCardBill } from "./modules/credit-cards/routes/pay-credit-card-bill.ts";
import { updateCreditCard } from "./modules/credit-cards/routes/update-credit-card.ts";
import { createTransaction } from "./modules/transactions/routes/create-transaction.ts";
import { getTransactionsSummary } from "./modules/transactions/routes/get-transactions-summary.ts";
import { listTransactions } from "./modules/transactions/routes/list-transactions.ts";

export const app = fastify();

app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
app.register(cookie);
app.register(jwt, { secret: env.JWT_SECRET });

app.decorate("authenticate", authenticate);

// Every route's `schema.body`/`querystring`/`params`/`response` is a zod
// object: these two compilers make Fastify validate requests and serialize
// responses straight from those schemas (no more manual `.parse()` calls in
// handlers), and `jsonSchemaTransform` below feeds the same schemas to
// @fastify/swagger to generate the OpenAPI document — one definition, used
// for validation, serialization, and docs.
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(swagger, {
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "Crooge API",
      description:
        "Backend for Crooge, a personal finance tracker (monthly income/expenses + credit card bills). " +
        "Every endpoint below `/me` and `/sessions*` requires a bearer access token, obtained from " +
        "`POST /sessions` and renewed via `POST /sessions/refresh`. " +
        "Requests that fail body/query/param validation return `400` with `{ message, issues }`, where " +
        "`issues` maps each invalid field path to its error messages; malformed requests Fastify rejects " +
        "before validation (e.g. an empty body with a `Content-Type: application/json` header) return their " +
        "own 4xx with `{ message }`. Neither shape is repeated on every endpoint below since both are the " +
        "same everywhere.",
      version: "0.1.0",
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: "Local" }],
    tags: [
      {
        name: "auth",
        description: "Registration, sign-in, session refresh/logout.",
      },
      {
        name: "transactions",
        description: "Income/expense transactions and the monthly summary.",
      },
      {
        name: "credit-cards",
        description: "Credit cards and their billing cycles.",
      },
      {
        name: "categories",
        description:
          "User-defined custom categories, on top of the built-in ones.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            'Access token from `POST /sessions` — send as "Authorization: Bearer <token>".',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject,
});

app.register(swaggerUi, { routePrefix: "/docs" });

app.register(registerUser);
app.register(authenticateSession);
app.register(refreshSession);
app.register(logout);
app.register(getMe);
app.register(createTransaction);
app.register(listTransactions);
app.register(getTransactionsSummary);
app.register(createCreditCard);
app.register(updateCreditCard);
app.register(listCreditCards);
app.register(getCreditCard);
app.register(listCreditCardBills);
app.register(listCreditCardTransactions);
app.register(payCreditCardBill);
app.register(listCategories);
app.register(createCategory);
app.register(updateCategory);
app.register(deleteCategory);

app.setErrorHandler<FastifyError>((error, _request, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const issues: Record<string, string[]> = {};
    for (const issue of error.validation) {
      const path =
        issue.instancePath.replace(/^\//, "").replaceAll("/", ".") || "body";
      if (!issues[path]) issues[path] = [];
      issues[path].push(issue.message ?? "invalid");
    }

    return reply.status(400).send({ message: "validation error", issues });
  }

  if (isResponseSerializationError(error)) {
    // A route's handler returned data that doesn't match its own declared
    // response schema — a bug in the route, not a client error.
    app.log.error(error);
    return reply.status(500).send({ message: "internal server error" });
  }

  // Fastify's own request-parsing errors (malformed/empty JSON body,
  // payload too large, unsupported content-type, ...) carry a real 4xx
  // `statusCode` and a client-safe `message` — surface those as-is instead
  // of masking them as a 500.
  if (error.statusCode !== undefined && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  app.log.error(error);

  return reply.status(500).send({ message: "internal server error" });
});
