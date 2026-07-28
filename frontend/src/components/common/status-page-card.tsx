import { cn } from "@/lib/utils";

/**
 * @prop hero - illustration/icon slot above the title (e.g. an error graphic).
 * @prop actions - buttons/links rendered below the divider (e.g. "Go home").
 * @prop heroGap - tailwind gap class between `hero` and the title/subtitle block, default "gap-2".
 */
interface StatusPageCardProps {
  hero: React.ReactNode;
  title: string;
  subtitle: string;
  actions: React.ReactNode;
  heroGap?: string;
}

/** centered card shell for full-page status states (error, not-found) — hero graphic + title/subtitle + divider + actions. */
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
