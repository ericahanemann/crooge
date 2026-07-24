"use client";

import { Menu } from "@base-ui/react/menu";
import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { key: "pink", label: "PINK", hex: "#f472b6" },
  { key: "violet", label: "VIOLET", hex: "#8b5cf6" },
  { key: "emerald", label: "EMERALD", hex: "#34d399" },
  { key: "amber", label: "AMBER", hex: "#fbbf24" },
  { key: "sky", label: "SKY", hex: "#38bdf8" },
] as const;

type ColorKey = (typeof COLOR_OPTIONS)[number]["key"];

export function ColorThemeToggle() {
  const [colorTheme, setColorTheme] = useState<ColorKey | null>(null);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-color-theme") as ColorKey) ??
      "pink";
    setColorTheme(current);
  }, []);

  if (!colorTheme) return <div className="size-8" />;

  function switchColor(key: ColorKey) {
    document.documentElement.setAttribute("data-color-theme", key);
    setColorTheme(key);
    // biome-ignore lint/suspicious/noDocumentCookie: cookie needed for SSR theme persistence
    document.cookie = `color-theme=${key};path=/;max-age=31536000;SameSite=Lax`;
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-colors outline-none cursor-pointer">
        <Palette size={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50"
        >
          <Menu.Popup className="min-w-30 bg-card border border-border rounded-md shadow-lg overflow-hidden">
            {COLOR_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.key}
                onClick={() => switchColor(opt.key)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-4 py-2.5 text-left font-karantina text-base tracking-wide transition-colors hover:bg-muted cursor-default outline-none",
                  opt.key === colorTheme
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: opt.hex }}
                />
                {opt.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
