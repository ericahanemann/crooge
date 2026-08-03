import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAccessToken } from "./session";

async function redirectToSignin(): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: "/signin", locale });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class BackendError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;

  constructor(
    status: number,
    message: string,
    issues?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

/**
 * Authenticated fetch for Server Components and Server Actions: reads the
 * `access_token` httpOnly cookie (`session.ts`) and attaches it as a Bearer
 * token. Redirects to `/signin` if there's no token or the backend rejects
 * it — the access token is short-lived (15min) and only refreshed by
 * `AuthProvider`'s periodic client-side timer, so a stale cookie here means
 * the session has genuinely gone cold (long inactivity) and re-auth is the
 * right call, same as `AuthGate`'s client-side redirect.
 */
export async function backendFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) await redirectToSignin();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 401) await redirectToSignin();

  return response;
}

async function toBackendError(response: Response) {
  const body = await response.json().catch(() => null);
  return new BackendError(
    response.status,
    body?.message ?? "request failed",
    body?.issues,
  );
}

/** Same as `backendFetch`, but throws `BackendError` on a non-2xx response and parses the JSON body. */
export async function backendFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await backendFetch(path, init);
  if (!response.ok) throw await toBackendError(response);
  return response.json();
}
