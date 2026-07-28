import { Skeleton } from "@/components/ui/skeleton";

/** loading placeholder mirroring `StatementCardsSection`'s two-card layout */
export function StatementCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* CurrentStatementCard shape */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-14 w-40 mt-1" />
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-auto">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
      {/* NextStatementsCard shape */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-14 w-40 mt-1" />
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="mt-auto">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
