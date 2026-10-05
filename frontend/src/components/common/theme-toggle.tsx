"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/lib/auth-actions";

/**
 * sun/moon icon button that flips light/dark mode
 *
 * the server already sets the `dark` class on `<html>` from the `theme` cookie,
 * so this component doesn't own the source of truth
 *
 * it toggles the class + cookie and mirrors the current state into
 * local `isDark` just to pick the right icon
 *
 * `isDark` starts `null` (icon hidden) until the effect reads the class post-mount, avoiding a
 * server/client mismatch
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    const theme = next ? "dark" : "light";
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not yet widely supported
    document.cookie = `theme=${theme};path=/;max-age=31536000;SameSite=Lax`;
    // Account-scoped sync, best-effort — the toggle above is instant and
    // never waits on this; signed-out visitors just update the cookie, same
    // as before (the action no-ops without a session, see `updateProfileAction`).
    updateProfileAction({ theme }).catch(() => {});
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="cursor-pointer"
    >
      {isDark === null ? (
        <span className="size-4" />
      ) : isDark ? (
        <Sun size={16} />
      ) : (
        <Moon size={16} />
      )}
    </Button>
  );
}
