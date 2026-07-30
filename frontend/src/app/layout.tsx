import type { Metadata } from "next";
import { Karantina, Nunito_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";

const karantina = Karantina({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-karantina",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Crooge",
  description: "Get croogy. Control your finances.",
};

/**
 * outermost layout (above the `[locale]` segment) — the one place `<html>`/`<body>` are
 * rendered, so it's also where flash-free theme/color-theme/locale setup happens
 *
 * reads the `theme` and `color-theme` cookies and the
 * locale header set by proxy.ts, and applies the `dark` class / `data-color-theme`
 * attribute before the first paint — no client-side flash on load
 *
 * `suppressHydrationWarning` is needed because the toggles (`ThemeToggle`,
 * `ColorThemeToggle`) mutate these same attributes client-side
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = headerStore.get("X-NEXT-INTL-LOCALE") ?? "en";
  const theme = cookieStore.get("theme")?.value ?? "dark";
  const colorTheme = cookieStore.get("color-theme")?.value ?? "pink";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-color-theme={colorTheme}
      className={cn(
        "h-full antialiased",
        theme === "dark" && "dark",
        karantina.variable,
        nunitoSans.variable,
      )}
    >
      <body className="flex h-full bg-background" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
