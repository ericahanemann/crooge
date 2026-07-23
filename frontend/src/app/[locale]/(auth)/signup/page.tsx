import { useTranslations } from "next-intl";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthSignupForm } from "@/components/auth/auth-signup-form";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const subtitles = t.raw("subtitles") as string[];
  const subtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

  return (
    <AuthPageShell title={t("title")} subtitle={subtitle}>
      <AuthSignupForm />
    </AuthPageShell>
  );
}
