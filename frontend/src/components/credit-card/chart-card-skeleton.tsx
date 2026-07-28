import { Skeleton } from "@/components/ui/skeleton";

const BAR_HEIGHTS = [65, 45, 85, 55, 100, 40, 70, 50, 90, 35, 80, 60, 75];

/** loading placeholder mirroring `StatementChartCard`'s header + bar-chart layout; `BAR_HEIGHTS` are arbitrary, just varied enough to read as a real chart */
export function ChartCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex items-end gap-1.5 h-48 px-2">
        {BAR_HEIGHTS.map((h) => (
          <Skeleton
            key={h}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
