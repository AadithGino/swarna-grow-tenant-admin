import { describe, expect, it, vi } from "vitest";
import {
  onDialogOpenChange,
  onDialogOpenChangeWithReset,
} from "@/src/lib/dialog-open-change";

describe("onDialogOpenChange", () => {
  it("forwards open state without calling onClose when opening", () => {
    const onOpenChange = vi.fn();
    const onClose = vi.fn();
    onDialogOpenChange(true, onOpenChange, onClose);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("runs onClose before forwarding when closing", () => {
    const order: string[] = [];
    const onOpenChange = vi.fn(() => order.push("openChange"));
    const onClose = vi.fn(() => order.push("close"));
    onDialogOpenChange(false, onOpenChange, onClose);
    expect(order).toEqual(["close", "openChange"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("onDialogOpenChangeWithReset", () => {
  it("runs onOpen when opening and onClose when closing", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    onDialogOpenChangeWithReset(true, onOpenChange, onOpen, onClose);
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    onDialogOpenChangeWithReset(false, onOpenChange, onOpen, onClose);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
