"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * @property collapsed - desktop sidebar width state, persisted to `localStorage`.
 * @property mobileOpen - whether the full-screen `MobileMenu` overlay is open (separate from `collapsed`, mobile has no collapse state).
 */
interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
});

/**
 * provides sidebar collapse + mobile-menu-open state to the whole app layout
 *
 * mounted once in the `(app)` layout, above both `AppSidebar` and `MobileMenu`.
 *
 * `collapsed` starts `false` on every render (server and first client paint)
 * and is synced from `localStorage` in an effect after mount, rather than
 * read eagerly — avoids a server/client hydration mismatch, at the cost of a
 * brief expanded-then-collapsed flash for returning users who collapsed it.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggle, mobileOpen, openMobile, closeMobile }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
