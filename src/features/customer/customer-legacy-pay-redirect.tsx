"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { CUSTOMER_TENANT_SLUG_STORAGE_KEY, customerPath } from "@/src/lib/customer-tenant";

/** Sends bare `/pay/:token` URLs to `/customer/:slug/pay/:token`. */
export function CustomerLegacyPayRedirect({ linkToken }: { linkToken: string }) {
  const router = useRouter();

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(CUSTOMER_TENANT_SLUG_STORAGE_KEY)
        : null;
    router.replace(customerPath(stored, "pay", linkToken));
  }, [linkToken, router]);

  return (
    <div className="customer-theme grid min-h-screen place-items-center bg-[#fbf8f4]">
      <LoaderCircle className="size-10 animate-spin text-[#730321]" />
    </div>
  );
}
