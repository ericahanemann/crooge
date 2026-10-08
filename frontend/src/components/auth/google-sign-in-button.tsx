"use client";

import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "./google-icon";

// Minimal ambient types for the one surface of Google Identity Services
// this component uses — no `@types` package exists for GIS, and pulling
// in a whole wrapper library (e.g. `@react-oauth/google`) would assume it
// owns the session, which conflicts with this app's own `AuthProvider`/
// cookie-based session model (see DESIGN.md "Google Sign-In").
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              type: "standard";
              theme: "outline";
              size: "large";
              text: "signin_with" | "signup_with" | "continue_with";
              shape: "rectangular";
              width: number;
              locale: string;
            },
          ): void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  /** Which i18n label renders on the decorative button (see `LABEL_KEYS`) — the real GIS button underneath still gets the matching GIS `text` option for its own accessible name, it just isn't visible. */
  text: "signin_with" | "signup_with" | "continue_with";
  /** Called with the raw ID token on a successful Google sign-in — verification happens server-side; this component never trusts it itself. */
  onToken: (idToken: string) => void;
  disabled?: boolean;
}

const LABEL_KEYS = {
  signin_with: "signIn",
  signup_with: "signUp",
  continue_with: "continueWith",
} as const;

/**
 * Looks like this app's own secondary button — transparent background,
 * border, our own monochrome Google "G" icon + text — matching the look
 * this button had before Google Identity Services (GIS) was introduced.
 * The actual sign-in flow underneath is still 100% GIS, unchanged: a real
 * GIS button is rendered fully transparent and stacked exactly on top of
 * the decorative one below, so every click lands on Google's own button
 * and goes through the same ID-token issuance + server-side verification
 * as always — only the *paint* is custom.
 *
 * This is a deliberate, well-known deviation from Google's own branding
 * guideline (which asks for their rendered button to always be visible as-
 * is) — acceptable here since this is a personal app, not something
 * distributed at scale under Google's API terms. See DESIGN.md
 * "Google Sign-In".
 */
export function GoogleSignInButton({
  text,
  onToken,
  disabled = false,
}: GoogleSignInButtonProps) {
  const t = useTranslations("auth.google");
  const locale = useLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Not available in every environment (e.g. jsdom in component tests) —
    // fall back to a one-time measurement with no live resize tracking
    // rather than crashing.
    if (typeof ResizeObserver === "undefined") {
      setWidth(Math.round(wrapper.getBoundingClientRect().width));
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const google = window.google;
    if (!scriptLoaded || !google || width === null || !wrapperRef.current) {
      return;
    }

    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      callback: (response) => onToken(response.credential),
    });

    // GIS renders into whatever's in this node — clear it first so a
    // width change re-renders instead of stacking buttons.
    wrapperRef.current.innerHTML = "";
    google.accounts.id.renderButton(wrapperRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text,
      shape: "rectangular",
      width,
      locale,
    });
  }, [scriptLoaded, width, text, locale, onToken]);

  return (
    <div
      className={cn(
        "group relative w-full",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      {/* Decorative — purely visual, never itself receives the click (see
          the real GIS button below). `:hover`/`:active` still reach it via
          `group-*`, since CSS hover is geometric (tracks the pointer being
          within the ancestor's box), not tied to which element the browser
          considers the event target. */}
      <div
        aria-hidden="true"
        className="pointer-events-none flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-transparent py-4 font-karantina text-2xl leading-none tracking-wide text-foreground uppercase transition-colors group-hover:bg-muted"
      >
        <GoogleIcon />
        {t(LABEL_KEYS[text])}
      </div>
      {/*
       * The real Google Identity Services button, fully transparent and
       * stacked exactly on top of the decorative one above — clicks land
       * here, not on the decorative button, so the actual sign-in flow is
       * completely untouched; only the look is custom (see this
       * component's docstring).
       *
       * GIS doesn't render a single `<iframe>` straight into this div —
       * it wraps it in its own nested `<div>`s, each sized to a *fixed*
       * pixel box matching the requested `width`/`size`. Overriding only
       * the `<iframe>` itself left those intermediate divs at their
       * original (shorter) height, so the real clickable area stayed
       * pinned to GIS's own box while the decorative button below could
       * be taller — the mismatch the user saw as an uncovered strip along
       * the bottom. `[&_div]`/`[&_iframe]` force every nested div *and*
       * the iframe to stretch to 100% of their own parent, cascading all
       * the way down from this div (which does have a real height, via
       * `inset-0` against the `relative` wrapper above) to the iframe.
       */}
      <div
        ref={wrapperRef}
        className="absolute inset-0 overflow-hidden opacity-0 [&_div]:!h-full [&_div]:!w-full [&_iframe]:!h-full [&_iframe]:!w-full"
      />
    </div>
  );
}
