import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * wraps every page under `[locale]` (both the `(app)` and `(auth)` groups) in
 * `NextIntlClientProvider`, making `useTranslations()` available to client components
 *
 * server components instead call `getTranslations()` directly and don't need this provider
 */
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
      {children}
    </NextIntlClientProvider>
  );
}
