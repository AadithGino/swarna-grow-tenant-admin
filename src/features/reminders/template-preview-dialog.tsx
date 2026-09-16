"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueryError } from "@/src/components/common/query-state";
import { useGetMessagingTemplatePreviewQuery } from "@/src/store/api/admin-api";

export function TemplatePreviewDialog({
  messageType,
  label,
  open,
  onOpenChange,
}: {
  messageType: string | null;
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useGetMessagingTemplatePreviewQuery(messageType ?? "", {
    skip: !open || !messageType,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>{label ?? "Template preview"}</DialogTitle>
            <DialogDescription>
              Sample render with demo placeholders
            </DialogDescription>
          </DialogHeader>
          {query.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading preview…
            </p>
          ) : query.isError ? (
            <QueryError error={query.error} onRetry={query.refetch} />
          ) : (
            <div className="rounded-xl bg-[#f6efe9] p-4 text-sm leading-6 whitespace-pre-wrap">
              {String(
                query.data?.renderedBody ??
                  query.data?.body ??
                  "No preview available.",
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
