import { useTranslations } from "next-intl";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AuthSigninForm } from "@/components/auth/auth-signin-form";

export default function SigninPage() {
  const t = useTranslations("auth.signin");
  const subtitles = t.raw("subtitles") as string[];
  const subtitle = subtitles[Math.floor(Math.random() * subtitles.length)];

  return (
    <AuthPageShell title={t("title")} subtitle={subtitle}>
      <AuthSigninForm />
    </AuthPageShell>
  );
}
