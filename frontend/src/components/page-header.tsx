import { ColorThemeToggle } from "./color-theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";

interface PageHeaderProps {
  title: string;
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
      <h1 className="font-karantina text-6xl tracking-wide text-foreground">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ColorThemeToggle />
        <ThemeToggle />
        <UserAvatar name="Érica" initials="EH" />
      </div>
    </div>
  );
}
