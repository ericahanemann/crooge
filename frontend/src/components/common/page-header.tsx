import { ColorThemeToggle } from "./color-theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { MobileMenuTrigger } from "./mobile-menu-trigger";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";

/** @prop title - already-translated page title, rendered in karantina uppercase. */
interface PageHeaderProps {
  title: string;
}

/**
 * top bar rendered on every app page
 *
 * renders two parallel layouts rather than one responsive layout, since the mobile
 * version needs the burger trigger + compact avatar where desktop shows the
 * full icon row (language/theme/color toggles)
 *
 * both are always in the DOM; tailwind's `lg:hidden`/`hidden lg:flex` pair toggles
 * which one is visible
 */
export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-7 py-7 border-b border-border shrink-0">
      {/* mobile: title left, avatar + burger right */}
      <h1 className="font-karantina text-4xl sm:text-5xl tracking-wide text-foreground lg:hidden">
        {title}
      </h1>
      <div className="flex items-center gap-2 lg:hidden">
        <UserAvatar name="Érica" initials="EH" compact />
        <MobileMenuTrigger />
      </div>
      {/* desktop: title left, icons right */}
      <h1 className="hidden lg:block font-karantina text-5xl tracking-wide text-foreground">
        {title}
      </h1>
      <div className="hidden lg:flex items-center gap-2">
        <LanguageToggle />
        <ColorThemeToggle />
        <ThemeToggle />
        <UserAvatar name="Érica" initials="EH" />
      </div>
    </div>
  );
}
