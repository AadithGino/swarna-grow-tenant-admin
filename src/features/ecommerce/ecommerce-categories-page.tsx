"use client";

import { useState } from "react";
import { Archive, BellRing, FolderOpen, Layers3, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel, PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ListPanel } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toastApiError } from "@/src/lib/api-error";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useArchiveEcommerceCategoryMutation,
  useCompleteUploadMutation,
  useCreateEcommerceCategoryMutation,
  useGetEcommerceCategoriesQuery,
  usePatchEcommerceCategoryMutation,
  usePresignUploadMutation,
} from "@/src/store/api/admin-api";
import { useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { EcommercePromotionComposerDialog } from "@/src/features/ecommerce/ecommerce-promotion-composer-dialog";
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
  version: number;
  imageUploadId?: string | null;
  displayOrder?: number;
  schemePurchaseAllowed?: boolean;
};

export function EcommerceCategoriesPage() {
  const query = useGetEcommerceCategoriesQuery(undefined);
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [createCategory] = useCreateEcommerceCategoryMutation();
  const [patchCategory] = usePatchEcommerceCategoryMutation();
  const [archiveCategory] = useArchiveEcommerceCategoryMutation();
  const [presignUpload] = usePresignUploadMutation();
  const [completeUpload] = useCompleteUploadMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [schemePurchaseAllowed, setSchemePurchaseAllowed] = useState(false);
  const [displayOrder, setDisplayOrder] = useState("0");
  const [imageUploadId, setImageUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [statusView, setStatusView] = useState("ALL");
  const [notifyTarget, setNotifyTarget] = useState<{
    kind: "category";
    categoryId: string;
    label: string;
  } | null>(null);

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = (query.data?.items ?? []) as CategoryRow[];

  function openCreate() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setDisplayOrder("0");
    setSchemePurchaseAllowed(false);
    setImageUploadId(null);
    setError(undefined);
    setDialogOpen(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setDisplayOrder(String(row.displayOrder ?? 0));
    setSchemePurchaseAllowed(row.schemePurchaseAllowed === true);
    setImageUploadId(row.imageUploadId ?? null);
    setError(undefined);
    setDialogOpen(true);
  }

  async function onImagePick(file: File | null) {
    if (!file || !entitled) return;
    try {
      const id = await uploadFileViaPresign(
        file,
        (input) => presignUpload(input).unwrap(),
        "ECOMMERCE_CATEGORY_IMAGE",
        (uploadId) => completeUpload(uploadId).unwrap(),
      );
      setImageUploadId(id);
      toast.success("Image ready");
    } catch (err) {
      toastApiError(err);
    }
  }

  async function save() {
    if (!entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    setError(undefined);
    const body = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description,
      displayOrder: Number(displayOrder) || 0,
      schemePurchaseAllowed,
      imageUploadId: imageUploadId ?? undefined,
    };
    try {
      if (editing) {
        await patchCategory({
          categoryId: editing.id,
          body: { ...body, expectedVersion: editing.version },
        }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory(body).unwrap();
        toast.success("Category created");
      }
      setDialogOpen(false);
      query.refetch();
    } catch (err) {
      toastApiError(err);
      setError("Save failed — refresh if you see a version conflict.");
      throw err;
    }
  }

  async function archive(row: CategoryRow) {
    if (!entitled) return;
    try {
      await archiveCategory({
        categoryId: row.id,
        expectedVersion: row.version,
      }).unwrap();
      toast.success("Category archived — published products in this category are hidden on the storefront.");
      query.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const needle = search.trim().toLowerCase();
  const visible = items
    .filter(
      (c) =>
        (statusView === "ALL" || (statusView === "ACTIVE" ? c.active : !c.active)) &&
        (!needle || `${c.name} ${c.slug}`.toLowerCase().includes(needle)),
    )
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  const activeCount = items.filter((c) => c.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={Layers3}
        title="Categories"
        description="Collections customers browse in your shop. Archiving one hides its published products until they're moved."
        actions={
          <Button type="button" className="rounded-xl" disabled={!entitled} onClick={openCreate}>
            <Plus /> New category
          </Button>
        }
      />
      {!entitled ? <Notice tone="amber">{disabledMessage}</Notice> : null}
      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={statusView}
                onChange={setStatusView}
                options={[
                  { value: "ALL", label: "All", count: items.length },
                  { value: "ACTIVE", label: "In shop", count: activeCount },
                  { value: "ARCHIVED", label: "Archived", count: items.length - activeCount },
                ]}
                ariaLabel="Category status"
              />
            }
            search={<FilterSearch value={search} onChange={setSearch} placeholder="Search name or slug" />}
            resultLabel={`${visible.length} categories · sorted by display order`}
          />
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={items.length ? "No categories match" : "No categories yet"}
            detail={items.length ? "Try another filter." : "Create one to organise your jewellery — e.g. Rings, Necklaces, Coins."}
            action={!items.length ? <Button disabled={!entitled} onClick={openCreate}>New category</Button> : undefined}
          />
        ) : (
          <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((c) => (
              <li
                key={c.id}
                className={`group overflow-hidden rounded-[1.15rem] border bg-white text-sm transition-shadow hover:shadow-[0_14px_30px_-22px_rgb(67_15_25/45%)] ${c.active ? "border-[#ebe1dc]" : "border-dashed border-[#e0d3cf]"}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[#f8f2eb]">
                  <EcommerceCatalogImage
                    uploadId={c.imageUploadId ?? undefined}
                    channel="admin"
                    alt={c.name}
                    fill
                    className={`transition-transform duration-500 group-hover:scale-[1.03] ${c.active ? "" : "grayscale"}`}
                  />
                  <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold drop-shadow">{c.name}</p>
                      <p className="text-xs text-white/80">/{c.slug}</p>
                    </div>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">#{c.displayOrder ?? 0}</span>
                  </div>
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={c.active ? "ACTIVE" : "ARCHIVED"} label={c.active ? "In shop" : "Archived"} />
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="line-clamp-2 min-h-10 text-[0.84rem] leading-5 text-[#71686a]">{c.description || "No description yet."}</p>
                  <div className="flex items-center gap-2 border-t border-[#f3eae7] pt-3">
                    <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={!entitled} onClick={() => openEdit(c)}>
                      <Pencil /> Edit
                    </Button>
                    {c.active ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          disabled={!entitled}
                          onClick={() => setNotifyTarget({ kind: "category", categoryId: c.id, label: c.name })}
                        >
                          <BellRing /> Notify
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="ml-auto rounded-lg text-[#8a7c80]" disabled={!entitled} onClick={() => archive(c)}>
                          <Archive /> Archive
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListPanel>

      <ActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit category" : "New category"}
        actionLabel="Save"
        submitDisabled={!entitled}
        onSubmit={save}
      >
        <div className="grid gap-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Slug</FieldLabel>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Display order</FieldLabel>
            <Input value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} inputMode="numeric" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={schemePurchaseAllowed} onChange={(e) => setSchemePurchaseAllowed(e.target.checked)} />
            Allow matured scheme purchases by default
          </label>
          <div>
            <FieldLabel>Category image</FieldLabel>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!entitled}
              onChange={(e) => {
                void onImagePick(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {imageUploadId ? (
              <div className="relative mt-2 aspect-video max-w-xs overflow-hidden rounded-lg border">
                <EcommerceCatalogImage
                  uploadId={imageUploadId}
                  channel="admin"
                  alt=""
                  fill
                  className="rounded-lg"
                />
              </div>
            ) : null}
          </div>
          <FormFieldError message={error} />
        </div>
      </ActionDialog>
      <EcommercePromotionComposerDialog
        target={notifyTarget}
        open={Boolean(notifyTarget)}
        onOpenChange={(open) => {
          if (!open) setNotifyTarget(null);
        }}
        onSent={() => query.refetch()}
      />
    </div>
  );
}
