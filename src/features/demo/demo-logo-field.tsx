"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/src/components/common/page-parts";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { validateTenantLogoFile } from "@/src/lib/settings-form-validation";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useCompleteDemoLogoUploadMutation,
  usePresignDemoLogoUploadMutation,
} from "@/src/store/api/platform-api";
import { useGetPublicCustomerUploadDownloadQuery } from "@/src/store/api/customer-api";

type DemoLogoFieldProps = {
  logoUploadId: string | null;
  onChange: (logoUploadId: string | null) => void;
  disabled?: boolean;
};

export function DemoLogoField({ logoUploadId, onChange, disabled }: DemoLogoFieldProps) {
  const [presign] = usePresignDemoLogoUploadMutation();
  const [complete] = useCompleteDemoLogoUploadMutation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const downloadQuery = useGetPublicCustomerUploadDownloadQuery(logoUploadId as string, {
    skip: !logoUploadId || Boolean(localPreview),
  });
  const previewSrc = localPreview ?? downloadQuery.data?.downloadUrl ?? null;

  return (
    <div>
      <FieldLabel>Logo (optional)</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative grid size-16 place-items-center overflow-hidden rounded-xl border border-[#ead7db] bg-white">
          {previewSrc ? (
            <Image src={previewSrc} alt="" fill sizes="64px" unoptimized className="object-contain p-1" />
          ) : (
            <ImagePlus className="size-5 text-[#b58a92]" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const fileErr = validateTenantLogoFile(file);
              if (fileErr) {
                setError(fileErr);
                return;
              }
              setError(undefined);
              setBusy(true);
              const objectUrl = URL.createObjectURL(file);
              setLocalPreview(objectUrl);
              try {
                const token =
                  typeof window !== "undefined"
                    ? localStorage.getItem(TOKEN_KEYS.platform.access)
                    : null;
                const uploadId = await uploadFileViaPresign(
                  file,
                  (input) =>
                    presign({
                      purpose: "TENANT_LOGO",
                      fileName: input.fileName,
                      contentType: input.contentType,
                      sizeBytes: input.sizeBytes,
                    }).unwrap(),
                  "TENANT_LOGO",
                  async (id) => complete(id).unwrap(),
                  token ? { Authorization: `Bearer ${token}` } : undefined,
                );
                onChange(uploadId);
              } catch (err) {
                setLocalPreview(null);
                URL.revokeObjectURL(objectUrl);
                setError(
                  (err as { data?: { error?: { message?: string } } })?.data?.error?.message
                    ?? (err instanceof Error ? err.message : "Could not upload logo"),
                );
              } finally {
                setBusy(false);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            {busy ? "Uploading…" : "PNG, JPEG or WebP up to 2 MB. Shown on the splash screen and customer portal."}
          </p>
        </div>
        {logoUploadId ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled || busy}
            aria-label="Remove logo"
            onClick={() => {
              if (localPreview) URL.revokeObjectURL(localPreview);
              setLocalPreview(null);
              onChange(null);
              setError(undefined);
            }}
          >
            <X />
          </Button>
        ) : null}
        {busy ? <LoaderCircle className="size-4 animate-spin text-[#730321]" /> : null}
      </div>
      <FormFieldError message={error} />
    </div>
  );
}
