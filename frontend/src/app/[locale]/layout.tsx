import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Karantina, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../globals.css";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/sidebar";

const karantina = Karantina({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-karantina",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crooge",
  description: "Get croogy. Control your finances.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value ?? "dark";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        theme === "dark" && "dark",
        karantina.variable,
        nunitoSans.variable,
        geistMono.variable,
      )}
    >
      <body className="flex h-full bg-background">
        <NextIntlClientProvider messages={messages}>
          <AppSidebar />
          <main className="flex flex-col flex-1 overflow-hidden min-w-0">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
