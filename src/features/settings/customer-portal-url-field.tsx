"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  customerPortalLoginPath,
  customerPortalLoginUrl,
} from "@/src/lib/customer-portal-url";

export function CustomerPortalUrlField({ tenantCode }: { tenantCode: string }) {
  const loginPath = customerPortalLoginPath(tenantCode);
  const [displayUrl, setDisplayUrl] = useState("");

  useEffect(() => {
    setDisplayUrl(customerPortalLoginUrl(tenantCode));
  }, [tenantCode]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(customerPortalLoginUrl(tenantCode));
      toast.success("Customer portal link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="md:col-span-2">
      <FieldLabel>Customer portal link</FieldLabel>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
        Share this with customers for sign-in, schemes and PhonePe payments. The
        link is based on your tenant code and cannot be changed after go-live.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={displayUrl || loginPath}
          readOnly
          className="font-mono text-xs sm:flex-1 sm:text-sm"
        />
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => void copy()}>
            <ClipboardCopy className="size-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={loginPath} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
