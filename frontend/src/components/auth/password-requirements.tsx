"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

/** Mirrors the backend's `passwordSchema` (`backend/src/modules/auth/schemas.ts`) — min 8 chars, a digit, a symbol. */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
  );
}

interface PasswordRequirementsListProps {
  password: string;
  /** Whether the list should render at all — see the signup-form comment this was extracted from on why "focused or non-empty" (not just "focused") matters. */
  visible: boolean;
}

/**
 * Live checklist of the three password requirements, re-evaluated on every
 * keystroke. Extracted from `AuthSignupForm` so `ChangePasswordDialog` gets
 * the exact same behavior for its `newPassword` field — see DESIGN.md
 * "Live password requirements (signup)" for the full rationale (in
 * particular: why the list stays mounted while the field has any content,
 * not just while focused).
 */
export function PasswordRequirementsList({
  password,
  visible,
}: PasswordRequirementsListProps) {
  const t = useTranslations("password");

  if (!visible) return null;

  const requirements = [
    { met: password.length >= 8, label: t("reqLength") },
    { met: /\d/.test(password), label: t("reqNumber") },
    { met: /[^A-Za-z0-9]/.test(password), label: t("reqSymbol") },
  ];

  return (
    <ul aria-live="polite" className="flex flex-col gap-1">
      {requirements.map((req) => (
        <li
          key={req.label}
          className={`flex items-center gap-1.5 font-sans text-xs ${
            req.met ? "text-highlight" : "text-muted-foreground"
          }`}
        >
          {req.met ? <Check size={12} /> : <X size={12} />}
          {req.label}
        </li>
      ))}
    </ul>
  );
}
