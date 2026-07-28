import { Skeleton } from "@/components/ui/skeleton";

/** loading placeholder mirroring `CreditCardSection`'s layout. */
export function CreditCardSectionSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col md:flex-row gap-7">
        <div className="w-full aspect-[1.587] md:hidden rounded-xl overflow-hidden">
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
        <div
          className="hidden md:block w-36 shrink-0 rounded-xl overflow-hidden"
          style={{ aspectRatio: "0.63" }}
        >
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col md:justify-between">
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
