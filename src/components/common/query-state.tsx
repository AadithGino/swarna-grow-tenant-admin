import { AlertCircle, Inbox, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

export function QueryError({
  onRetry,
  title = "We couldn’t load this information",
  detail,
}: {
  onRetry: () => void;
  title?: string;
  /** Backend or network message; falls back to generic copy. */
  detail?: string;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border bg-white p-8 text-center">
      <div>
        <AlertCircle className="mx-auto mb-3 size-9 text-red-600" />
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {detail ??
            "Check your connection and try again. No changes were made."}
        </p>
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCcw /> Retry
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No records found",
  detail = "Try changing the filters or search terms.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center p-8 text-center">
      <div>
        <Inbox className="mx-auto mb-3 size-9 text-[#9a6f2a]" />
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
