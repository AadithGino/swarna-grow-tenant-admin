"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  dialogScrollShellClass,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import { toastApiError } from "@/src/lib/api-error";
import { hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  usePreviewEcommerceCategoryPromotionMutation,
  usePreviewEcommerceProductPromotionMutation,
  useSendEcommerceCategoryPromotionMutation,
  useSendEcommerceProductPromotionMutation,
} from "@/src/store/api/admin-api";

type Target =
  | { kind: "product"; productId: string; label: string }
  | { kind: "category"; categoryId: string; label: string };

export function EcommercePromotionComposerDialog({
  target,
  open,
  onOpenChange,
  onSent,
}: {
  target: Target | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}) {
  const user = useAppSelector((s) => s.session.session?.user);
  const canSend = hasPermission(user, "message.send");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eligible, setEligible] = useState<number | null>(null);
  const [previewProduct] = usePreviewEcommerceProductPromotionMutation();
  const [previewCategory] = usePreviewEcommerceCategoryPromotionMutation();
  const [sendProduct] = useSendEcommerceProductPromotionMutation();
  const [sendCategory] = useSendEcommerceCategoryPromotionMutation();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setTitle("");
    setBody("");
    setEligible(null);
    void (async () => {
      setLoadingPreview(true);
      try {
        const data =
          target.kind === "product"
            ? await previewProduct({ productId: target.productId, body: {} }).unwrap()
            : await previewCategory({ categoryId: target.categoryId, body: {} }).unwrap();
        setTitle(String(data.title ?? ""));
        setBody(String(data.body ?? ""));
        setEligible(typeof data.eligibleCustomers === "number" ? data.eligibleCustomers : null);
      } catch (err) {
        toastApiError(err);
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [open, target, previewProduct, previewCategory]);

  async function handleSend() {
    if (!target || !canSend) {
      toast.error("You need message.send permission to notify customers.");
      return;
    }
    setSending(true);
    try {
      const bodyPayload = {
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        audience: "ALL_DEVICES" as const,
      };
      const idempotencyKey = newIdempotencyKey();
      const result =
        target.kind === "product"
          ? await sendProduct({
              productId: target.productId,
              body: bodyPayload,
              idempotencyKey,
            }).unwrap()
          : await sendCategory({
              categoryId: target.categoryId,
              body: bodyPayload,
              idempotencyKey,
            }).unwrap();
      if (result.duplicate) {
        toast.message("Notification already queued", {
          description: "This send was deduplicated.",
        });
      } else if (result.skipped) {
        toast.message("Notification skipped", {
          description: String(result.reason ?? result.campaign?.skippedReason ?? "No eligible devices"),
        });
      } else if (result.intentPersisted && result.enqueued === false && result.enqueueError) {
        toast.message("Promotion saved — delivery pending", {
          description: "The server will retry sending in the background.",
        });
      } else {
        toast.success("Promotion queued", {
          description: "Delivery runs in the background.",
        });
      }
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      toastApiError(err);
    } finally {
      setSending(false);
    }
  }

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogScrollShellClass} sm:max-w-lg`}>
        <DialogBody>
          <DialogHeader className="text-left">
            <DialogTitle>Notify customers</DialogTitle>
            <DialogDescription>
              Push notification for {target.label}. Save product changes separately — this only
              sends a shop promotion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {!canSend ? (
              <p className="text-sm text-amber-800">
                Your role can edit the catalog but cannot send messages. Ask an admin for message.send.
              </p>
            ) : null}
            {eligible != null ? (
              <p className="text-sm text-muted-foreground">
                Eligible app devices: <strong>{eligible}</strong>
              </p>
            ) : null}
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loadingPreview} />
            </div>
            <div>
              <FieldLabel>Message</FieldLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                disabled={loadingPreview}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSend()} disabled={!canSend || sending || loadingPreview}>
              {sending ? "Sending…" : "Send notification"}
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
