"use client";

import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
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
import {
  EcommerceCatalogNav,
  EcommerceSettingsHint,
} from "@/src/features/ecommerce/ecommerce-settings-ui";
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active?: boolean;
  version: number;
  imageUploadId?: string | null;
  displayOrder?: number;
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
  const [displayOrder, setDisplayOrder] = useState("0");
  const [imageUploadId, setImageUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = (query.data?.items ?? []) as CategoryRow[];

  function openCreate() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setDisplayOrder("0");
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

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Collections & categories"
        description="Archiving a category hides its published products from the shop until they are recategorised."
        actions={
          <Button type="button" disabled={!entitled} onClick={openCreate}>
            <Plus className="mr-2 size-4" /> New category
          </Button>
        }
      />
      {!entitled ? (
        <p className="mb-4 text-sm text-amber-800">{disabledMessage}</p>
      ) : null}
      <EcommerceCatalogNav />
      <EcommerceSettingsHint icon={FolderOpen} title="Organise your storefront">
        Only active categories appear in the customer shop. Archiving a category hides its published
        products until you move them or reactivate the category.
      </EcommerceSettingsHint>
      <Surface title={`Categories (${items.length})`} className="mt-5">
        <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <li key={c.id} className="overflow-hidden rounded-[1.25rem] border border-[#ede4dc] bg-white text-sm shadow-sm">
              <div className="relative aspect-[16/9] bg-[#f8f2eb]">
                    <EcommerceCatalogImage
                      uploadId={c.imageUploadId ?? undefined}
                      channel="admin"
                      alt={c.name}
                      fill
                    />
              </div>
              <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#33262a]">{c.name}</p><p className="mt-1 text-xs text-muted-foreground">/{c.slug}</p></div>
                <StatusBadge status={c.active ? "ACTIVE" : "INACTIVE"} />
              </div>
              {c.description ? <p className="line-clamp-2 min-h-9 text-xs leading-5 text-[#71686a]">{c.description}</p> : null}
              <div className="flex items-center gap-2 border-t border-[#f1eae4] pt-3">
                <Button type="button" size="sm" variant="outline" disabled={!entitled} onClick={() => openEdit(c)}>
                  Edit category
                </Button>
                {c.active ? (
                  <Button type="button" size="sm" variant="secondary" disabled={!entitled} onClick={() => archive(c)}>
                    Archive
                  </Button>
                ) : null}
              </div>
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="col-span-full px-6 py-12 text-center text-muted-foreground"><FolderOpen className="mx-auto mb-3 size-9 text-[#b99466]" />No categories yet. Create one to organise your jewellery.</li>
          ) : null}
        </ul>
      </Surface>

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
    </>
  );
}
