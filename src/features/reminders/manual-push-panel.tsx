"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Send, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { toastApiError } from "@/src/lib/api-error";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import {
  useCompletePushUploadMutation,
  useCreatePushBroadcastMutation,
  useGetBranchesQuery,
  useGetPushBroadcastsQuery,
  usePreviewPushBroadcastAudienceMutation,
  usePresignPushUploadMutation,
} from "@/src/store/api/admin-api";

type Audience = "ALL_DEVICES" | "BRANCH";

const PUSH_IMAGE_MAX_BYTES = 2_000_000;

export function ManualPushPanel() {
  const branchId = useActingBranchId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("/home");
  const [audience, setAudience] = useState<Audience>("ALL_DEVICES");
  const [targetBranchId, setTargetBranchId] = useState<string>("");
  const [eligible, setEligible] = useState<number | null>(null);
  const [subscriptionCap, setSubscriptionCap] = useState<number | null>(null);
  const [imageUploadId, setImageUploadId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const branchesQuery = useGetBranchesQuery();
  const pager = useCursorPagination(8);
  const historyQuery = useGetPushBroadcastsQuery(pager.queryParams);
  const [previewAudience, previewState] = usePreviewPushBroadcastAudienceMutation();
  const [presignPushUpload] = usePresignPushUploadMutation();
  const [completePushUpload] = useCompletePushUploadMutation();
  const [sendBroadcast, sendState] = useCreatePushBroadcastMutation();

  const effectiveBranch =
    audience === "BRANCH" ? targetBranchId || branchId || "" : null;

  const previewPayload = useMemo(
    () => ({
      audience,
      branchId: effectiveBranch || undefined,
    }),
    [audience, effectiveBranch],
  );

  async function refreshAudience() {
    try {
      const data = await previewAudience(previewPayload).unwrap();
      setEligible(data.eligibleDevices ?? 0);
      setSubscriptionCap(
        data.subscriptionCap != null && data.subscriptionCap > 0
          ? data.subscriptionCap
          : null,
      );
    } catch (err) {
      toastApiError(err, "Could not estimate audience");
    }
  }

  async function onPickImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPEG, or WebP image");
      return;
    }
    if (file.size > PUSH_IMAGE_MAX_BYTES) {
      toast.error("Image must be 2 MB or smaller");
      return;
    }
    setUploadingImage(true);
    try {
      const uploadId = await uploadFileViaPresign(
        file,
        (input) =>
          presignPushUpload({
            fileName: input.fileName,
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
          }).unwrap(),
        "PUSH_BROADCAST_IMAGE",
        (id) => completePushUpload(id).unwrap(),
      );
      setImageUploadId(uploadId);
      setImagePreviewUrl(URL.createObjectURL(file));
      toast.success("Image attached");
    } catch (err) {
      toastApiError(err, "Could not upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  function clearImage() {
    setImageUploadId(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  }

  async function onSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    try {
      await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        deepLink: deepLink.trim() || "/home",
        audience,
        branchId: effectiveBranch || undefined,
        imageUploadId: imageUploadId ?? undefined,
      }).unwrap();
      toast.success("Push broadcast queued — delivery runs in the background");
      setTitle("");
      setBody("");
      clearImage();
      historyQuery.refetch();
    } catch (err) {
      toastApiError(err, "Could not queue push broadcast");
    }
  }

  const page = historyQuery.data?.page ?? emptyPageMeta();

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Surface
        title="Send manual push"
        description="Sends to every customer in the audience who has a registered app device. No fixed batch cap — limited only by your subscription customer limit, if any."
      >
        <div className="space-y-4 p-5">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={title}
              maxLength={120}
              placeholder="e.g. Festival offer this week"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <Textarea
              value={body}
              maxLength={500}
              rows={4}
              placeholder="Short message shown on the lock screen"
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Image (optional)</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onPickImage(file);
                e.target.value = "";
              }}
            />
            {imagePreviewUrl ? (
              <div className="relative overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Push attachment preview"
                  className="max-h-40 w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 size-8"
                  onClick={clearImage}
                  aria-label="Remove image"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImage ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ImagePlus />
                )}
                Add image (max 2 MB)
              </Button>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Rich notification image for Android and iOS. Requires live storage and FCM in production.
            </p>
          </div>
          <div>
            <FieldLabel>Opens in app (path)</FieldLabel>
            <Input
              value={deepLink}
              placeholder="/home"
              onChange={(e) => setDeepLink(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Audience</FieldLabel>
            <Select
              value={audience}
              onValueChange={(v) => {
                setAudience(v as Audience);
                setEligible(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_DEVICES">All customers with app devices</SelectItem>
                <SelectItem value="BRANCH">One branch only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {audience === "BRANCH" ? (
            <div>
              <FieldLabel>Branch</FieldLabel>
              <Select
                value={targetBranchId || branchId || ""}
                onValueChange={(v) => {
                  setTargetBranchId(v);
                  setEligible(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branchesQuery.data?.items ?? []).map((b: { id: string; name: string; code: string }) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => void refreshAudience()} disabled={previewState.isLoading}>
              {previewState.isLoading ? <LoaderCircle className="animate-spin" /> : <Smartphone />}
              Estimate reach
            </Button>
            {eligible != null ? (
              <p className="text-sm text-muted-foreground">
                <strong>{eligible.toLocaleString()}</strong> customers with devices
                {subscriptionCap != null ? (
                  <> · plan allows up to {subscriptionCap.toLocaleString()} active customers</>
                ) : (
                  <> · no artificial send cap</>
                )}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={sendState.isLoading || uploadingImage}
            onClick={() => void onSend()}
          >
            {sendState.isLoading ? <LoaderCircle className="animate-spin" /> : <Send />}
            Queue push to audience
          </Button>
        </div>
      </Surface>

      <Surface title="Manual push history" description="Per-customer delivery appears in Message log (filter by broadcast).">
        <PaginatedDataTable
          rows={historyQuery.data?.items ?? []}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          columns={[
            {
              key: "createdAt",
              header: "Queued",
              render: (r: { createdAt?: string }) =>
                r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—",
            },
            { key: "title", header: "Title", render: (r: { title: string }) => <strong>{r.title}</strong> },
            {
              key: "stats",
              header: "Delivery",
              render: (r: { stats?: { delivered?: number; failed?: number; pending?: number } }) => {
                const s = r.stats ?? {};
                return (
                  <span className="text-sm">
                    {s.delivered ?? 0} delivered · {s.failed ?? 0} failed · {s.pending ?? 0} pending
                  </span>
                );
              },
            },
            {
              key: "status",
              header: "Job",
              render: (r: { status: string }) => <StatusBadge status={r.status} />,
            },
            {
              key: "action",
              header: "",
              render: (r: { id: string }) => (
                <Button size="sm" variant="ghost" asChild>
                  <Link
                    href={`/reminders?tab=log&broadcastId=${encodeURIComponent(r.id)}&channel=PUSH`}
                  >
                    Log
                  </Link>
                </Button>
              ),
            },
          ]}
        />
      </Surface>
    </div>
  );
}
