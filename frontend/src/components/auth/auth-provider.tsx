"use client";

import { useLocale } from "next-intl";
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
  updatePasswordAction,
  updateProfileAction,
} from "@/lib/auth-actions";
import {
  ApiError,
  type AuthUser,
  type ColorTheme,
  type Locale,
  type SignupCategory,
  type Theme,
  type UpdateProfileInput,
} from "@/lib/auth-api";
import { readCookie } from "@/lib/utils";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// keeps the httpOnly session cookies (`session.ts`) fresh well before the
// 15min access token expires, so Server Components reading them via
// `backendFetch` don't hit a stale token during a long-lived session
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (
    name: string,
    email: string,
    password: string,
    categories?: SignupCategory[],
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Partial profile/preference update — see `UpdateProfileInput`. Throws `ApiError` on failure. */
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  /** Always ends this device's own session on success — see `updatePasswordAction`. */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
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
  const locale = useLocale();

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
    return result.user;
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

      // Carry the visitor's deliberate, seconds-old choices up into the new
      // account rather than discarding them for the account's defaults —
      // the opposite direction of the "server wins" rule that applies once
      // an account already has stored preferences (see `signInAction`).
      // Best-effort: a failure here shouldn't surface as a signup failure.
      const theme = readCookie("theme") as Theme | null;
      const colorTheme = readCookie("color-theme") as ColorTheme | null;
      await updateProfileAction({
        // `routing.ts`'s `locales` is exactly ["en", "pt-BR"], so this is
        // never actually anything else — next-intl's `useLocale()` just
        // isn't typed narrower without a global `AppConfig` augmentation.
        locale: locale as Locale,
        ...(theme ? { theme } : {}),
        ...(colorTheme ? { colorTheme } : {}),
      }).catch(() => {});
    },
    [login, locale],
  );

  const logout = useCallback(async () => {
    await signOutAction();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const result = await updateProfileAction(input);
    if (!result.ok) throw new ApiError(result.status, result.message);
    setUser(result.user);
    return result.user;
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const result = await updatePasswordAction({
        currentPassword,
        newPassword,
      });
      if (!result.ok) throw new ApiError(result.status, result.message);
      setUser(null);
      setStatus("unauthenticated");
    },
    [],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [status, user, login, register, logout, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
