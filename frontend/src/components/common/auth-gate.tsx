"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "@/i18n/navigation";

/**
 * client-side auth gate: "protected" redirects unauthenticated users to
 * /signin (used by the (app) layout); "guest" redirects already-authenticated
 * users to / (used by the (auth) layout, so a logged-in user can't land back
 * on the signin/signup form). Shows a loading state while `AuthProvider`'s
 * silent refresh bootstrap is still in flight.
 */
export function AuthGate({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "protected" | "guest";
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mode === "protected" && status === "unauthenticated") {
      router.replace("/signin");
    }
    if (mode === "guest" && status === "authenticated") {
      router.replace("/");
    }
  }, [mode, status, router]);

  const blocked =
    status === "loading" ||
    (mode === "protected" && status !== "authenticated") ||
    (mode === "guest" && status === "authenticated");

  if (blocked) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
          LOADING...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
