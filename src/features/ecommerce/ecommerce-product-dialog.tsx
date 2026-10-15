"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  useLazyGetEcommerceProductQuery,
} from "@/src/store/api/admin-api";
import { PricingPreviewPanel } from "@/src/features/ecommerce/ecommerce-shared";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { Switch } from "@/components/ui/switch";
import { useAppSelector } from "@/src/store/hooks";
import { hasPermission } from "@/src/lib/permissions";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import {
  buildEcommerceProductBody,
  productRowToFormInput,
  productScheduleOriginsFromRow,
  saveActionLabel,
  type ProductFormInput,
  type ProductFormScheduleOrigins,
} from "@/src/lib/ecommerce-product-form";
import { DATETIME_LOCAL_TIMEZONE_LABEL } from "@/src/lib/datetime-local";

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
  const [editorProduct, setEditorProduct] = useState<ProductRow | null>(() => product ?? null);
  const [form, setForm] = useState<ProductFormInput>(() =>
    productRowToFormInput(product, defaultTax),
  );
  const [recordVersion, setRecordVersion] = useState(product?.version ?? 1);
  const persistInFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const serverStatus =
    (editorProduct?.status as ProductFormInput["status"] | undefined) ??
    (product?.status as ProductFormInput["status"] | undefined) ??
    "DRAFT";
  const editingProductId = editorProduct?.id ?? product?.id ?? null;

  useEffect(() => {
    setEditorProduct(product ?? null);
    setForm(productRowToFormInput(product, defaultTax));
    setScheduleOrigins(productScheduleOriginsFromRow(product));
    setRecordVersion(product?.version ?? 1);
    setConflictDraft(null);
    setConflictOpen(false);
    setFieldError(undefined);
  }, [product?.id]);
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
  const user = useAppSelector((s) => s.session.session?.user);
  const canSendMessage = hasPermission(user, "message.send");
  const [notifyNewArrival, setNotifyNewArrival] = useState(false);
  const [notifyOffer, setNotifyOffer] = useState(false);
  const [scheduleOrigins, setScheduleOrigins] = useState<ProductFormScheduleOrigins>(() =>
    productScheduleOriginsFromRow(product),
  );
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictDraft, setConflictDraft] = useState<ProductFormInput | null>(null);
  const [discardDraftOpen, setDiscardDraftOpen] = useState(false);
  const [fetchProduct] = useLazyGetEcommerceProductQuery();

  function describePromotion(promo: Record<string, unknown> | undefined) {
    if (!promo) return;
    if (promo.enqueued === true || promo.queued === true) {
      toast.success("Notification queued for delivery");
    } else if (promo.intentPersisted === true && promo.enqueueError) {
      toast.message("Notification saved — delivery pending", {
        description: "The server will retry sending in the background.",
      });
    } else if (promo.scheduled === true) {
      toast.message("Notification scheduled", {
        description: "It will send when the offer or sale starts.",
      });
    } else if (promo.reason) {
      toast.message("Notification not sent", { description: String(promo.reason) });
    } else if (promo.duplicate) {
      toast.message("Notification already queued");
    }
  }

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
    if (persistInFlight.current) return;
    persistInFlight.current = true;
    setSaving(true);
    setFieldError(undefined);
    let body: Record<string, unknown>;
    try {
      body = buildEcommerceProductBody(form, scheduleOrigins);
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Invalid form");
      persistInFlight.current = false;
      setSaving(false);
      return;
    }
    try {
      let row: ProductRow;
      if (editingProductId) {
        const patchBody: Record<string, unknown> = { ...body, expectedVersion: recordVersion };
        if (notifyOffer && canSendMessage && serverStatus === "PUBLISHED") {
          patchBody.notification = { enabled: true, kind: "OFFER" };
        }
        row = await patchProduct({
          productId: editingProductId,
          body: patchBody,
        }).unwrap();
        describePromotion(row.promotion as Record<string, unknown> | undefined);
      } else {
        row = await createProduct(body).unwrap();
      }
      setEditorProduct(row);
      setRecordVersion(row.version);
      setForm((prev) => ({
        ...prev,
        status: (row.status as ProductFormInput["status"]) ?? prev.status,
      }));
      setScheduleOrigins(productScheduleOriginsFromRow(row));
      setPreview(row.pricing ?? preview);
      if (opts?.publishAfter) {
        try {
          row = await publishProduct({
            productId: row.id,
            expectedVersion: row.version,
            ...(notifyNewArrival && canSendMessage
              ? {
                  notification: { enabled: true },
                  idempotencyKey: newIdempotencyKey(),
                }
              : {}),
          }).unwrap();
          setEditorProduct(row);
          setRecordVersion(row.version);
          setForm((prev) => ({
            ...prev,
            status: (row.status as ProductFormInput["status"]) ?? "PUBLISHED",
          }));
          setPreview(row.pricing ?? preview);
          toast.success("Published");
          describePromotion(row.promotion as Record<string, unknown> | undefined);
          setScheduleOrigins(productScheduleOriginsFromRow(row));
          onSaved?.();
          onOpenChange(false);
          return;
        } catch (publishErr) {
          const parsed = parseApiError(publishErr);
          if (parsed.code === "VERSION_CONFLICT") {
            setConflictDraft({ ...form });
            setConflictOpen(true);
            setFieldError(
              "Publish conflict — your draft is saved. Load the latest version, review, then publish again.",
            );
          }
          toastApiError(publishErr);
          return;
        }
      }
      await refreshPreview(row.id);
      toast.success(serverStatus === "PUBLISHED" ? "Changes saved" : "Draft saved");
      onSaved?.();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.code === "VERSION_CONFLICT") {
        setConflictDraft({ ...form });
        setConflictOpen(true);
        setFieldError(
          "This product was updated elsewhere. Reload the latest version, review your edits, then save again.",
        );
      }
      toastApiError(err);
    } finally {
      persistInFlight.current = false;
      setSaving(false);
    }
  }

  async function reloadProductAfterConflict(discardDraft = false) {
    if (!editingProductId) {
      setConflictOpen(false);
      return;
    }
    try {
      const savedDraft = discardDraft ? null : conflictDraft;
      const latest = await fetchProduct({ productId: editingProductId }).unwrap();
      const latestForm = productRowToFormInput(latest, defaultTax);
      setForm(latestForm);
      setScheduleOrigins(productScheduleOriginsFromRow(latest));
      setEditorProduct(latest);
      setRecordVersion(latest.version ?? recordVersion);
      setPreview(latest.pricing ?? preview);
      setFieldError(undefined);
      setConflictOpen(false);
      if (savedDraft && !discardDraft) {
        toast.message("Latest version loaded", {
          description: "Your previous edits were kept in memory — reapply fields manually before saving.",
        });
        setConflictDraft(savedDraft);
      } else {
        setConflictDraft(null);
        toast.message("Loaded latest product version");
      }
    } catch (err) {
      toastApiError(err);
    }
  }

  function reapplyConflictDraft() {
    if (!conflictDraft) return;
    setForm(conflictDraft);
    toast.message("Restored your draft edits", {
      description: "Compare with the loaded server version, then save using the current version number.",
    });
  }

  async function archive() {
    if (!editingProductId) return;
    try {
      await archiveProduct({
        productId: editingProductId,
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
            <DialogTitle className="font-serif text-2xl">
              {editingProductId ? "Edit jewellery" : "Add jewellery"}
            </DialogTitle>
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
                  value={serverStatus === "ARCHIVED" ? "DRAFT" : serverStatus}
                  disabled={isArchived || serverStatus === "PUBLISHED"}
                  onValueChange={(v) =>
                    patchForm({ status: v as ProductFormInput["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    {serverStatus === "PUBLISHED" ? (
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    ) : null}
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
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Schedule times use {DATETIME_LOCAL_TIMEZONE_LABEL}.
                  </p>
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
            {conflictDraft && !conflictOpen ? (
              <div
                className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                data-testid="product-conflict-recovery-panel"
              >
                <p className="font-semibold">Unsaved draft preserved</p>
                <p className="mt-1 text-xs">
                  The editor shows the latest server version. Your previous edits are kept separately —
                  reapply them after reviewing, then save with the current version ({recordVersion}).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={reapplyConflictDraft}>
                    Reapply my draft
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDiscardDraftOpen(true)}
                  >
                    Discard draft
                  </Button>
                </div>
              </div>
            ) : null}
            {canSendMessage && serverStatus !== "PUBLISHED" && !isArchived ? (
              <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3">
                <div>
                  <p className="font-semibold text-[#28161a]">New-arrival push (optional)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send one FCM when this product is published for the first time. Default off.
                  </p>
                </div>
                <Switch checked={notifyNewArrival} onCheckedChange={setNotifyNewArrival} />
              </div>
            ) : null}
            {canSendMessage && serverStatus === "PUBLISHED" && !isArchived ? (
              <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#eaded9] bg-[#faf7f5] px-4 py-3">
                <div>
                  <p className="font-semibold text-[#28161a]">Offer push (optional)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When you save pricing/offer changes, queue an offer notification. Default off.
                  </p>
                </div>
                <Switch checked={notifyOffer} onCheckedChange={setNotifyOffer} />
              </div>
            ) : null}
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
          {serverStatus === "PUBLISHED" && !isArchived ? (
            <Button type="button" variant="secondary" disabled={!entitled} onClick={archive}>
              Archive
            </Button>
          ) : null}
          {!isArchived ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={!entitled || saving}
                onClick={() => persistProduct()}
              >
                {saveActionLabel(serverStatus)}
              </Button>
              {serverStatus !== "PUBLISHED" ? (
                <Button
                  type="button"
                  disabled={!entitled || saving}
                  onClick={() => persistProduct({ publishAfter: true })}
                >
                  Publish
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <AlertDialogContent data-testid="product-version-conflict-alert">
          <AlertDialogHeader>
            <AlertDialogTitle>Product updated elsewhere</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved edits are preserved. Load the latest server version to review, optionally
              reapply your draft, then save with the updated version number. Times use{" "}
              {DATETIME_LOCAL_TIMEZONE_LABEL}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            {conflictDraft ? (
              <Button type="button" variant="secondary" onClick={reapplyConflictDraft}>
                Reapply my draft
              </Button>
            ) : null}
            <AlertDialogAction onClick={() => void reloadProductAfterConflict(false)}>
              Load latest version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={discardDraftOpen} onOpenChange={setDiscardDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard preserved draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your unsaved edits from memory. The loaded server version stays in the
              editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConflictDraft(null);
                setDiscardDraftOpen(false);
                toast.message("Draft discarded");
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
