"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel } from "@/src/components/common/page-parts";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { cn } from "@/lib/utils";
import {
  DATETIME_LOCAL_TIMEZONE_LABEL,
  utcIsoToDatetimeLocalValue,
} from "@/src/lib/datetime-local";
import {
  filterPickerRows,
  resolveTargetLabel,
  withPinnedPickerOption,
  type PickerRow,
} from "@/src/lib/banner-destination-picker";
import {
  BANNER_IMAGE_ARTWORK_HINT,
  BANNER_PLACEMENT_PREVIEW_CAPTION,
  CUSTOMER_PROMO_RAIL_FRAME,
  ECOMMERCE_BANNER_DESTINATIONS,
  ECOMMERCE_BANNER_PLACEMENTS,
  placementMeta,
} from "@/src/lib/ecommerce-banner-surfaces";

export type BannerEditorRow = {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  placement: string;
  displayOrder?: number;
  destinationType: string;
  targetCategoryId?: string | null;
  targetProductId?: string | null;
  imageUploadId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  version: number;
};

export type BannerPickerUiState = "idle" | "loading" | "ready" | "empty" | "error";

function publishBlockers(row: {
  imageUploadId?: string | null;
  destinationType: string;
  targetCategoryId?: string | null;
  targetProductId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): string[] {
  const issues: string[] = [];
  if (!row.imageUploadId) issues.push("Add a banner image before publishing.");
  if (row.destinationType === "CATEGORY" && !row.targetCategoryId) {
    issues.push("Choose a category for this destination.");
  }
  if (row.destinationType === "PRODUCT" && !row.targetProductId) {
    issues.push("Choose a product for this destination.");
  }
  if (row.startsAt && row.endsAt && new Date(row.startsAt) > new Date(row.endsAt)) {
    issues.push("End date must be after the start date.");
  }
  return issues;
}

export function EcommerceBannerEditorDialog({
  open,
  onOpenChange,
  editing,
  readOnly,
  canWrite,
  title,
  onTitleChange,
  subtitle,
  onSubtitleChange,
  placement,
  onPlacementChange,
  displayOrder,
  onDisplayOrderChange,
  destinationType,
  onDestinationTypeChange,
  targetCategoryId,
  onTargetCategoryIdChange,
  targetProductId,
  onTargetProductIdChange,
  startsAt,
  onStartsAtChange,
  endsAt,
  onEndsAtChange,
  imageUploadId,
  imageUploading,
  imageUploadError,
  onImagePick,
  categoryPicker,
  productPicker,
  productPickerFilter,
  onProductPickerFilterChange,
  onLoadMoreProducts,
  onRetryCategories,
  onRetryProducts,
  onSubmit,
  submitDisabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BannerEditorRow | null;
  readOnly: boolean;
  canWrite: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  subtitle: string;
  onSubtitleChange: (value: string) => void;
  placement: string;
  onPlacementChange: (value: string) => void;
  displayOrder: string;
  onDisplayOrderChange: (value: string) => void;
  destinationType: string;
  onDestinationTypeChange: (value: string) => void;
  targetCategoryId: string;
  onTargetCategoryIdChange: (value: string) => void;
  targetProductId: string;
  onTargetProductIdChange: (value: string) => void;
  startsAt: string;
  onStartsAtChange: (value: string) => void;
  endsAt: string;
  onEndsAtChange: (value: string) => void;
  imageUploadId: string | null;
  imageUploading: boolean;
  imageUploadError: string | null;
  onImagePick: (file: File | null) => void;
  categoryPicker: {
    state: BannerPickerUiState;
    rows: PickerRow[];
    pinned?: { id: string; name: string; active?: boolean } | null;
    errorMessage?: string | null;
    loadingTarget?: boolean;
    targetError?: string | null;
  };
  productPicker: {
    state: BannerPickerUiState;
    rows: PickerRow[];
    pinned?: { id: string; name: string; status?: string } | null;
    hasMore: boolean;
    loadingMore: boolean;
    errorMessage?: string | null;
    loadingTarget?: boolean;
    targetError?: string | null;
  };
  productPickerFilter: string;
  onProductPickerFilterChange: (value: string) => void;
  onLoadMoreProducts: () => void;
  onRetryCategories: () => void;
  onRetryProducts: () => void;
  onSubmit: () => Promise<void | false>;
  submitDisabled?: boolean;
}) {
  const archived = editing?.status === "ARCHIVED" || readOnly;
  const formSnapshot = {
    imageUploadId,
    destinationType,
    targetCategoryId: targetCategoryId || null,
    targetProductId: targetProductId || null,
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
  };

  const categoryOptions = withPinnedPickerOption(
    categoryPicker.rows,
    targetCategoryId,
    categoryPicker.pinned,
  );
  const productOptions = withPinnedPickerOption(
    filterPickerRows(productPicker.rows, productPickerFilter),
    targetProductId,
    productPicker.pinned,
  );
  const categoryHint = resolveTargetLabel(
    targetCategoryId,
    categoryPicker.rows,
    categoryPicker.pinned,
    "category",
  );
  const productHint = resolveTargetLabel(
    targetProductId,
    productPicker.rows,
    productPicker.pinned,
    "product",
  );

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        archived ? "View banner (archived)" : editing ? "Edit banner" : "New banner"
      }
      actionLabel={
        archived ? "Close" : editing?.status === "PUBLISHED" ? "Save changes" : "Save draft"
      }
      submitDisabled={archived ? false : submitDisabled}
      suppressDefaultErrorToast
      onSubmit={async () => {
        if (archived) return;
        return onSubmit();
      }}
    >
      <div className="space-y-4" data-testid="banner-editor-form">
        <div>
          <FieldLabel>Title</FieldLabel>
          <Input
            data-testid="banner-title-input"
            value={title}
            disabled={archived || !canWrite}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <FieldLabel>Subtitle (optional)</FieldLabel>
          <Input
            value={subtitle}
            disabled={archived || !canWrite}
            onChange={(e) => onSubtitleChange(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Placement</FieldLabel>
            <Select
              value={placement}
              disabled={archived || !canWrite}
              onValueChange={onPlacementChange}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ECOMMERCE_BANNER_PLACEMENTS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {placementMeta(placement).customerLocation}
            </p>
          </div>
          <div>
            <FieldLabel>Display order</FieldLabel>
            <Input
              value={displayOrder}
              disabled={archived || !canWrite}
              onChange={(e) => onDisplayOrderChange(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <Select
            value={destinationType}
            disabled={archived || !canWrite}
            onValueChange={onDestinationTypeChange}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ECOMMERCE_BANNER_DESTINATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {destinationType === "CATEGORY" ? (
          <div>
            <FieldLabel>Category</FieldLabel>
            {categoryPicker.state === "loading" ? (
              <p className="text-xs text-muted-foreground">Loading categories…</p>
            ) : null}
            {categoryPicker.state === "error" ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{categoryPicker.errorMessage ?? "Could not load categories."}</p>
                <Button type="button" size="sm" variant="outline" onClick={onRetryCategories}>
                  Retry
                </Button>
              </div>
            ) : null}
            {categoryPicker.state === "empty" ? (
              <p className="text-xs text-muted-foreground">No active categories found.</p>
            ) : null}
            {(categoryPicker.state === "ready" || categoryPicker.state === "idle") && categoryOptions.length ? (
              <Select
                value={targetCategoryId || "__none"}
                disabled={archived || !canWrite}
                onValueChange={(v) => onTargetCategoryIdChange(v === "__none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {categoryPicker.loadingTarget ? (
              <p className="mt-1 text-xs text-muted-foreground">Loading saved category…</p>
            ) : null}
            {categoryPicker.targetError ? (
              <p className="mt-1 text-xs text-destructive">{categoryPicker.targetError}</p>
            ) : null}
            {categoryHint && categoryHint.state !== "selected" ? (
              <p className="mt-1 text-xs text-amber-800">{categoryHint.label}</p>
            ) : null}
          </div>
        ) : null}
        {destinationType === "PRODUCT" ? (
          <div>
            <FieldLabel>Product</FieldLabel>
            {productPicker.state === "loading" ? (
              <p className="text-xs text-muted-foreground">Loading products…</p>
            ) : null}
            {productPicker.state === "error" ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{productPicker.errorMessage ?? "Could not load products."}</p>
                <Button type="button" size="sm" variant="outline" onClick={onRetryProducts}>
                  Retry
                </Button>
              </div>
            ) : null}
            {productPicker.state === "empty" ? (
              <p className="text-xs text-muted-foreground">No published products found.</p>
            ) : null}
            {(productPicker.state === "ready" || productPicker.state === "idle") && productOptions.length ? (
              <>
                <Input
                  className="mb-2"
                  placeholder="Filter loaded products…"
                  disabled={archived || !canWrite}
                  value={productPickerFilter}
                  onChange={(e) => onProductPickerFilterChange(e.target.value)}
                />
                <Select
                  value={targetProductId || "__none"}
                  disabled={archived || !canWrite}
                  onValueChange={(v) => onTargetProductIdChange(v === "__none" ? "" : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {productOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
            {productPicker.loadingTarget ? (
              <p className="mt-1 text-xs text-muted-foreground">Loading saved product…</p>
            ) : null}
            {productPicker.targetError ? (
              <p className="mt-1 text-xs text-destructive">{productPicker.targetError}</p>
            ) : null}
            {productHint && productHint.state !== "selected" ? (
              <p className="mt-1 text-xs text-amber-800">{productHint.label}</p>
            ) : null}
            {productPicker.hasMore && !archived ? (
              <Button
                type="button"
                variant="link"
                className="mt-2 h-auto p-0 text-xs"
                disabled={productPicker.loadingMore}
                onClick={onLoadMoreProducts}
              >
                {productPicker.loadingMore ? "Loading…" : "Load more products"}
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Starts (optional)</FieldLabel>
            <Input
              data-testid="banner-starts-input"
              type="datetime-local"
              value={startsAt}
              disabled={archived || !canWrite}
              onChange={(e) => onStartsAtChange(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Ends (optional)</FieldLabel>
            <Input
              data-testid="banner-ends-input"
              type="datetime-local"
              value={endsAt}
              disabled={archived || !canWrite}
              onChange={(e) => onEndsAtChange(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Schedule times use {DATETIME_LOCAL_TIMEZONE_LABEL}.</p>
        <div>
          <FieldLabel>Banner image</FieldLabel>
          <Input
            data-testid="banner-image-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={archived || !canWrite || imageUploading}
            onChange={(e) => onImagePick(e.target.files?.[0] ?? null)}
          />
          {imageUploading ? (
            <p className="mt-1 text-xs text-muted-foreground">Uploading image…</p>
          ) : null}
          {imageUploadError ? (
            <p className="mt-1 text-xs text-destructive">{imageUploadError}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{BANNER_IMAGE_ARTWORK_HINT}</p>
          {imageUploadId ? (
            <div className="mt-2 max-w-[320px]">
              <div className={cn(CUSTOMER_PROMO_RAIL_FRAME, "w-full")} data-testid="banner-image-preview">
                <EcommerceCatalogImage uploadId={imageUploadId} channel="admin" alt="" fill className="object-cover" />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{BANNER_PLACEMENT_PREVIEW_CAPTION}</p>
            </div>
          ) : (
            <div className="mt-2 grid h-16 place-items-center rounded border border-dashed text-muted-foreground">
              <ImageIcon className="size-5" />
            </div>
          )}
        </div>
        {!archived && publishBlockers(formSnapshot).length ? (
          <p className="text-xs text-amber-800">{publishBlockers(formSnapshot).join(" ")}</p>
        ) : null}
        {archived ? (
          <p className="text-xs text-muted-foreground">
            This banner is archived and cannot be edited. Unarchive is not supported; create a new banner if needed.
          </p>
        ) : null}
      </div>
    </ActionDialog>
  );
}

/** Re-export for tests comparing schedule round-trip from editor fields. */
export { utcIsoToDatetimeLocalValue };
