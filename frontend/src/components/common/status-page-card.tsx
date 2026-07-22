import { cn } from "@/lib/utils";

interface StatusPageCardProps {
  hero: React.ReactNode;
  title: string;
  subtitle: string;
  actions: React.ReactNode;
  heroGap?: string;
}

export function StatusPageCard({
  hero,
  title,
  subtitle,
  actions,
  heroGap = "gap-2",
}: StatusPageCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-7">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm flex flex-col gap-3 text-center bg-linear-to-br from-white/5 to-card">
        <div className={cn("flex flex-col", heroGap)}>
          {hero}
          <div className="flex flex-col gap-1">
            <p className="font-karantina text-3xl tracking-wide uppercase text-foreground">
              {title}
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="h-px bg-border" />
        {actions}
      </div>
    </div>
  );
}
