# Host-agnostic production image — works unchanged on Render/Railway/Fly/a
# plain VM, anything that can run a container. Node 24 runs this project's
# TypeScript directly (native type-stripping, see package.json's scripts —
# there's no separate tsc/bundler build step), so this only needs deps
# installed and the Prisma client generated before `node src/server.ts`.
#
# Debian-based (`-slim`, not `-alpine`): Prisma's query engine binary has a
# history of extra friction on musl libc: avoids that class of issue
# entirely rather than chasing it later.
FROM node:24-slim

# Prisma's query engine needs libssl to introspect at install time —
# without it, `prisma generate` guesses a version ("openssl-1.1.x") and
# warns rather than erroring, which is worse than failing loudly: a wrong
# guess here is a runtime crash later, on whichever request first touches
# the database.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Separate layer from the app source so `npm ci` only reruns when
# package*.json actually change, not on every source edit. `--ignore-scripts`
# because the real `prisma generate` below needs `prisma/schema.prisma`,
# which isn't copied in yet at this point — the `postinstall` script would
# otherwise fail here for the same reason `npm ci` failed outright before
# this comment existed.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3333

# Migrations run on every boot here, which is only safe because this is
# pinned to Render's free web service plan specifically: it's hard-capped
# at exactly one running instance (no autoscaling, no paid-tier "pre-deploy
# command" to run this once before traffic shifts over — that's a paid-plan
# feature). `prisma migrate deploy` is idempotent (skips already-applied
# migrations), and one instance can never race itself. If this ever moves
# to a host/plan that runs more than one instance at a time, move this back
# out into that host's own release/pre-deploy step instead — concurrent
# instances booting at once *would* race each other here.
CMD ["sh", "-c", "npx prisma migrate deploy && node --env-file-if-exists=.env src/server.ts"]
