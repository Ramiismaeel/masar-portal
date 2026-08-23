import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while any (app) page's server component awaits its database
 * queries — Next renders this instantly on navigation, so tapping "View
 * checklist" on a slow connection gives immediate feedback instead of the
 * browser sitting on the previous page with nothing happening.
 *
 * One file covers every nested route under (app) that doesn't define its
 * own; the shape below deliberately mirrors the dashboard/checklist card
 * layout (both are a heading plus a stack of bordered rows) rather than
 * being a generic spinner.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-36" />

        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
