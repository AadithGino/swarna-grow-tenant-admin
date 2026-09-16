"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";

export function PortalNotFoundPage({ path }: { path?: string }) {
  return (
    <>
      <PageHeader
        eyebrow="Navigation"
        title="Page not found"
        description={
          path
            ? `There is no admin page at “/${path}”.`
            : "This URL does not match any screen in the tenant admin portal."
        }
      />
      <Surface>
        <div className="flex flex-col items-start gap-4 p-8">
          <p className="max-w-lg text-sm text-muted-foreground">
            If you followed an old bookmark, the route may have moved. You can
            return to the dashboard or open Support desk for help.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">
                <LayoutDashboard />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">
                <ArrowLeft />
                Support desk
              </Link>
            </Button>
          </div>
        </div>
      </Surface>
    </>
  );
}
