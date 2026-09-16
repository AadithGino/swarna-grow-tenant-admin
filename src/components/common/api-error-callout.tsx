"use client";

import { apiErrorDetailLines, parseApiError } from "@/src/lib/api-error";
import { cn } from "@/lib/utils";

type ApiErrorCalloutProps = {
  error: unknown;
  className?: string;
  title?: string;
};

/** User-safe backend error text (message, code, trace reference). */
export function ApiErrorCallout({
  error,
  className,
  title,
}: ApiErrorCalloutProps) {
  if (!error) return null;
  const parsed = parseApiError(error);
  const lines = apiErrorDetailLines(error);
  const primary = lines[0] ?? parsed.message;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800",
        className,
      )}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <p>{primary}</p>
      {lines.length > 1 ? (
        <ul className="mt-2 space-y-0.5 text-xs text-red-700/90">
          {lines.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
