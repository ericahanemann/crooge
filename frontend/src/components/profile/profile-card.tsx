"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  isPasswordValid,
  PasswordRequirementsList,
} from "@/components/auth/password-requirements";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/auth-api";

/**
 * Name, email, and password change, all in one form/one Save — merged
 * (rather than a separate security card + dialog) since every field here
 * shares the same `currentPassword` reauth requirement and the same
 * submit/error cycle. `currentPassword` reveals once either an identity
 * field (email) or the new-password fields need it; `confirmPassword`
 * reveals once a new password is being typed.
 *
 * On submit: `name`/`email` go through `updateProfile` (`PATCH /me`) first,
 * then — only if a new password was entered — `changePassword`
 * (`PATCH /me/password`) runs last, since it ends this device's session;
 * doing it last means a simultaneous name/email change isn't lost if the
 * user backs out of changing their password after fixing a validation
 * error.
 */
export function ProfileCard() {
  const t = useTranslations("profile.profileCard");
  const { user, updateProfile, changePassword } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const emailChanged = email !== user.email;
  const nameChanged = name !== user.name;
  const changingPassword = newPassword.length > 0;
  const needsCurrentPassword = emailChanged || changingPassword;
  const dirty = emailChanged || nameChanged || changingPassword;

  function resetPasswordFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (changingPassword) {
      if (!isPasswordValid(newPassword)) {
        setError(t("errorWeakPassword"));
        return;
      }
      if (newPassword !== confirmPassword) {
        setError(t("errorPasswordMismatch"));
        return;
      }
    }

    setSaving(true);
    try {
      if (nameChanged || emailChanged) {
        await updateProfile({
          ...(nameChanged ? { name } : {}),
          ...(emailChanged ? { email, currentPassword } : {}),
        });
      }

      if (changingPassword) {
        await changePassword(currentPassword, newPassword);
        router.push("/signin");
        return;
      }

      resetPasswordFields();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("errorIncorrectPassword"));
      } else if (err instanceof ApiError && err.status === 409) {
        setError(t("errorEmailTaken"));
      } else {
        setError(t("errorGeneric"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5"
    >
      <p className="font-karantina text-2xl tracking-wide text-foreground uppercase">
        {t("heading")}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="profile-name"
          className="font-sans text-sm text-muted-foreground uppercase font-normal"
        >
          {t("nameLabel")}
        </Label>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          disabled={saving}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="profile-email"
          className="font-sans text-sm text-muted-foreground uppercase font-normal"
        >
          {t("emailLabel")}
        </Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={saving}
        />
      </div>

      <p className="font-karantina text-2xl tracking-wide text-foreground uppercase">
        {t("passwordHeading")}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="profile-new-password"
          className="font-sans text-sm text-muted-foreground uppercase font-normal"
        >
          {t("newPasswordLabel")}
        </Label>
        <Input
          id="profile-new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onFocus={() => setNewPasswordFocused(true)}
          onBlur={() => setNewPasswordFocused(false)}
          autoComplete="new-password"
          minLength={8}
          disabled={saving}
        />
        <PasswordRequirementsList
          password={newPassword}
          visible={newPasswordFocused || newPassword.length > 0}
        />
        <p className="font-sans text-xs text-muted-foreground">
          {t("newPasswordHint")}
        </p>
      </div>

      {changingPassword && (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="profile-confirm-password"
            className="font-sans text-sm text-muted-foreground uppercase font-normal"
          >
            {t("confirmPasswordLabel")}
          </Label>
          <Input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={saving}
          />
        </div>
      )}

      {needsCurrentPassword && (
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="profile-current-password"
            className="font-sans text-sm text-muted-foreground uppercase font-normal"
          >
            {t("currentPasswordLabel")}
          </Label>
          <Input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={saving}
          />
          <p className="font-sans text-xs text-muted-foreground">
            {t("currentPasswordHint")}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="mt-auto flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 font-sans text-xs text-highlight">
            <Check size={14} />
            {t("saved")}
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !dirty}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
