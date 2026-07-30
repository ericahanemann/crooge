/**
 * next.js route-level loading fallback for the `(app)` segment — shown only during full navigations between pages, not for the section-level `<Suspense>` boundaries inside a page (those use their own skeletons)
 */
export default function Loading() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
        LOADING...
      </span>
    </div>
  );
}
