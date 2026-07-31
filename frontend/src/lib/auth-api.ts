const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
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

async function toApiError(response: Response) {
  const body = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    body?.message ?? "request failed",
    body?.issues,
  );
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

export async function refreshSession(): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_URL}/sessions/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

export async function signOut(): Promise<void> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok && response.status !== 401) throw await toApiError(response);
}

export async function getMe(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}
