"use client";

import Link from "next/link";
import { ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LimitErrorDetails = {
  code?: string;
  suggestedPlan?: string;
  upgradeUrl?: string;
  message?: string;
};

export function LimitUpsellCard({
  details,
  className,
}: {
  details: LimitErrorDetails;
  className?: string;
}) {
  if (!details?.code?.startsWith("LIMIT_")) return null;
  return (
    <div
      className={`rounded-xl border border-[#eadbb5] bg-[#fff8e8] p-4 text-sm ${className ?? ""}`}
    >
      <div className="flex gap-3">
        <ArrowUpCircle className="size-5 shrink-0 text-[#9a6f2a]" />
        <div className="min-w-0 flex-1">
          <strong className="text-[#5c4a2a]">
            {details.message ?? "Plan limit reached"}
          </strong>
          {details.suggestedPlan ? (
            <p className="mt-1 text-muted-foreground">
              Upgrade to <strong>{details.suggestedPlan}</strong> to continue.
            </p>
          ) : null}
          {details.upgradeUrl ? (
            <Button size="sm" className="mt-3" asChild>
              <Link href={details.upgradeUrl.startsWith("/") ? details.upgradeUrl : "/settings"}>
                View upgrade options
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="mt-3" asChild>
              <Link href="/settings">Subscription settings</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
