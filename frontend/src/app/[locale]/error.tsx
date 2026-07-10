"use client";

export default function ErrorPage({
  reset,
}: {
  error: globalThis.Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4">
      <h2 className="font-karantina text-3xl tracking-wide text-foreground">
        SOMETHING WENT WRONG
      </h2>
      <button
        type="button"
        onClick={reset}
        className="font-karantina text-xl tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        TRY AGAIN
      </button>
    </div>
  );
}
