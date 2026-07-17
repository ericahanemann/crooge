import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AppSidebar } from "@/components/common/sidebar";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppSidebar />
      <main className="flex flex-col flex-1 overflow-hidden min-w-0">
        {children}
      </main>
    </NextIntlClientProvider>
  );
}
