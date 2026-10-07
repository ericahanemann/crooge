"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/auth-api";
import { resolveStarterCategories } from "@/lib/categories";
import { GoogleSignInButton } from "./google-sign-in-button";

/** sign-in form (email + password + "Sign in with Google" button); wired to `useAuth().login`/`loginWithGoogle` */
export function AuthSigninForm() {
  const t = useTranslations("auth.signin");
  // untranslated root translator — `resolveStarterCategories` needs the
  // full dotted `categories.expense.*`/`categories.income.*` keys. Only
  // used if a Google sign-in from *this* page turns out to create a new
  // account rather than signing into an existing one — see
  // `handleGoogleToken`.
  const tRoot = useTranslations();
  const currentLocale = useLocale();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // "Server wins": if the account's stored locale differs from whatever
  // locale this browser happened to land the signin page in, navigate
  // into the account's own locale rather than leaving it mismatched until
  // the next full reload. Shared by both the password and Google paths.
  function redirectToLocale(userLocale: string) {
    if (userLocale !== currentLocale) {
      router.push("/", { locale: userLocale });
    } else {
      router.push("/");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login(email, password);
      redirectToLocale(user.locale);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? t("errorInvalidCredentials")
          : t("errorGeneric"),
      );
      setSubmitting(false);
    }
  }

  async function handleGoogleToken(idToken: string) {
    setError(null);
    setSubmitting(true);

    try {
      // Also carries starter categories, in case this sign-in from the
      // signin page turns out to create a brand-new account rather than
      // signing into an existing one — "Sign in with Google" and "Sign up
      // with Google" are the same backend call either way.
      const user = await loginWithGoogle(
        idToken,
        resolveStarterCategories(tRoot),
      );
      redirectToLocale(user.locale);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("errorGoogleAccountExists")
          : t("errorGeneric"),
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="font-sans text-sm text-muted-foreground text-center">
        {t("intro")}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="email"
            className="font-sans text-sm text-muted-foreground uppercase font-normal"
          >
            {t("emailLabel")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="password"
            className="font-sans text-sm text-muted-foreground uppercase font-normal"
          >
            {t("passwordLabel")}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] mt-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="font-sans text-xs text-muted-foreground">
          {t("or")}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <GoogleSignInButton
        text="signin_with"
        onToken={handleGoogleToken}
        disabled={submitting}
      />

      <p className="font-sans text-sm text-center text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="text-foreground underline-offset-4 hover:underline hover:text-highlight transition-colors"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
