"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel } from "@/src/components/common/page-parts";
import { toastApiError } from "@/src/lib/api-error";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useCompleteUploadMutation,
  useCreateEcommerceProductMutation,
  useGetEcommerceCategoriesQuery,
  useGetEcommerceTaxSettingsQuery,
  usePatchEcommerceProductMutation,
  usePresignUploadMutation,
  usePublishEcommerceProductMutation,
  useArchiveEcommerceProductMutation,
  useLazyPreviewEcommerceProductPriceQuery,
} from "@/src/store/api/admin-api";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { rupeesToPaise, useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";

type ProductRow = Record<string, any>;

function EcommerceProductDialogBody({
  product,
  onOpenChange,
  onSaved,
}: {
  product?: ProductRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const categories = useGetEcommerceCategoriesQuery(undefined);
  const tax = useGetEcommerceTaxSettingsQuery();
  const [createProduct] = useCreateEcommerceProductMutation();
  const [patchProduct] = usePatchEcommerceProductMutation();
  const [publishProduct] = usePublishEcommerceProductMutation();
  const [archiveProduct] = useArchiveEcommerceProductMutation();
  const [presignUpload] = usePresignUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  const [fetchPreview, previewState] = useLazyPreviewEcommerceProductPriceQuery();

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId ?? "");
  const [priceMode, setPriceMode] = useState<"FIXED" | "GOLD_RATE_BASED">(
    product?.priceMode ?? "FIXED",
  );
  const [baseRupee, setBaseRupee] = useState(
    product?.fixedPricing?.basePricePaise != null
      ? String(product.fixedPricing.basePricePaise / 100)
      : "",
  );
  const [purity, setPurity] = useState(product?.purity ?? "22K");
  const [weightGrams, setWeightGrams] = useState(
    product?.goldWeightMg != null ? String(product.goldWeightMg / 1000) : "",
  );
  const [makingFixedRupee, setMakingFixedRupee] = useState(
    product?.makingCharge?.fixedPaise != null
      ? String(product.makingCharge.fixedPaise / 100)
      : "",
  );
  const [taxClassification, setTaxClassification] = useState(
    product?.taxClassification ?? tax.data?.defaultClassification ?? "",
  );
  const [imageUploadIds, setImageUploadIds] = useState<string[]>(
    product?.imageUploadIds ?? [],
  );
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [preview, setPreview] = useState<Record<string, unknown> | null>(
    product?.pricing ?? null,
  );

  const activeCategories = (categories.data?.items ?? []).filter(
    (c: { active?: boolean }) => c.active !== false,
  );

  async function refreshPreview(productId: string) {
    try {
      const data = await fetchPreview({ productId }).unwrap();
      setPreview(data);
    } catch {
      /* preview optional */
    }
  }

  async function handleImagePick(file: File | null) {
    if (!file || !entitled) return;
    try {
      const uploadId = await uploadFileViaPresign(
        file,
        (input) => presignUpload(input).unwrap(),
        "ECOMMERCE_PRODUCT_IMAGE",
        (id) => completeUpload(id).unwrap(),
      );
      setImageUploadIds((prev) => [...prev, uploadId]);
      toast.success("Image uploaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  function buildBody() {
    const body: Record<string, unknown> = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      sku: sku.trim() || undefined,
      categoryId: categoryId || null,
      priceMode,
      taxClassification: taxClassification || undefined,
      imageUploadIds,
    };
    if (priceMode === "FIXED") {
      const basePricePaise = rupeesToPaise(baseRupee);
      if (basePricePaise == null) {
        throw new Error("Enter a valid fixed price in rupees.");
      }
      body.fixedPricing = { basePricePaise };
    } else {
      const grams = Number(weightGrams);
      if (!Number.isFinite(grams) || grams <= 0) {
        throw new Error("Enter gold weight in grams.");
      }
      const makingPaise = rupeesToPaise(makingFixedRupee) ?? 0;
      body.purity = purity;
      body.goldWeightMg = Math.round(grams * 1000);
      body.makingChargeMode = "FIXED_PAISE";
      body.makingCharge = { fixedPaise: makingPaise };
    }
    return body;
  }

  async function saveDraft() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    setFieldError(undefined);
    try {
      const body = buildBody();
      if (product?.id) {
        await patchProduct({
          productId: product.id,
          body: { ...body, expectedVersion: product.version },
        }).unwrap();
        await refreshPreview(product.id);
        toast.success("Product saved");
      } else {
        const created = await createProduct(body).unwrap();
        await refreshPreview(created.id);
        toast.success("Product created as draft");
      }
      onSaved?.();
    } catch (err) {
      toastApiError(err);
      setFieldError("Could not save. Check validation errors.");
    }
  }

  async function publish() {
    setFieldError(undefined);
    try {
      let body: Record<string, unknown>;
      try {
        body = buildBody();
      } catch (err) {
        setFieldError(err instanceof Error ? err.message : "Invalid form");
        return;
      }
      let row = product;
      if (row?.id) {
        row = await patchProduct({
          productId: row.id,
          body: { ...body, expectedVersion: row.version },
        }).unwrap();
      } else {
        row = await createProduct(body).unwrap();
      }
      await publishProduct({
        productId: row.id,
        expectedVersion: row.version,
      }).unwrap();
      toast.success("Published");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toastApiError(err);
    }
  }

  async function archive() {
    if (!product?.id) return;
    try {
      await archiveProduct({
        productId: product.id,
        expectedVersion: product.version,
      }).unwrap();
      toast.success("Archived");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <>
      <DialogContent className={dialogScrollShellClass}>
        <DialogBody className="overflow-y-auto pb-2">
          <DialogHeader className="text-left">
            <DialogTitle>{product?.id ? "Edit product" : "New product"}</DialogTitle>
            <DialogDescription>
              Prices shown in preview come from the server estimate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
      {!entitled ? (
        <p className="text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Slug</FieldLabel>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" />
        </div>
        <div>
          <FieldLabel>SKU</FieldLabel>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={categoryId || "__none"} onValueChange={(v) => setCategoryId(v === "__none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Uncategorised" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Uncategorised</SelectItem>
              {activeCategories.map((c) => (
                <SelectItem key={String(c.id)} value={String(c.id)}>
                  {String(c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Price mode</FieldLabel>
          <Select value={priceMode} onValueChange={(v) => setPriceMode(v as typeof priceMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed (all-inclusive)</SelectItem>
              <SelectItem value="GOLD_RATE_BASED">Gold rate based</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Tax classification</FieldLabel>
          <Select value={taxClassification || "__none"} onValueChange={(v) => setTaxClassification(v === "__none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select rate code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {(tax.data?.rates ?? [])
                .filter((r: { active?: boolean }) => r.active !== false)
                .map((r: { code: string; label?: string }) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label ?? r.code}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {priceMode === "FIXED" ? (
          <div className="sm:col-span-2">
            <FieldLabel>Base price (₹)</FieldLabel>
            <Input value={baseRupee} onChange={(e) => setBaseRupee(e.target.value)} inputMode="decimal" />
            <p className="mt-1 text-xs text-muted-foreground">
              Fixed price includes making and stones; do not add them again.
            </p>
          </div>
        ) : (
          <>
            <div>
              <FieldLabel>Purity</FieldLabel>
              <Select value={purity} onValueChange={setPurity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["18K", "22K", "24K"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Gold weight (g)</FieldLabel>
              <Input value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} inputMode="decimal" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Making charge (₹, fixed)</FieldLabel>
              <Input value={makingFixedRupee} onChange={(e) => setMakingFixedRupee(e.target.value)} inputMode="decimal" />
              <p className="mt-1 text-xs text-muted-foreground">
                V1 offers apply to making charge only on gold-rate products.
              </p>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <FieldLabel>Product images</FieldLabel>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={!entitled}
            onChange={(e) => {
              void handleImagePick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {imageUploadIds.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {imageUploadIds.length} image(s) attached
            </p>
          ) : null}
        </div>
      </div>
      <FormFieldError message={fieldError} />
      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold">Pricing preview</p>
        {previewState.isFetching ? (
          <p className="text-sm text-muted-foreground">Loading estimate…</p>
        ) : (
          <PricingPreviewPanel pricing={preview as any} />
        )}
      </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {product?.status === "PUBLISHED" ? (
            <Button type="button" variant="secondary" disabled={!entitled} onClick={archive}>
              Archive
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={!entitled} onClick={saveDraft}>
            Save draft
          </Button>
          <Button type="button" disabled={!entitled} onClick={publish}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </>
  );
}

export function EcommerceProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductRow | null;
  onSaved?: () => void;
}) {
  const tax = useGetEcommerceTaxSettingsQuery();
  const defaultTax = tax.data?.defaultClassification ?? "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <EcommerceProductDialogBody
          key={`${product?.id ?? "new"}|${defaultTax}`}
          product={product}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}
