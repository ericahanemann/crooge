"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  refreshSessionAction,
  signInAction,
  signOutAction,
  signUpAction,
} from "@/lib/auth-actions";
import { ApiError, type AuthUser, type SignupCategory } from "@/lib/auth-api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// keeps the httpOnly session cookies (`session.ts`) fresh well before the
// 15min access token expires, so Server Components reading them via
// `backendFetch` don't hit a stale token during a long-lived session
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    categories?: SignupCategory[],
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Tracks the signed-in user for client-side UI (`UserAvatar`, `AuthGate`).
 * The actual session lives in httpOnly cookies set by Server Actions
 * (`auth-actions.ts`) — this provider never holds a token, only calls those
 * actions and mirrors their result into React state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const result = await refreshSessionAction();
      if (cancelled) return;
      if (result.ok) {
        setUser(result.user);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(async () => {
      const result = await refreshSessionAction();
      if (result.ok) {
        setUser(result.user);
      } else {
        setStatus("unauthenticated");
        setUser(null);
      }
    }, SILENT_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signInAction(email, password);
    if (!result.ok) throw new ApiError(result.status, result.message);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      categories?: SignupCategory[],
    ) => {
      const result = await signUpAction(name, email, password, categories);
      if (!result.ok) throw new ApiError(result.status, result.message);
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await signOutAction();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
