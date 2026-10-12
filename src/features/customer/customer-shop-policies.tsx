"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetShopStorePoliciesQuery } from "@/src/store/api/customer-api";

const POLICY_KEYS = [
  { key: "shippingPolicyText", label: "Shipping" },
  { key: "returnsPolicyText", label: "Returns & exchanges" },
  { key: "cancellationPolicyText", label: "Cancellations" },
  { key: "refundContactPolicyText", label: "Refunds & contact" },
] as const;

export function CustomerShopPoliciesLinks({ className }: { className?: string }) {
  const policies = useGetShopStorePoliciesQuery();
  const [openKey, setOpenKey] = useState<(typeof POLICY_KEYS)[number]["key"] | null>(null);
  if (!policies.data?.published || !policies.data.policies) return null;
  const body = policies.data.policies;

  return (
    <>
      <nav className={className} aria-label="Store policies">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Store policies</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {POLICY_KEYS.map(({ key, label }) => (
            <li key={key}>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setOpenKey(key)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <Dialog open={openKey != null} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {POLICY_KEYS.find((p) => p.key === openKey)?.label ?? "Policy"}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {openKey ? String(body[openKey] ?? "") : ""}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
