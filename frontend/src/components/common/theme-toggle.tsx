"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

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
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not yet widely supported
    document.cookie = `theme=${next ? "dark" : "light"};path=/;max-age=31536000;SameSite=Lax`;
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
