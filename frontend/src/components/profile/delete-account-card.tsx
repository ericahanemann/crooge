"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/auth-api";

/**
 * Own card, not folded into `ProfileCard` — this is the one irreversible
 * action on the whole page, and `ConfirmDialog` already owns the "are you
 * sure" + error-inline cycle every other destructive action here uses
 * (delete transaction, archive credit card). The reauth password field is
 * passed as `ConfirmDialog`'s `children` slot rather than duplicating the
 * dialog shell. Skipped entirely for a Google-only account
 * (`!user.hasPassword`) — nothing to reauth against, same rule
 * `PATCH /me`/`PATCH /me/password` apply server-side.
 */
export function DeleteAccountCard() {
  const t = useTranslations("profile.dangerZone");
  const tc = useTranslations("dialogs.common");
  const { user, deleteAccount } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  if (!user) return null;
  const hasPassword = user.hasPassword;

  return (
    <div className="bg-card border border-destructive/40 rounded-xl p-5 flex flex-col gap-3.5 lg:col-span-2">
      <p className="font-karantina text-2xl tracking-wide text-destructive uppercase">
        {t("heading")}
      </p>
      <p className="font-sans text-sm text-muted-foreground">
        {t("description")}
      </p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-5 py-2 rounded-lg bg-destructive text-white font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] cursor-pointer"
        >
          {t("deleteButton")}
        </button>
      </div>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPassword("");
        }}
        title={t("confirmTitle")}
        description={t("confirmDescription")}
        confirmLabel={t("deleteButton")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          try {
            await deleteAccount(hasPassword ? password : undefined);
            router.push("/signin");
            return { ok: true };
          } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
              return { ok: false, message: t("errorIncorrectPassword") };
            }
            return { ok: false, message: tc("errorGeneric") };
          }
        }}
      >
        {hasPassword && (
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="delete-account-password"
              className="font-sans text-sm text-muted-foreground uppercase font-normal"
            >
              {t("currentPasswordLabel")}
            </Label>
            <Input
              id="delete-account-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
