/* @vitest-environment happy-dom */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EcommerceBannerEditorDialog } from "@/src/features/ecommerce/ecommerce-banner-editor-dialog";
import { utcIsoToDatetimeLocalValue } from "@/src/lib/datetime-local";
import { buildBannerSaveBody } from "@/src/lib/banner-save-body";

vi.mock("@/src/features/ecommerce/ecommerce-catalog-image", () => ({
  EcommerceCatalogImage: () => <div data-testid="mock-catalog-image" />,
}));

function baseProps(overrides: Partial<React.ComponentProps<typeof EcommerceBannerEditorDialog>> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    editing: null,
    readOnly: false,
    canWrite: true,
    title: "Promo title",
    onTitleChange: vi.fn(),
    subtitle: "",
    onSubtitleChange: vi.fn(),
    placement: "HOME",
    onPlacementChange: vi.fn(),
    displayOrder: "0",
    onDisplayOrderChange: vi.fn(),
    destinationType: "NONE",
    onDestinationTypeChange: vi.fn(),
    targetCategoryId: "",
    onTargetCategoryIdChange: vi.fn(),
    targetProductId: "",
    onTargetProductIdChange: vi.fn(),
    startsAt: utcIsoToDatetimeLocalValue("2026-01-20T04:30:00.000Z"),
    onStartsAtChange: vi.fn(),
    endsAt: "",
    onEndsAtChange: vi.fn(),
    imageUploadId: "upl_test",
    imageUploading: false,
    imageUploadError: null,
    onImagePick: vi.fn(),
    categoryPicker: { state: "ready" as const, rows: [] },
    productPicker: {
      state: "ready" as const,
      rows: [],
      hasMore: false,
      loadingMore: false,
    },
    productPickerFilter: "",
    onProductPickerFilterChange: vi.fn(),
    onLoadMoreProducts: vi.fn(),
    onRetryCategories: vi.fn(),
    onRetryProducts: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    submitDisabled: false,
    ...overrides,
  };
}

describe("EcommerceBannerEditorDialog + ActionDialog", () => {
  afterEach(() => cleanup());
  it.each([
    ["400", { status: 400, data: { error: { code: "VALIDATION_ERROR", message: "Bad input" } } }],
    ["403", { status: 403, data: { error: { code: "FORBIDDEN", message: "Denied" } } }],
    ["409", { status: 409, data: { error: { code: "VERSION_CONFLICT", message: "Stale" } } }],
    ["500", { status: 500, data: { error: { code: "INTERNAL", message: "Server error" } } }],
  ])("keeps dialog open on %s save failures", async (_label, payload) => {
    const onOpenChange = vi.fn();
    const err = Object.assign(new Error("fail"), payload);
    const onSubmit = vi.fn().mockRejectedValue(err);
    render(
      <EcommerceBannerEditorDialog
        {...baseProps({ onOpenChange, onSubmit, title: "Keep me" })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(within(screen.getByTestId("banner-editor-form")).getByTestId("banner-title-input")).toHaveValue("Keep me");
  });

  it("closes after successful save", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EcommerceBannerEditorDialog {...baseProps({ onOpenChange, onSubmit })} />);
    await userEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("title-only save omits schedule fields in patch body", () => {
    const starts = utcIsoToDatetimeLocalValue("2026-01-20T04:30:00.000Z");
    const body = buildBannerSaveBody({
      title: "Renamed",
      subtitle: "",
      placement: "HOME",
      displayOrder: "0",
      destinationType: "NONE",
      targetCategoryId: "",
      targetProductId: "",
      startsAtLocal: starts,
      endsAtLocal: "",
      imageUploadId: "upl_test",
      editing: {
        id: "b1",
        version: 3,
        imageUploadId: "upl_test",
        startsAt: "2026-01-20T04:30:00.000Z",
        endsAt: null,
      },
    });
    expect(body.startsAt).toBeUndefined();
    expect(body.endsAt).toBeUndefined();
    expect(body.title).toBe("Renamed");
  });

  it("disables save while image upload is in progress", () => {
    render(
      <EcommerceBannerEditorDialog
        {...baseProps({ imageUploading: true, submitDisabled: true })}
      />,
    );
    expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
  });

  it("archived banner uses view mode and Close action", async () => {
    const onSubmit = vi.fn();
    render(
      <EcommerceBannerEditorDialog
        {...baseProps({
          editing: {
            id: "b1",
            title: "Old",
            status: "ARCHIVED",
            placement: "HOME",
            destinationType: "NONE",
            version: 1,
          },
          readOnly: true,
          onSubmit,
        })}
      />,
    );
    expect(within(screen.getByTestId("banner-editor-form")).getByTestId("banner-title-input")).toBeDisabled();
    const buttons = screen.getAllByRole("button", { name: /^close$/i });
    await userEvent.click(buttons[buttons.length - 1]!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
