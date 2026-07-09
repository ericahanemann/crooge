import { ThemeToggle } from "./theme-toggle"
import { UserAvatar } from "./user-avatar"

interface PageHeaderProps {
  title: string
}

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
      <h1 className="font-karantina text-5xl tracking-wide text-foreground">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserAvatar name="Érica" initials="EH" />
      </div>
    </div>
  )
}
