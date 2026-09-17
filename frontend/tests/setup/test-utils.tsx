import { type RenderOptions, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import type { ReactElement } from "react";
import messages from "../../src/i18n/messages/en.json" with { type: "json" };

/** Real components render inside next-intl/next-themes providers — test them the same way. */
function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ThemeProvider attribute="class">{ui}</ThemeProvider>
    </NextIntlClientProvider>,
    options,
  );
}

export * from "@testing-library/react";
export { renderWithProviders as render };
