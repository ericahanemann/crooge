import { Skeleton } from "@/components/ui/skeleton";

const groups = [{ rows: 2 }, { rows: 2 }, { rows: 1 }];

/** loading placeholder shown in a `Suspense` boundary while the transactions list section fetches/formats its data */
export function TransactionsSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-6 w-6" />
      </div>
      <div className="space-y-5">
        {groups.map((group, gi) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton structure
          <div key={gi}>
            <Skeleton className="h-3 w-40 mb-2" />
            <div className="space-y-1">
              {Array.from({ length: group.rows }).map((_, ri) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton structure
                <div key={ri} className="flex items-center gap-3 py-1.5">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
