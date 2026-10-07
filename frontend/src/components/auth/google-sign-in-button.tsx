"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
              theme: "outline" | "filled_black";
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
  /** "signin_with"/"signup_with" render "Sign in/up with Google"; "continue_with" (used for the profile page's "connect Google" action, which is neither) renders the neutral "Continue with Google". Google's own button copy, not ours — see DESIGN.md: this button's label/styling isn't under this app's control. */
  text: "signin_with" | "signup_with" | "continue_with";
  /** Called with the raw ID token on a successful Google sign-in — verification happens server-side; this component never trusts it itself. */
  onToken: (idToken: string) => void;
  disabled?: boolean;
}

/**
 * Renders Google's own "Sign in with Google" button via Google Identity
 * Services — not a custom-styled button, deliberately: Google's brand
 * guidelines require using their rendered button rather than a bespoke
 * one, so this only customizes what GIS actually exposes (theme/size/
 * shape/text/locale), matching the active color theme and locale.
 *
 * The button is a GIS-managed iframe with a fixed pixel width, so a
 * `ResizeObserver` on the wrapping div keeps it in sync with the
 * available width instead of the `w-full` the rest of this app's buttons
 * use — GIS has no percentage-width option.
 */
export function GoogleSignInButton({
  text,
  onToken,
  disabled = false,
}: GoogleSignInButtonProps) {
  const locale = useLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isDark, setIsDark] = useState<boolean | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

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
    if (
      !scriptLoaded ||
      !google ||
      isDark === null ||
      width === null ||
      !wrapperRef.current
    ) {
      return;
    }

    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      callback: (response) => onToken(response.credential),
    });

    // GIS renders into whatever's in this node — clear it first so a
    // theme/width change re-renders instead of stacking buttons.
    wrapperRef.current.innerHTML = "";
    google.accounts.id.renderButton(wrapperRef.current, {
      type: "standard",
      theme: isDark ? "filled_black" : "outline",
      size: "large",
      text,
      shape: "rectangular",
      width,
      locale,
    });
  }, [scriptLoaded, isDark, width, text, locale, onToken]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div
        ref={wrapperRef}
        className={cn(
          "flex w-full justify-center",
          disabled && "pointer-events-none opacity-60",
        )}
      />
    </>
  );
}
