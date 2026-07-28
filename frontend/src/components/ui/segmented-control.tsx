import { cn } from "@/lib/utils";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * hand-rolled pill toggle — not a base ui primitive, a plain button group is simpler
 * than fighting `toggle-group`/`tabs` apis for a 2–3 option single-select (see
 * DESIGN.md "Segmented control")
 *
 * generic over `T` (the option value type) so callers get type-checked `value`/`onChange`
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-md py-1.5 font-karantina text-xl tracking-wide uppercase transition-colors cursor-pointer",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
