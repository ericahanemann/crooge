import Image from "next/image";

interface AuthBrandCardProps {
  title: string;
  subtitle: string;
}

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
