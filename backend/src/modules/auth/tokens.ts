import { createHash, randomBytes } from "node:crypto";

export function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

/** Refresh tokens are stored hashed (not raw), so a database leak alone doesn't hand out usable tokens. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
