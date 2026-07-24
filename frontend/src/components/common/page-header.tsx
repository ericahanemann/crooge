import { ColorThemeToggle } from "./color-theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { MobileMenuTrigger } from "./mobile-menu-trigger";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-7 py-7 border-b border-border shrink-0">
      {/* Mobile: title left, avatar + burger right */}
      <h1 className="font-karantina text-5xl tracking-wide text-foreground lg:hidden">
        {title}
      </h1>
      <div className="flex items-center gap-2 lg:hidden">
        <UserAvatar name="Érica" initials="EH" compact />
        <MobileMenuTrigger />
      </div>
      {/* Desktop: title left, icons right */}
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
