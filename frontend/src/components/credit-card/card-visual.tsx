/**
 * @prop name - card name printed top-left
 * @prop brand - drives which brand mark renders bottom-right: "visa" → italic wordmark, "mastercard" → overlapping circles, anything else → the raw string in karantina
 */
interface CardVisualProps {
  name: string;
  brand: string;
}

/** the gradient credit-card graphic; aspect ratio is set by the parent container, not this component */
export function CardVisual({ name, brand }: CardVisualProps) {
  return (
    <div
      className="relative w-full h-full rounded-xl p-5 flex flex-col justify-between overflow-hidden shadow-lg"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklch, var(--highlight) 80%, white), var(--highlight))",
      }}
    >
      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <span className="font-karantina text-2xl tracking-wide text-white/90 uppercase">
          {name}
        </span>
      </div>

      <div className="relative z-10 flex justify-end items-center">
        {brand === "visa" && (
          <span className="font-bold italic text-white text-xl tracking-tight select-none">
            VISA
          </span>
        )}
        {brand === "mastercard" && (
          <div className="flex items-center -space-x-2">
            <div className="w-7 h-7 rounded-full bg-red-500/90" />
            <div className="w-7 h-7 rounded-full bg-orange-400/90" />
          </div>
        )}
        {brand !== "visa" && brand !== "mastercard" && (
          <span className="font-karantina text-base tracking-wide text-white/90 uppercase">
            {brand}
          </span>
        )}
      </div>
    </div>
  );
}
