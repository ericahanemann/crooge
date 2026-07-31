"use client";

import { Menu } from "@base-ui/react/menu";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";
import { getInitials } from "@/lib/utils";

/** @prop compact - icon-only mode (no name label) used in the mobile `PageHeader`, default false. */
interface UserAvatarProps {
  compact?: boolean;
}

/**
 * avatar chip with a dropdown menu — reads the signed-in user from `useAuth()`
 * (only rendered inside the `(app)` group, which `AuthGate` already guarantees
 * is authenticated) and wires "Sign out" to the auth context's `logout()`
 */
export function UserAvatar({ compact = false }: UserAvatarProps) {
  const t = useTranslations("user");
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = getInitials(user.name);
  const firstName = user.name.split(" ")[0];

  async function handleSignOut() {
    await logout();
    router.push("/signin");
  }

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
          <span className="font-karantina text-xl leading-none text-highlight">
            {initials}
          </span>
        </div>
        {!compact && (
          <span className="font-karantina text-xl tracking-wide uppercase text-foreground">
            {firstName}
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50"
        >
          <Menu.Popup className="min-w-40 bg-card border border-border rounded-md shadow-lg overflow-hidden">
            <Menu.Item className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted cursor-default transition-colors outline-none">
              {t("profile")}
            </Menu.Item>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              onClick={handleSignOut}
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted cursor-default transition-colors outline-none"
            >
              {t("signOut")}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
