import { cn } from "@/lib/utils";

/**
 * A neutral pulsing placeholder block. Used by the `loading.tsx` route
 * segments so navigating to a DB-backed page (dashboard, a checklist) shows
 * the shape of what's coming instead of a blank screen — Next streams this
 * in immediately while the server component awaits its queries.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
