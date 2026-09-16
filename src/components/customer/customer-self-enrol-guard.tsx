"use client";

import Link from "next/link";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { Button } from "@/components/ui/button";

/** Blocks plan discovery / self-enrol when the tenant has turned off customer self-enrol. */
export function CustomerSelfEnrolGuard({ children }: { children: React.ReactNode }) {
  const { tenantSlug, tenant } = useCustomerTenant();
  const { customerSelfEnrol } = useCustomerPortalCapabilities();

  if (customerSelfEnrol) return children;

  const jeweller = tenant?.displayName ?? tenant?.appDisplayName ?? "your jeweller";

  return (
    <div className="mx-auto max-w-lg rounded-[1.4rem] border bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-black">Enrolment through the app is unavailable</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {jeweller} does not offer self-enrolment online. Visit your branch or call{" "}
        {tenant?.supportNumber ? (
          <a href={`tel:${tenant.supportNumber.replace(/\s/g, "")}`} className="font-bold text-[#730321]">
            {tenant.supportNumber}
          </a>
        ) : (
          "your branch"
        )}{" "}
        to join a savings scheme.
      </p>
      <Button asChild className="mt-6 rounded-xl bg-[#730321]">
        <Link href={customerPath(tenantSlug)}>Back to home</Link>
      </Button>
    </div>
  );
}
