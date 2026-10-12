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
import { parseApiError, toastApiError } from "@/src/lib/api-error";
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
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import {
  buildEcommerceProductBody,
  productRowToFormInput,
  saveActionLabel,
  type ProductFormInput,
} from "@/src/lib/ecommerce-product-form";

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
  const defaultTax = tax.data?.defaultClassification ?? "";
  const [form, setForm] = useState<ProductFormInput>(() =>
    productRowToFormInput(product, defaultTax),
  );
  const [recordVersion, setRecordVersion] = useState(product?.version ?? 1);
  const [createProduct] = useCreateEcommerceProductMutation();
  const [patchProduct] = usePatchEcommerceProductMutation();
  const [publishProduct] = usePublishEcommerceProductMutation();
  const [archiveProduct] = useArchiveEcommerceProductMutation();
  const [presignUpload] = usePresignUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();
  const [fetchPreview, previewState] = useLazyPreviewEcommerceProductPriceQuery();
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [preview, setPreview] = useState<Record<string, unknown> | null>(
    product?.pricing ?? null,
  );

  const patchForm = (patch: Partial<ProductFormInput>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const activeCategories = (categories.data?.items ?? []).filter(
    (c: { active?: boolean }) => c.active !== false,
  );

  async function refreshPreview(productId: string) {
    try {
      const data = await fetchPreview({ productId }).unwrap();
      setPreview(data);
    } catch {
      /* optional */
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
      patchForm({ imageUploadIds: [...form.imageUploadIds, uploadId] });
      toast.success("Image uploaded");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function persistProduct(opts?: { publishAfter?: boolean }) {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    setFieldError(undefined);
    let body: Record<string, unknown>;
    try {
      body = buildEcommerceProductBody(form);
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Invalid form");
      return;
    }
    try {
      let row = product;
      if (row?.id) {
        row = await patchProduct({
          productId: row.id,
          body: { ...body, expectedVersion: recordVersion },
        }).unwrap();
      } else {
        row = await createProduct(body).unwrap();
      }
      setRecordVersion(row.version);
      setPreview(row.pricing ?? preview);
      if (opts?.publishAfter) {
        row = await publishProduct({
          productId: row.id,
          expectedVersion: row.version,
        }).unwrap();
        setRecordVersion(row.version);
        setPreview(row.pricing ?? preview);
        toast.success("Published");
        onSaved?.();
        onOpenChange(false);
        return;
      }
      await refreshPreview(row.id);
      toast.success(form.status === "PUBLISHED" ? "Changes saved" : "Draft saved");
      onSaved?.();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.code === "VERSION_CONFLICT") {
        setFieldError("This product was updated elsewhere. Close and reopen to refresh.");
      }
      toastApiError(err);
    }
  }

  async function archive() {
    if (!product?.id) return;
    try {
      await archiveProduct({
        productId: product.id,
        expectedVersion: recordVersion,
      }).unwrap();
      toast.success("Archived");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toastApiError(err);
    }
  }

  const isArchived = form.status === "ARCHIVED";

  return (
    <>
      <DialogContent className={`${dialogScrollShellClass} sm:max-w-4xl`}>
        <DialogBody className="overflow-y-auto pb-2">
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-2xl">{product?.id ? "Edit jewellery" : "Add jewellery"}</DialogTitle>
            <DialogDescription>
              Fill in the essentials, set the price, then upload images. The server verifies the price before publication.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!entitled ? (
              <p className="text-sm text-amber-800">{disabledMessage}</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 border-b pb-2"><h3 className="font-semibold text-[#4c2631]">Product details</h3><p className="text-xs text-muted-foreground">Name, category and the information customers will see.</p></div>
              <div>
                <FieldLabel>Name</FieldLabel>
                <Input value={form.name} onChange={(e) => patchForm({ name: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <Input value={form.slug} onChange={(e) => patchForm({ slug: e.target.value })} />
              </div>
              <div>
                <FieldLabel>SKU</FieldLabel>
                <Input value={form.sku} onChange={(e) => patchForm({ sku: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={form.categoryId || "__none"}
                  onValueChange={(v) => patchForm({ categoryId: v === "__none" ? "" : v })}
                >
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
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.status === "ARCHIVED" ? "DRAFT" : form.status}
                  disabled={isArchived}
                  onValueChange={(v) =>
                    patchForm({ status: v as ProductFormInput["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="featured"
                  type="checkbox"
                  checked={form.featured}
                  disabled={!entitled}
                  onChange={(e) => patchForm({ featured: e.target.checked })}
                />
                <label htmlFor="featured" className="text-sm">
                  Featured on storefront
                </label>
              </div>
              <div className="sm:col-span-2 border-b pb-2 pt-3"><h3 className="font-semibold text-[#4c2631]">Pricing & tax</h3><p className="text-xs text-muted-foreground">Choose a fixed price or calculate from gold weight and purity.</p></div>
              <div>
                <FieldLabel>Price mode</FieldLabel>
                <Select
                  value={form.priceMode}
                  onValueChange={(v) =>
                    patchForm({ priceMode: v as ProductFormInput["priceMode"] })
                  }
                >
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
                <Select
                  value={form.taxClassification || "__none"}
                  onValueChange={(v) =>
                    patchForm({ taxClassification: v === "__none" ? "" : v })
                  }
                >
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
              {form.priceMode === "FIXED" ? (
                <>
                  <div>
                    <FieldLabel>Base price (₹)</FieldLabel>
                    <Input
                      value={form.baseRupee}
                      onChange={(e) => patchForm({ baseRupee: e.target.value })}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <FieldLabel>Sale price (₹, optional)</FieldLabel>
                    <Input
                      value={form.saleRupee}
                      onChange={(e) => patchForm({ saleRupee: e.target.value })}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <FieldLabel>Sale starts</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={form.saleStartsAt}
                      onChange={(e) => patchForm({ saleStartsAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Sale ends</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={form.saleEndsAt}
                      onChange={(e) => patchForm({ saleEndsAt: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel>Purity</FieldLabel>
                    <Select value={form.purity} onValueChange={(v) => patchForm({ purity: v })}>
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
                    <Input
                      value={form.weightGrams}
                      onChange={(e) => patchForm({ weightGrams: e.target.value })}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <FieldLabel>Making charge mode</FieldLabel>
                    <Select
                      value={form.makingChargeMode}
                      onValueChange={(v) =>
                        patchForm({
                          makingChargeMode: v as ProductFormInput["makingChargeMode"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED_PAISE">Fixed (₹)</SelectItem>
                        <SelectItem value="PER_GRAM_PAISE">Per gram (₹)</SelectItem>
                        <SelectItem value="PERCENT_OF_GOLD">Percent of gold (bps)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.makingChargeMode === "FIXED_PAISE" ? (
                    <div>
                      <FieldLabel>Making charge (₹)</FieldLabel>
                      <Input
                        value={form.makingFixedRupee}
                        onChange={(e) => patchForm({ makingFixedRupee: e.target.value })}
                      />
                    </div>
                  ) : form.makingChargeMode === "PER_GRAM_PAISE" ? (
                    <div>
                      <FieldLabel>Making per gram (₹)</FieldLabel>
                      <Input
                        value={form.makingPerGramRupee}
                        onChange={(e) => patchForm({ makingPerGramRupee: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div>
                      <FieldLabel>Making percent (bps)</FieldLabel>
                      <Input
                        value={form.makingPercentBps}
                        onChange={(e) => patchForm({ makingPercentBps: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <FieldLabel>Other charges (₹)</FieldLabel>
                    <Input
                      value={form.otherChargesRupee}
                      onChange={(e) => patchForm({ otherChargesRupee: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Stone lines</FieldLabel>
                    <div className="space-y-2">
                      {form.stones.map((row, index) => (
                        <div key={`stone-${index}`} className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={row.name}
                            onChange={(e) => {
                              const stones = [...form.stones];
                              stones[index] = { ...stones[index], name: e.target.value };
                              patchForm({ stones });
                            }}
                          />
                          <Input
                            placeholder="Charge ₹"
                            value={row.chargeRupee}
                            onChange={(e) => {
                              const stones = [...form.stones];
                              stones[index] = { ...stones[index], chargeRupee: e.target.value };
                              patchForm({ stones });
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          patchForm({ stones: [...form.stones, { name: "", chargeRupee: "" }] })
                        }
                      >
                        Add stone line
                      </Button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Offer type</FieldLabel>
                    <Select
                      value={form.offerType || "__none"}
                      onValueChange={(v) =>
                        patchForm({
                          offerType: v === "__none" ? "" : (v as ProductFormInput["offerType"]),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        <SelectItem value="FIXED_PAISE_OFF">Fixed off making (₹)</SelectItem>
                        <SelectItem value="PERCENT_OFF">Percent off making (bps)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.offerType === "FIXED_PAISE_OFF" ? (
                    <div>
                      <FieldLabel>Offer amount (₹)</FieldLabel>
                      <Input
                        value={form.offerValueRupee}
                        onChange={(e) => patchForm({ offerValueRupee: e.target.value })}
                      />
                    </div>
                  ) : null}
                  {form.offerType === "PERCENT_OFF" ? (
                    <div>
                      <FieldLabel>Offer percent (bps)</FieldLabel>
                      <Input
                        value={form.offerPercentBps}
                        onChange={(e) => patchForm({ offerPercentBps: e.target.value })}
                      />
                    </div>
                  ) : null}
                  {form.offerType ? (
                    <>
                      <div>
                        <FieldLabel>Offer starts</FieldLabel>
                        <Input
                          type="datetime-local"
                          value={form.offerStartsAt}
                          onChange={(e) => patchForm({ offerStartsAt: e.target.value })}
                        />
                      </div>
                      <div>
                        <FieldLabel>Offer ends</FieldLabel>
                        <Input
                          type="datetime-local"
                          value={form.offerEndsAt}
                          onChange={(e) => patchForm({ offerEndsAt: e.target.value })}
                        />
                      </div>
                    </>
                  ) : null}
                </>
              )}
              <div className="sm:col-span-2">
                <div className="border-b pb-2 pt-3"><h3 className="font-semibold text-[#4c2631]">Product images</h3><p className="text-xs text-muted-foreground">The first image is the cover photo on the customer shop.</p></div>
                <FieldLabel>Upload image</FieldLabel>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!entitled}
                  onChange={(e) => {
                    void handleImagePick(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.imageUploadIds.map((id, index) => (
                    <div key={id} className="relative aspect-square overflow-hidden rounded-lg border">
                      <EcommerceCatalogImage uploadId={id} channel="admin" alt="" fill className="rounded-lg" />
                      <div className="absolute left-1 top-1 flex flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          disabled={index === 0}
                          onClick={() => {
                            const next = [...form.imageUploadIds];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            patchForm({ imageUploadIds: next });
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2 text-xs"
                          disabled={index === form.imageUploadIds.length - 1}
                          onClick={() => {
                            const next = [...form.imageUploadIds];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            patchForm({ imageUploadIds: next });
                          }}
                        >
                          ↓
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="absolute right-1 top-1 h-7 px-2 text-xs"
                        onClick={() =>
                          patchForm({
                            imageUploadIds: form.imageUploadIds.filter((x) => x !== id),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <FormFieldError message={fieldError} />
            <div className="mt-6 rounded-2xl bg-[#faf6f1] p-5">
              <p className="mb-2 font-semibold text-[#4c2631]">Server pricing preview</p>
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
          {form.status === "PUBLISHED" && !isArchived ? (
            <Button type="button" variant="secondary" disabled={!entitled} onClick={archive}>
              Archive
            </Button>
          ) : null}
          {!isArchived ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={!entitled}
                onClick={() => persistProduct()}
              >
                {saveActionLabel(form.status)}
              </Button>
              {form.status !== "PUBLISHED" ? (
                <Button type="button" disabled={!entitled} onClick={() => persistProduct({ publishAfter: true })}>
                  Publish
                </Button>
              ) : null}
            </>
          ) : null}
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
          key={`${product?.id ?? "new"}|${product?.version ?? 0}|${defaultTax}`}
          product={product}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}
