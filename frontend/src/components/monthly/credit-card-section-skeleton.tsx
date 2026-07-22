import { Skeleton } from "@/components/ui/skeleton";

export function CreditCardSectionSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex gap-7">
        <div
          className="w-36 shrink-0 rounded-xl overflow-hidden"
          style={{ aspectRatio: "0.63" }}
        >
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between py-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                {i < 2 && <div className="h-px bg-border" />}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
