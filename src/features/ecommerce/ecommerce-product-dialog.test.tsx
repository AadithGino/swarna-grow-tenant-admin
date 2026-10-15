/* @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { EcommerceProductDialog } from "@/src/features/ecommerce/ecommerce-product-dialog";

const mocks = vi.hoisted(() => ({
  createProduct: vi.fn(),
  patchProduct: vi.fn(),
  publishProduct: vi.fn(),
  fetchProduct: vi.fn(),
}));

vi.mock("@/src/features/ecommerce/ecommerce-catalog-image", () => ({
  EcommerceCatalogImage: () => <div data-testid="mock-catalog-image" />,
}));

vi.mock("@/src/features/ecommerce/ecommerce-shared", () => ({
  PricingPreviewPanel: () => <div data-testid="pricing-preview" />,
}));

vi.mock("@/src/features/ecommerce/ecommerce-admin-shared", () => ({
  useEcommerceCatalogWrite: () => ({ entitled: true, disabledMessage: null }),
}));

vi.mock("@/src/store/api/admin-api", () => ({
  useGetEcommerceCategoriesQuery: () => ({ data: { items: [] } }),
  useGetEcommerceTaxSettingsQuery: () => ({ data: { defaultClassification: "GST_3" } }),
  useCreateEcommerceProductMutation: () => [mocks.createProduct],
  usePatchEcommerceProductMutation: () => [mocks.patchProduct],
  usePublishEcommerceProductMutation: () => [mocks.publishProduct],
  useArchiveEcommerceProductMutation: () => [vi.fn()],
  usePresignUploadMutation: () => [vi.fn()],
  useCompleteUploadMutation: () => [vi.fn()],
  useLazyPreviewEcommerceProductPriceQuery: () => [vi.fn(), { isFetching: false }],
  useLazyGetEcommerceProductQuery: () => [mocks.fetchProduct],
}));

vi.mock("@/src/store/hooks", () => ({
  useAppSelector: () => ({ session: { session: { user: { permissions: [] } } } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

function renderDialog(product: Record<string, unknown> | null = null) {
  const store = configureStore({ reducer: { session: () => ({ session: null }) } });
  return render(
    <Provider store={store}>
      <EcommerceProductDialog open product={product} onOpenChange={vi.fn()} />
    </Provider>,
  );
}

function fillFixedDraftBasics(dialog: HTMLElement, name: string) {
  const inputs = dialog.querySelectorAll("input[data-slot=input]");
  const nameInput = inputs[0];
  if (!nameInput) throw new Error("name input missing");
  fireEvent.change(nameInput, { target: { value: name } });
  const baseInput = Array.from(inputs).find(
    (el) => (el as HTMLInputElement).inputMode === "decimal",
  );
  if (!baseInput) throw new Error("base price input missing");
  fireEvent.change(baseInput, { target: { value: "1000" } });
}

describe("EcommerceProductDialog draft → publish", () => {
  afterEach(() => {
    cleanup();
    mocks.createProduct.mockReset();
    mocks.patchProduct.mockReset();
    mocks.publishProduct.mockReset();
    mocks.fetchProduct.mockReset();
  });

  it("create → save draft → publish uses one create and one publish on the same id", async () => {
    let finishCreate!: (row: Record<string, unknown>) => void;
    const createDeferred = new Promise<Record<string, unknown>>((resolve) => {
      finishCreate = resolve;
    });
    mocks.createProduct.mockImplementation(() => ({
      unwrap: () => createDeferred,
    }));
    mocks.patchProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_test",
          version: 1,
          status: "DRAFT",
          priceMode: "FIXED",
          fixedPricing: { basePricePaise: 100_000 },
          taxClassification: "GST_3",
        }),
    });
    mocks.publishProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_test",
          version: 2,
          status: "PUBLISHED",
          priceMode: "FIXED",
        }),
    });
    renderDialog(null);
    const dialog = screen.getByRole("dialog");
    fillFixedDraftBasics(dialog, "New ring");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.createProduct).toHaveBeenCalledTimes(1));
    finishCreate({
      id: "eprd_test",
      version: 1,
      status: "DRAFT",
      priceMode: "FIXED",
      fixedPricing: { basePricePaise: 100_000 },
      taxClassification: "GST_3",
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save draft/i })).not.toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await waitFor(() => expect(mocks.patchProduct).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.publishProduct).toHaveBeenCalledTimes(1));
    expect(mocks.createProduct).toHaveBeenCalledTimes(1);
    expect(mocks.publishProduct.mock.calls[0][0].productId).toBe("eprd_test");
    expect(mocks.publishProduct.mock.calls[0][0].expectedVersion).toBe(1);
  });

  it("second draft save PATCHes the created product id", async () => {
    mocks.createProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_patch",
          version: 1,
          status: "DRAFT",
          priceMode: "FIXED",
          fixedPricing: { basePricePaise: 100_000 },
          taxClassification: "GST_3",
        }),
    });
    mocks.patchProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_patch",
          version: 2,
          status: "DRAFT",
          priceMode: "FIXED",
          fixedPricing: { basePricePaise: 100_000 },
        }),
    });
    renderDialog(null);
    const dialog = screen.getByRole("dialog");
    fillFixedDraftBasics(dialog, "Draft twice");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.createProduct).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.patchProduct).toHaveBeenCalledTimes(1));
    expect(mocks.patchProduct.mock.calls[0][0].productId).toBe("eprd_patch");
    expect(mocks.patchProduct.mock.calls[0][0].body.expectedVersion).toBe(1);
    expect(mocks.createProduct).toHaveBeenCalledTimes(1);
  });

  it("publish failure after create keeps draft identity for retry (no second create)", async () => {
    mocks.createProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_pub_fail",
          version: 1,
          status: "DRAFT",
          priceMode: "FIXED",
          fixedPricing: { basePricePaise: 100_000 },
          taxClassification: "GST_3",
        }),
    });
    mocks.patchProduct.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "eprd_pub_fail",
          version: 1,
          status: "DRAFT",
          priceMode: "FIXED",
          fixedPricing: { basePricePaise: 100_000 },
          taxClassification: "GST_3",
        }),
    });
    mocks.publishProduct.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 500,
          data: { error: { code: "INTERNAL", message: "Publish failed" } },
        }),
    });
    renderDialog(null);
    const dialog = screen.getByRole("dialog");
    fillFixedDraftBasics(dialog, "Retry publish");
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(mocks.createProduct).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save draft/i })).not.toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await waitFor(() => expect(mocks.publishProduct).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await waitFor(() => expect(mocks.publishProduct).toHaveBeenCalledTimes(2));
    expect(mocks.createProduct).toHaveBeenCalledTimes(1);
    expect(mocks.publishProduct.mock.calls[0][0].productId).toBe("eprd_pub_fail");
    expect(mocks.publishProduct.mock.calls[1][0].productId).toBe("eprd_pub_fail");
  });
});
