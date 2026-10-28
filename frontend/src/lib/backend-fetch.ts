import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getAccessToken } from "./session";

async function redirectToSignin(): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: "/signin", locale });
}

// `/api/v1` — the backend's whole business-route surface lives under that
// prefix (see `backend/src/http/api-prefix.ts`); `/health`/`/docs` are the
// only backend routes outside it, and nothing here ever calls those.
const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/v1`;

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

  // Callers collapse a 5xx into a generic "unknown" result for the UI, so
  // this is the one place the backend's requestId (the tag its Sentry event
  // carries) is still visible — log it to the server logs for correlation.
  if (response.status >= 500) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    console.error(
      `backend ${init?.method ?? "GET"} ${path} failed with ${response.status}` +
        (body?.requestId ? ` (Sentry: requestId:${body.requestId})` : ""),
    );
  }

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
