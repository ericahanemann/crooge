import Image from "next/image";

/** @prop title/subtitle - already-translated brand copy, resolved server-side by the signin/signup page, not this component */
interface AuthBrandCardProps {
  title: string;
  subtitle: string;
}

/** left-column brand panel on auth pages (desktop only, `lg:`+) — decorative cow-pattern background + bottom-anchored title/subtitle, see DESIGN.md "Auth pages layout" and "Cow Pattern" */
export function AuthBrandCard({ title, subtitle }: AuthBrandCardProps) {
  return (
    <div className="relative flex-1 bg-card/10 rounded-xl overflow-hidden border border-border">
      <Image
        src="/cow-pattern.webp"
        alt=""
        aria-hidden="true"
        fill
        sizes="50vw"
        className="object-cover opacity-10 dark:invert"
      />
      <div className="absolute bottom-7 left-7 right-7">
        <p className="font-karantina font-bold text-5xl tracking-wide uppercase text-foreground">
          {title}
        </p>
        <p className="font-sans text-sm text-muted-foreground mt-1.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
