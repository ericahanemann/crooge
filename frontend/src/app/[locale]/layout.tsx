import type { Metadata } from "next";
import { Karantina, Nunito_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../globals.css";
import { AppSidebar } from "@/components/sidebar";
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
