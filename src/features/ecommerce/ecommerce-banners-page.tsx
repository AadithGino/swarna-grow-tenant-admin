"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EcommerceBannerEditorDialog,
  type BannerPickerUiState,
} from "@/src/features/ecommerce/ecommerce-banner-editor-dialog";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ListPanel } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, FilterSelect, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { parseApiError, toastApiError } from "@/src/lib/api-error";
import { uploadFileViaPresign } from "@/src/lib/upload-via-presign";
import {
  useArchiveEcommerceBannerMutation,
  useCompleteEcommerceUploadMutation,
  useCreateEcommerceBannerMutation,
  useGetEcommerceBannersQuery,
  useLazyGetEcommerceBannersQuery,
  useLazyGetEcommerceCategoriesQuery,
  useLazyGetEcommerceCategoryQuery,
  useLazyGetEcommerceProductQuery,
  useLazyGetEcommerceProductsQuery,
  usePatchEcommerceBannerMutation,
  usePresignEcommerceUploadMutation,
  usePublishEcommerceBannerMutation,
  useUnpublishEcommerceBannerMutation,
} from "@/src/store/api/admin-api";
import {
  formatUtcIsoForDisplay,
  utcIsoToDatetimeLocalValue,
} from "@/src/lib/datetime-local";
import {
  bannerCustomerVisibilityHint,
  bannerEffectiveStatus,
  bannerEffectiveStatusLabel,
} from "@/src/lib/banner-admin-utils";
import { createPickerSessionGuard } from "@/src/lib/banner-picker-session";
import { useBannerImageUpload } from "@/src/hooks/use-banner-image-upload";
import { buildBannerSaveBody } from "@/src/lib/banner-save-body";
import {
  applyBannerUpdate,
  bannerListFilterKey,
  mergeBannerRowsForView,
  mergeExtraBannerPage,
  resolveNextBannerCursor,
  shouldApplyLoadMoreResult,
  tailAfterLoadedPage,
} from "@/src/lib/banner-admin-list-state";
import type { PickerRow } from "@/src/lib/banner-destination-picker";
import { useEcommerceAdminAccess, useEcommerceCatalogWrite } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { cn } from "@/lib/utils";
import {
  BANNER_IMAGE_ARTWORK_HINT,
  BANNER_SIGNED_URL_REVOCATION_HINT,
  CUSTOMER_PROMO_RAIL_FRAME,
  CUSTOMER_PROMO_SECTION_TITLE,
  ECOMMERCE_BANNER_PLACEMENTS,
  bannerCustomerSurfaces,
  compareBannerDisplayOrder,
  formatBannerDestinationLabel,
  placementMeta,
} from "@/src/lib/ecommerce-banner-surfaces";

type BannerRow = {
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

function publishBlockers(row: Partial<BannerRow>): string[] {
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

export function EcommerceBannersPage() {
  const access = useEcommerceAdminAccess();
  const { entitled, disabledMessage } = useEcommerceCatalogWrite();
  const [listStatusFilter, setListStatusFilter] = useState<string>("ALL");
  const [listPlacementFilter, setListPlacementFilter] = useState<string>("ALL");
  const listQueryArgs = useMemo(
    () => ({
      limit: 50,
      ...(listStatusFilter !== "ALL" ? { status: listStatusFilter } : {}),
      ...(listPlacementFilter !== "ALL" ? { placement: listPlacementFilter } : {}),
    }),
    [listPlacementFilter, listStatusFilter],
  );
  const query = useGetEcommerceBannersQuery(listQueryArgs, { skip: !access.canRead });
  const [fetchMoreBanners, fetchMoreBannersState] = useLazyGetEcommerceBannersQuery();
  const [extraBannerRows, setExtraBannerRows] = useState<BannerRow[]>([]);
  const [tailPagination, setTailPagination] = useState<"idle" | "exhausted" | string>("idle");
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);

  const [fetchCategories] = useLazyGetEcommerceCategoriesQuery();
  const [fetchProducts] = useLazyGetEcommerceProductsQuery();
  const [fetchProductById] = useLazyGetEcommerceProductQuery();
  const [pickerCategories, setPickerCategories] = useState<PickerRow[]>([]);
  const [pickerProducts, setPickerProducts] = useState<PickerRow[]>([]);
  const [categoryPickerState, setCategoryPickerState] = useState<BannerPickerUiState>("idle");
  const [productPickerState, setProductPickerState] = useState<BannerPickerUiState>("idle");
  const [categoryPickerError, setCategoryPickerError] = useState<string | null>(null);
  const [productPickerError, setProductPickerError] = useState<string | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<{
    id: string;
    name: string;
    active?: boolean;
  } | null>(null);
  const [pinnedProduct, setPinnedProduct] = useState<{
    id: string;
    name: string;
    status?: string;
  } | null>(null);
  const [productPickerCursor, setProductPickerCursor] = useState<string | null>(null);
  const [productPickerLoadingMore, setProductPickerLoadingMore] = useState(false);
  const [productPickerFilter, setProductPickerFilter] = useState("");
  const [categoryTargetLoading, setCategoryTargetLoading] = useState(false);
  const [categoryTargetError, setCategoryTargetError] = useState<string | null>(null);
  const [productTargetLoading, setProductTargetLoading] = useState(false);
  const [productTargetError, setProductTargetError] = useState<string | null>(null);
  const pickerSession = useRef(createPickerSessionGuard()).current;
  const categoryLoadGen = useRef(0);
  const productLoadGen = useRef(0);
  const productLoadMoreGen = useRef(0);
  const loadMoreGen = useRef(0);
  const listMutationGen = useRef(0);
  const listFilterKey = bannerListFilterKey(listQueryArgs);
  const listFilters = useMemo(
    () => ({ status: listStatusFilter, placement: listPlacementFilter }),
    [listPlacementFilter, listStatusFilter],
  );
  const [fetchCategoryById] = useLazyGetEcommerceCategoryQuery();

  const [createBanner] = useCreateEcommerceBannerMutation();
  const [patchBanner] = usePatchEcommerceBannerMutation();
  const [publishBanner] = usePublishEcommerceBannerMutation();
  const [unpublishBanner] = useUnpublishEcommerceBannerMutation();
  const [archiveBanner] = useArchiveEcommerceBannerMutation();
  const [presignUpload] = usePresignEcommerceUploadMutation();
  const [completeUpload] = useCompleteEcommerceUploadMutation();

  const [open, setOpen] = useState(false);
  const [bannerSearch, setBannerSearch] = useState("");
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [placement, setPlacement] = useState<string>("HOME");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [destinationType, setDestinationType] = useState<string>("NONE");
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [targetProductId, setTargetProductId] = useState<string>("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const imageUpload = useBannerImageUpload({
    upload: (file) =>
      uploadFileViaPresign(
        file,
        (input) => presignUpload(input).unwrap(),
        "ECOMMERCE_BANNER_IMAGE",
        (uploadId) => completeUpload(uploadId).unwrap(),
      ),
  });
  const { imageUploadId } = imageUpload;

  const loadCategories = useCallback(async () => {
    if (!access.canRead) return;
    const session = pickerSession.current();
    const gen = ++categoryLoadGen.current;
    setCategoryPickerState("loading");
    setCategoryPickerError(null);
    try {
      const acc: PickerRow[] = [];
      let cursor: string | undefined;
      do {
        const page = await fetchCategories({ limit: 100, cursor, activeOnly: true }).unwrap();
        if (!pickerSession.isCurrent(session) || gen !== categoryLoadGen.current) return;
        for (const row of page.items ?? []) {
          acc.push({
            id: String(row.id),
            name: String(row.name ?? ""),
            active: row.active !== false,
          });
        }
        cursor = (page.meta?.nextCursor as string | undefined) ?? undefined;
      } while (cursor);
      if (!pickerSession.isCurrent(session) || gen !== categoryLoadGen.current) return;
      setPickerCategories(acc);
      setCategoryPickerState(acc.length ? "ready" : "empty");
    } catch (err) {
      if (!pickerSession.isCurrent(session) || gen !== categoryLoadGen.current) return;
      setCategoryPickerState("error");
      setCategoryPickerError(parseApiError(err).message);
    }
  }, [access.canRead, fetchCategories, pickerSession]);

  const loadProducts = useCallback(async () => {
    if (!access.canRead) return;
    const session = pickerSession.current();
    const gen = ++productLoadGen.current;
    setProductPickerState("loading");
    setProductPickerError(null);
    try {
      const page = await fetchProducts({ status: "PUBLISHED", limit: 100 }).unwrap();
      if (!pickerSession.isCurrent(session) || gen !== productLoadGen.current) return;
      setPickerProducts(
        (page.items ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ""),
          status: String(row.status ?? "PUBLISHED"),
        })),
      );
      setProductPickerCursor((page.meta?.nextCursor as string | null) ?? null);
      setProductPickerState((page.items ?? []).length ? "ready" : "empty");
    } catch (err) {
      if (!pickerSession.isCurrent(session) || gen !== productLoadGen.current) return;
      setProductPickerState("error");
      setProductPickerError(parseApiError(err).message);
    }
  }, [access.canRead, fetchProducts, pickerSession]);

  function resetBannerPagination() {
    loadMoreGen.current += 1;
    setExtraBannerRows([]);
    setTailPagination("idle");
  }

  const categoryItems = pickerCategories;
  const productItems = pickerProducts;

  const formSnapshot = useMemo(
    () => ({
      imageUploadId,
      destinationType,
      targetCategoryId: targetCategoryId || null,
      targetProductId: targetProductId || null,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
    }),
    [destinationType, endsAt, imageUploadId, startsAt, targetCategoryId, targetProductId],
  );

  const mergeBannerEverywhere = useCallback(
    (updated: BannerRow) => {
      listMutationGen.current += 1;
      const pageOneRows = (query.data?.items ?? []) as BannerRow[];
      const next = applyBannerUpdate(pageOneRows, extraBannerRows, updated, listFilters);
      setExtraBannerRows(next.extra);
      setEditing((cur) => (cur?.id === updated.id ? updated : cur));
    },
    [extraBannerRows, listFilters, query.data?.items],
  );

  const items = useMemo(() => {
    const pageOneRows = (query.data?.items ?? []) as BannerRow[];
    return mergeBannerRowsForView(pageOneRows, extraBannerRows, listFilters).sort(
      compareBannerDisplayOrder,
    );
  }, [extraBannerRows, listFilters, query.data?.items]);

  const pageOneNext = query.data?.meta?.nextCursor as string | undefined;
  const nextBannerCursor = resolveNextBannerCursor(tailPagination, pageOneNext);

  if (!access.canRead) {
    return (
      <Surface title="Banners">
        <p className="p-6 text-sm text-muted-foreground">You do not have permission to view ecommerce banners.</p>
      </Surface>
    );
  }
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  async function loadMoreBanners() {
    if (!nextBannerCursor) return;
    const requestGen = loadMoreGen.current;
    const requestMutationGen = listMutationGen.current;
    const requestFilterKey = listFilterKey;
    try {
      const page = await fetchMoreBanners({ ...listQueryArgs, cursor: nextBannerCursor }).unwrap();
      if (
        !shouldApplyLoadMoreResult(
          requestFilterKey,
          bannerListFilterKey(listQueryArgs),
          requestGen,
          loadMoreGen.current,
          requestMutationGen,
          listMutationGen.current,
        )
      ) {
        return;
      }
      setExtraBannerRows((prev) =>
        mergeExtraBannerPage(prev, (page.items ?? []) as BannerRow[]),
      );
      setTailPagination(tailAfterLoadedPage(page.meta?.nextCursor as string | null | undefined));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function loadMorePickerProducts() {
    if (!productPickerCursor) return;
    const session = pickerSession.current();
    const gen = ++productLoadMoreGen.current;
    setProductPickerLoadingMore(true);
    try {
      const page = await fetchProducts({
        status: "PUBLISHED",
        limit: 100,
        cursor: productPickerCursor,
      }).unwrap();
      if (!pickerSession.isCurrent(session) || gen !== productLoadMoreGen.current) return;
      setPickerProducts((prev) => [
        ...prev,
        ...(page.items ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ""),
          status: String(row.status ?? "PUBLISHED"),
        })),
      ]);
      setProductPickerCursor((page.meta?.nextCursor as string | null) ?? null);
    } catch (err) {
      if (!pickerSession.isCurrent(session) || gen !== productLoadMoreGen.current) return;
      toastApiError(err);
    } finally {
      if (pickerSession.isCurrent(session) && gen === productLoadMoreGen.current) {
        setProductPickerLoadingMore(false);
      }
    }
  }

  const categoryNameById = new Map(
    categoryItems.map((c) => [String(c.id), String(c.name)]),
  );
  const productNameById = new Map(
    productItems.map((p) => [String(p.id), String(p.name)]),
  );

  function resetForm(row?: BannerRow | null) {
    pickerSession.bump();
    categoryLoadGen.current += 1;
    productLoadGen.current += 1;
    productLoadMoreGen.current += 1;
    setEditing(row ?? null);
    setTitle(row?.title ?? "");
    setSubtitle(row?.subtitle ?? "");
    setPlacement(row?.placement ?? "HOME");
    setDisplayOrder(String(row?.displayOrder ?? 0));
    setDestinationType(row?.destinationType ?? "NONE");
    setTargetCategoryId(row?.targetCategoryId ?? "");
    setTargetProductId(row?.targetProductId ?? "");
    setStartsAt(utcIsoToDatetimeLocalValue(row?.startsAt));
    setEndsAt(utcIsoToDatetimeLocalValue(row?.endsAt));
    imageUpload.reset(row?.imageUploadId ?? null);
    setProductPickerFilter("");
    setPinnedCategory(null);
    setPinnedProduct(null);
    setCategoryTargetLoading(false);
    setCategoryTargetError(null);
    setProductTargetLoading(false);
    setProductTargetError(null);
    if (row?.targetCategoryId) {
      const catGen = categoryLoadGen.current;
      const session = pickerSession.current();
      setCategoryTargetLoading(true);
      void fetchCategoryById({ categoryId: row.targetCategoryId })
        .unwrap()
        .then((category) => {
          if (!pickerSession.isCurrent(session) || catGen !== categoryLoadGen.current) return;
          setPinnedCategory({
            id: String(category.id),
            name: String(category.name ?? "Category"),
            active: category.active !== false,
          });
          setCategoryTargetError(null);
        })
        .catch((err) => {
          if (!pickerSession.isCurrent(session) || catGen !== categoryLoadGen.current) return;
          setCategoryTargetError(parseApiError(err).message);
          setPinnedCategory({
            id: row.targetCategoryId!,
            name: categoryNameById.get(row.targetCategoryId!) ?? "Saved category",
          });
        })
        .finally(() => {
          if (pickerSession.isCurrent(session) && catGen === categoryLoadGen.current) {
            setCategoryTargetLoading(false);
          }
        });
    }
    if (row?.targetProductId) {
      const prodGen = productLoadGen.current;
      const session = pickerSession.current();
      setProductTargetLoading(true);
      void fetchProductById({ productId: row.targetProductId })
        .unwrap()
        .then((product) => {
          if (!pickerSession.isCurrent(session) || prodGen !== productLoadGen.current) return;
          setPinnedProduct({
            id: String(product.id),
            name: String(product.name ?? "Product"),
            status: String(product.status ?? ""),
          });
          setProductTargetError(null);
        })
        .catch((err) => {
          if (!pickerSession.isCurrent(session) || prodGen !== productLoadGen.current) return;
          setProductTargetError(parseApiError(err).message);
          setPinnedProduct({
            id: row.targetProductId!,
            name: productNameById.get(row.targetProductId!) ?? "Saved product",
          });
        })
        .finally(() => {
          if (pickerSession.isCurrent(session) && prodGen === productLoadGen.current) {
            setProductTargetLoading(false);
          }
        });
    }
    if (access.canRead) {
      void loadCategories();
      if ((row?.destinationType ?? "NONE") === "PRODUCT") void loadProducts();
    }
  }

  async function onImagePick(file: File | null) {
    if (!file || !entitled || !access.canWrite) return;
    await imageUpload.pickFile(file);
  }

  async function saveDraft(): Promise<false | void> {
    if (!access.canWrite || !entitled) {
      toast.error(disabledMessage ?? "Not entitled to edit banners.");
      return false;
    }
    if (imageUpload.uploading) return false;
    const blockers = publishBlockers({ ...formSnapshot, title });
    if (blockers.length && destinationType !== "NONE") {
      /* draft ok with incomplete dest only if user hasn't picked targets yet */
    }
    const body = buildBannerSaveBody({
      title,
      subtitle,
      placement,
      displayOrder,
      destinationType,
      targetCategoryId,
      targetProductId,
      startsAtLocal: startsAt,
      endsAtLocal: endsAt,
      imageUploadId,
      editing,
    });
    try {
      if (editing) {
        const updated = (await patchBanner({
          bannerId: editing.id,
          body: { ...body, expectedVersion: editing.version },
        }).unwrap()) as BannerRow;
        mergeBannerEverywhere(updated);
        toast.success("Banner updated");
      } else {
        await createBanner(body).unwrap();
        toast.success("Banner created");
        setExtraBannerRows([]);
        setTailPagination("idle");
      }
      await query.refetch();
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.code === "VERSION_CONFLICT") {
        const current = parsed.details as { current?: { version?: number } } | undefined;
        if (current?.current?.version != null && editing) {
          setEditing({ ...editing, version: current.current.version });
        }
        toast.error("This banner changed elsewhere. Your edits are kept — review and save again.");
        return false;
      }
      toastApiError(err);
      throw err;
    }
  }

  async function runStatus(
    action: "publish" | "unpublish" | "archive",
    row: BannerRow,
  ) {
    if (!access.canWrite || !entitled) {
      toast.error(disabledMessage ?? "Not entitled");
      return;
    }
    if (action === "publish") {
      const blockers = publishBlockers(row);
      if (blockers.length) {
        toast.error(blockers.join(" "));
        return;
      }
    }
    setStatusPendingId(row.id);
    try {
      let updated: BannerRow;
      if (action === "publish") {
        updated = (await publishBanner({ bannerId: row.id, expectedVersion: row.version }).unwrap()) as BannerRow;
      } else if (action === "unpublish") {
        updated = (await unpublishBanner({ bannerId: row.id, expectedVersion: row.version }).unwrap()) as BannerRow;
      } else {
        updated = (await archiveBanner({ bannerId: row.id, expectedVersion: row.version }).unwrap()) as BannerRow;
      }
      mergeBannerEverywhere(updated);
      toast.success(`Banner ${action}d`);
      await query.refetch();
    } catch (err) {
      toastApiError(err);
    } finally {
      setStatusPendingId(null);
    }
  }

  const canWrite = access.canWrite && entitled;

  const bannerNeedle = bannerSearch.trim().toLowerCase();
  const visibleBanners = bannerNeedle
    ? items.filter((row) => `${row.title ?? ""} ${row.subtitle ?? ""}`.toLowerCase().includes(bannerNeedle))
    : items;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={ImageIcon}
        title="Banners"
        description={`The “${CUSTOMER_PROMO_SECTION_TITLE}” promo rail customers see on the app home and in your shop.`}
        actions={
          canWrite ? (
            <Button type="button" className="rounded-xl" onClick={() => { resetForm(null); setOpen(true); }}>
              <Plus /> New banner
            </Button>
          ) : null
        }
      />
      {!entitled ? <Notice tone="amber">{disabledMessage}</Notice> : null}
      <details className="group rounded-2xl border border-[#efe2d0] bg-gradient-to-r from-[#fdf8ef] to-white px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-[#3c2a2e]">
          <ImageIcon className="size-4 text-[#9a6f2a]" aria-hidden />
          Where customers see banners
          <span className="ml-auto text-xs font-medium text-[#9a6f2a] group-open:hidden">Show</span>
          <span className="ml-auto hidden text-xs font-medium text-[#9a6f2a] group-open:inline">Hide</span>
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-[#6f6265]">
          <li>
            <strong className="font-semibold text-[#28161a]">App home</strong> — {ECOMMERCE_BANNER_PLACEMENTS[0].customerLocation}. Placement “Home” or “Both”. Needs the ecommerce plan.
          </li>
          <li>
            <strong className="font-semibold text-[#28161a]">Online store</strong> — {ECOMMERCE_BANNER_PLACEMENTS[1].customerLocation}. Placement “Shop” or “Both”. The store must be live; banners hide while customers search or filter.
          </li>
          <li>{BANNER_IMAGE_ARTWORK_HINT}</li>
          <li>{BANNER_SIGNED_URL_REVOCATION_HINT}</li>
        </ul>
      </details>

      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={listStatusFilter}
                onChange={(value) => {
                  setListStatusFilter(value);
                  resetBannerPagination();
                }}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "DRAFT", label: "Drafts" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
                ariaLabel="Banner status"
              />
            }
            search={<FilterSearch value={bannerSearch} onChange={setBannerSearch} placeholder="Search banner title" />}
            filters={
              <FilterSelect
                label="Placement"
                value={listPlacementFilter}
                onChange={(value) => {
                  setListPlacementFilter(value);
                  resetBannerPagination();
                }}
                options={[{ value: "ALL", label: "All" }, ...ECOMMERCE_BANNER_PLACEMENTS.map((pl) => ({ value: pl.value, label: pl.label }))]}
                widthClass="min-w-[12rem]"
              />
            }
            resultLabel={`${visibleBanners.length} banners`}
          />
        }
      >
        {!visibleBanners.length ? (
          <EmptyState
            icon={ImageIcon}
            title={items.length ? "No banners match" : "No banners yet"}
            detail={items.length ? "Try another filter." : "Create a draft banner, add artwork, then publish when it's ready."}
            action={!items.length && canWrite ? <Button onClick={() => { resetForm(null); setOpen(true); }}>New banner</Button> : undefined}
          />
        ) : (
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            {visibleBanners.map((row) => {
              const placementInfo = placementMeta(row.placement);
              const surfaces = bannerCustomerSurfaces(row.placement);
              const destLabel = formatBannerDestinationLabel(row.destinationType, {
                categoryName: row.targetCategoryId ? categoryNameById.get(row.targetCategoryId) : null,
                productName: row.targetProductId ? productNameById.get(row.targetProductId) : null,
              });
              const effective = bannerEffectiveStatus(row);
              const hint = bannerCustomerVisibilityHint(row);
              return (
                <article key={row.id} className="overflow-hidden rounded-[1.15rem] border border-[#ebe1dc] bg-white">
                  <div className={cn(CUSTOMER_PROMO_RAIL_FRAME, "w-full rounded-none")}>
                    {row.imageUploadId ? (
                      <EcommerceCatalogImage uploadId={row.imageUploadId} channel="admin" alt="" fill className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center bg-[#f5efea] text-[#b9a9ad]">
                        <ImageIcon className="size-7" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <StatusBadge status={row.status} />
                      {effective !== row.status ? <StatusBadge status={effective} label={bannerEffectiveStatusLabel(effective)} /> : null}
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="font-bold text-[#28161a]">{row.title}</h3>
                      {row.subtitle ? <p className="text-sm text-[#6f6265]">{row.subtitle}</p> : null}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#fbf8f6] px-2.5 py-2">
                        <dt className="text-[#9a8d90]">Shows on</dt>
                        <dd className="mt-0.5 font-semibold text-[#3c2a2e]">
                          {surfaces.map((x) => (x === "home" ? "App home" : "Shop")).join(" + ") || placementInfo.shortLabel}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-[#fbf8f6] px-2.5 py-2">
                        <dt className="text-[#9a8d90]">Opens</dt>
                        <dd className="mt-0.5 truncate font-semibold text-[#3c2a2e]">{destLabel}</dd>
                      </div>
                      <div className="col-span-2 rounded-lg bg-[#fbf8f6] px-2.5 py-2">
                        <dt className="text-[#9a8d90]">Schedule · order #{row.displayOrder ?? 0}</dt>
                        <dd className="mt-0.5 font-semibold text-[#3c2a2e]">
                          {row.startsAt || row.endsAt
                            ? `${row.startsAt ? formatUtcIsoForDisplay(row.startsAt) : "Now"} → ${row.endsAt ? formatUtcIsoForDisplay(row.endsAt) : "No end"}`
                            : "Always on once published"}
                        </dd>
                      </div>
                    </dl>
                    {hint ? <p className="text-xs text-[#857a7d]">{hint}</p> : null}
                    <div className="flex flex-wrap gap-2 border-t border-[#f3eae7] pt-3">
                      {row.status === "ARCHIVED" ? (
                        <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => { resetForm(row); setOpen(true); }}>
                          View
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={!canWrite} onClick={() => { resetForm(row); setOpen(true); }}>
                          Edit
                        </Button>
                      )}
                      {canWrite && row.status === "DRAFT" ? (
                        <Button type="button" size="sm" className="rounded-lg" disabled={statusPendingId === row.id} onClick={() => void runStatus("publish", row)}>
                          Publish
                        </Button>
                      ) : null}
                      {canWrite && row.status === "PUBLISHED" ? (
                        <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={statusPendingId === row.id} onClick={() => void runStatus("unpublish", row)}>
                          Unpublish
                        </Button>
                      ) : null}
                      {canWrite && row.status !== "ARCHIVED" ? (
                        <Button type="button" size="sm" variant="ghost" className="ml-auto rounded-lg text-[#8a7c80]" disabled={statusPendingId === row.id} onClick={() => void runStatus("archive", row)}>
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {nextBannerCursor ? (
          <div className="flex justify-center border-t border-[#efe5e1] bg-[#fbf8f6] px-5 py-3">
            <Button type="button" variant="outline" className="rounded-lg" disabled={fetchMoreBannersState.isFetching} onClick={() => void loadMoreBanners()}>
              {fetchMoreBannersState.isFetching ? "Loading…" : "Load more banners"}
            </Button>
          </div>
        ) : null}
      </ListPanel>

      <EcommerceBannerEditorDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) pickerSession.bump();
          setOpen(next);
        }}
        editing={editing}
        readOnly={editing?.status === "ARCHIVED"}
        canWrite={canWrite}
        title={title}
        onTitleChange={setTitle}
        subtitle={subtitle}
        onSubtitleChange={setSubtitle}
        placement={placement}
        onPlacementChange={setPlacement}
        displayOrder={displayOrder}
        onDisplayOrderChange={setDisplayOrder}
        destinationType={destinationType}
        onDestinationTypeChange={(value) => {
          setDestinationType(value);
          if (value === "PRODUCT" && access.canRead) void loadProducts();
        }}
        targetCategoryId={targetCategoryId}
        onTargetCategoryIdChange={setTargetCategoryId}
        targetProductId={targetProductId}
        onTargetProductIdChange={setTargetProductId}
        startsAt={startsAt}
        onStartsAtChange={setStartsAt}
        endsAt={endsAt}
        onEndsAtChange={setEndsAt}
        imageUploadId={imageUploadId}
        imageUploading={imageUpload.uploading}
        imageUploadError={imageUpload.uploadError}
        onImagePick={(file) => void onImagePick(file)}
        categoryPicker={{
          state: categoryPickerState,
          rows: categoryItems,
          pinned: pinnedCategory,
          errorMessage: categoryPickerError,
          loadingTarget: categoryTargetLoading,
          targetError: categoryTargetError,
        }}
        productPicker={{
          state: productPickerState,
          rows: productItems,
          pinned: pinnedProduct,
          hasMore: Boolean(productPickerCursor),
          loadingMore: productPickerLoadingMore,
          errorMessage: productPickerError,
          loadingTarget: productTargetLoading,
          targetError: productTargetError,
        }}
        productPickerFilter={productPickerFilter}
        onProductPickerFilterChange={setProductPickerFilter}
        onLoadMoreProducts={() => void loadMorePickerProducts()}
        onRetryCategories={() => void loadCategories()}
        onRetryProducts={() => void loadProducts()}
        submitDisabled={!canWrite || !title.trim() || imageUpload.uploading}
        onSubmit={saveDraft}
      />
    </div>
  );
}
