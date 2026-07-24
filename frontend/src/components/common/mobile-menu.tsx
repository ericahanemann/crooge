"use client";

import Image from "next/image";
import { CalendarDays, CreditCard, LayoutDashboard, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ColorThemeToggle } from "./color-theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "./sidebar-context";

type AppPathname = keyof typeof routing.pathnames;

function MobileNavLink({
  href,
  label,
  icon,
  onClose,
}: {
  href: AppPathname;
  label: string;
  icon: React.ReactNode;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-4 px-3 py-4 rounded-lg font-karantina text-2xl tracking-wide uppercase transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

function MobileNavGroup({
  icon,
  label,
  links,
  onClose,
}: {
  icon: React.ReactNode;
  label: string;
  links: { href: AppPathname; label: string }[];
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isActive = links.some((l) => pathname === l.href);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-4 px-3 py-4 font-karantina text-2xl tracking-wide uppercase",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="shrink-0">{icon}</span>
        {label}
      </div>
      <div className="ml-9 border-l border-border pl-2 mb-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={cn(
              "flex items-center px-3 py-3 rounded-md font-karantina text-2xl tracking-wide uppercase transition-colors",
              pathname === link.href
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MobileMenu() {
  const { mobileOpen, closeMobile } = useSidebar();
  const t = useTranslations("nav");
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Slide animation: mount first, then slide in on next frame; slide out then unmount
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      setMounted(true);
      const timer = setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [mobileOpen]);

  // Focus close button once mounted and visible
  useEffect(() => {
    if (mobileOpen && mounted) {
      closeButtonRef.current?.focus();
    }
  }, [mobileOpen, mounted]);

  // Escape key + focus trap
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobile();
        return;
      }
      if (e.key !== "Tab" || !menuRef.current) return;
      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeMobile]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (!mounted) return null;

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("menuTitle")}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background lg:hidden transition-transform duration-300 ease-in-out",
        visible ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between px-7 py-7 border-b border-border shrink-0">
        <Image
          src="/logo.svg"
          alt="Crooge"
          width={120}
          height={40}
          priority
          className="invert dark:invert-0"
        />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeMobile}
          aria-label={t("closeMenu")}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-4 space-y-1">
        <MobileNavLink
          href="/"
          label={t("dashboard")}
          icon={<LayoutDashboard size={20} strokeWidth={1.5} />}
          onClose={closeMobile}
        />
        <MobileNavLink
          href="/monthly"
          label={t("monthly")}
          icon={<CalendarDays size={20} strokeWidth={1.5} />}
          onClose={closeMobile}
        />
        <MobileNavGroup
          icon={<CreditCard size={20} strokeWidth={1.5} />}
          label={t("creditCards")}
          links={[
            { href: "/credit-cards/current-bill", label: t("currentStatement") },
            { href: "/credit-cards/bills-summary", label: t("statementSummary") },
          ]}
          onClose={closeMobile}
        />
      </nav>

      <div className="flex items-center gap-3 px-7 py-5 border-t border-border">
        <LanguageToggle />
        <ColorThemeToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
