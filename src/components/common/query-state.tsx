import { AlertCircle, Inbox, RefreshCcw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorDetailLines } from "@/src/lib/api-error";

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
  error,
}: {
  onRetry: () => void;
  title?: string;
  /** Backend or network message; falls back to generic copy. */
  detail?: string;
  /** RTK Query error — parsed for backend message, code, and trace id. */
  error?: unknown;
}) {
  const fromApi = error ? apiErrorDetailLines(error) : [];
  const primary =
    detail ?? fromApi[0] ?? "Check your connection and try again. No changes were made.";
  const secondary = detail ? fromApi.slice(1) : fromApi.slice(1);

  return (
    <div className="grid min-h-72 place-items-center rounded-[1.15rem] border border-[#e8dcd7] bg-white p-8 text-center">
      <div>
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100"><AlertCircle className="size-6" /></span>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {primary}
        </p>
        {secondary.length ? (
          <ul className="mx-auto mt-2 max-w-md space-y-0.5 text-xs text-muted-foreground">
            {secondary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
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
  icon: Icon = Inbox,
  action,
  className,
}: {
  title?: string;
  detail?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-h-56 place-items-center p-8 text-center", className)}>
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#fbf3e3] to-[#f3e2c0] text-[#94661b] ring-1 ring-[#ead6ae]">
          <Icon className="size-6" aria-hidden />
        </span>
        <h3 className="font-bold text-[#2d191d]">{title}</h3>
        {detail ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p> : null}
        {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
