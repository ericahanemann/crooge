import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// RTL's auto-cleanup detects globally-injected test hooks; this project's
// tests import `afterEach` etc. from "vitest" explicitly instead (no
// `test.globals: true`), so it never self-registers — do it here instead.
afterEach(() => cleanup());

// jsdom doesn't implement matchMedia — next-themes' ThemeProvider calls it on
// mount to detect the system color scheme.
window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});
