interface CardVisualProps {
  name: string;
  brand: string;
}

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
          <span className="font-bold italic text-white text-xl tracking-widest select-none">
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
