import { Skeleton } from "@/components/ui/skeleton";

export function MonthlySummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5"
        >
          <div>
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-14 w-40 mt-1" />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="mt-auto">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
