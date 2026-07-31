"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUser } from "@/lib/auth-api";
import { getMe, refreshSession, signIn, signOut, signUp } from "@/lib/auth-api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * holds the access token + current user in memory only (never persisted to
 * storage) and refreshes them silently on mount using the backend's httpOnly
 * refresh-token cookie. protected/guest routing is handled by `AuthGate`,
 * which reads `status` from this context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { accessToken: token } = await refreshSession();
        const me = await getMe(token);
        if (cancelled) return;
        setAccessToken(token);
        setUser(me);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        setStatus("unauthenticated");
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken: token } = await signIn({ email, password });
    const me = await getMe(token);
    setAccessToken(token);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await signUp({ name, email, password });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await signOut().catch(() => {});
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, accessToken, login, register, logout }),
    [status, user, accessToken, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
