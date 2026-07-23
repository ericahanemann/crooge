import Image from "next/image";
import { AuthBrandCard } from "./auth-brand-card";

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthPageShell({
  title,
  subtitle,
  children,
}: AuthPageShellProps) {
  return (
    <>
      <div className="hidden lg:flex flex-col p-7 w-1/2">
        <AuthBrandCard title={title} subtitle={subtitle} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-7">
        <div className="w-full max-w-sm flex flex-col gap-7">
          <div className="flex justify-center">
            <Image
              src="/logo.svg"
              alt="Crooge"
              width={120}
              height={40}
              priority
              className="invert dark:invert-0"
            />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
