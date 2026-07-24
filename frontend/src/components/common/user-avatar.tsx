"use client";

import { Menu } from "@base-ui/react/menu";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface UserAvatarProps {
  name: string;
  initials: string;
  src?: string;
  compact?: boolean;
}

export function UserAvatar({ name, initials, src, compact = false }: UserAvatarProps) {
  const t = useTranslations("user");

  return (
    <Menu.Root>
      <Menu.Trigger
        className={
          compact
            ? "rounded-full cursor-pointer outline-none hover:ring-2 hover:ring-border transition-all"
            : "flex items-center gap-2.5 border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors outline-none cursor-pointer"
        }
      >
        <div className="relative size-8 rounded-full bg-highlight/15 flex items-center justify-center overflow-hidden shrink-0">
          {src ? (
            <Image src={src} alt={name} fill className="object-cover" />
          ) : (
            <span className="font-karantina text-xl leading-none text-highlight">
              {initials}
            </span>
          )}
        </div>
        {!compact && (
          <span className="font-karantina text-xl tracking-wide uppercase text-foreground">
            {name}
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-50">
          <Menu.Popup className="min-w-40 bg-card border border-border rounded-md shadow-lg overflow-hidden">
            <Menu.Item className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted cursor-default transition-colors outline-none">
              {t("profile")}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted cursor-default transition-colors outline-none">
              {t("signOut")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
