"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/auth-api";
import { GoogleIcon } from "./google-icon";

/** sign-up form (name + email + password + google button); wired to `useAuth().register`, no google handler yet */
export function AuthSignupForm() {
  const t = useTranslations("auth.signup");
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(name, email, password);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("errorEmailTaken")
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
            htmlFor="name"
            className="font-sans text-sm text-muted-foreground uppercase font-normal"
          >
            {t("nameLabel")}
          </Label>
          <Input
            id="name"
            type="text"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            disabled={submitting}
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
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

      <button
        type="button"
        className="w-full py-4 rounded-lg border border-border bg-transparent text-foreground font-karantina text-2xl leading-none tracking-wide uppercase hover:bg-muted transition-colors flex items-center justify-center gap-3 cursor-pointer"
      >
        <GoogleIcon />
        {t("google")}
      </button>

      <p className="font-sans text-sm text-center text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/signin"
          className="text-foreground underline-offset-4 hover:underline hover:text-highlight transition-colors"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
