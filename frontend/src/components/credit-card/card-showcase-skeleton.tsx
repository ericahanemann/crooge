import { Skeleton } from "@/components/ui/skeleton";

export function CardShowcaseSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="w-full aspect-[1.587] md:hidden mb-5 rounded-xl overflow-hidden">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
      <div className="flex gap-7">
        <div
          className="hidden md:block w-48 shrink-0 rounded-xl overflow-hidden"
          style={{ aspectRatio: "0.63" }}
        >
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-start justify-between">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="h-px bg-border" />
          <div className="flex justify-end">
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
