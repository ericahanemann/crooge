import { OAuth2Client } from "google-auth-library";
import { env } from "../../env/index.ts";

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  /** Google's own profile picture URL, if the account has one — used to prefill `User.avatarUrl` on first link, never overwriting a value the user already set. */
  picture?: string;
}

export class InvalidGoogleTokenError extends Error {}

const client = new OAuth2Client();

/**
 * Verifies a Google Identity Services ID token server-side — this is the
 * one piece of the Google sign-in flow that must never be trusted from the
 * client. `verifyIdToken` checks the signature against Google's own
 * rotating public keys, plus `iss` and expiry; `audience` additionally
 * pins `aud` to *this* app's OAuth client, which is what stops an ID token
 * minted for a different Google app from being accepted here.
 *
 * No client secret is involved anywhere in this — verification only needs
 * Google's public keys and this app's (non-secret) client ID.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleProfile> {
  const payload = await client
    .verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })
    .then((ticket) => ticket.getPayload())
    .catch(() => {
      throw new InvalidGoogleTokenError("invalid Google ID token");
    });

  if (!payload?.sub || !payload.email) {
    throw new InvalidGoogleTokenError("Google ID token missing sub/email");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    // Google can return an unverified email on this claim; callers must
    // check this before trusting the email for lookup/creation/linking.
    emailVerified: payload.email_verified === true,
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
}
