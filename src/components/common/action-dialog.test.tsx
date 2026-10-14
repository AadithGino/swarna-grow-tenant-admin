/* @vitest-environment happy-dom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ActionDialog } from "@/src/components/common/action-dialog";

describe("ActionDialog error notification", () => {
  it("toasts API errors on submit failure by default", async () => {
    const toastSpy = vi.spyOn(toast, "error");
    const onSubmit = vi.fn().mockRejectedValue(
      Object.assign(new Error("fail"), {
        status: 400,
        data: { error: { code: "VALIDATION_ERROR", message: "Bad input" } },
      }),
    );
    render(
      <ActionDialog open onOpenChange={() => {}} title="Test" actionLabel="Save" onSubmit={onSubmit}>
        <p>Body</p>
      </ActionDialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    toastSpy.mockRestore();
  });
});
