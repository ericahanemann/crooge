import { AuthGate } from "@/components/common/auth-gate";

/**
 * bare flex shell for `/signin` and `/signup` — no sidebar/header, unlike `(app)`'s `AppLayout`
 *
 * `AuthGate` in "guest" mode bounces already-authenticated users to `/`
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest">
      <div className="flex flex-1">{children}</div>
    </AuthGate>
  );
}
