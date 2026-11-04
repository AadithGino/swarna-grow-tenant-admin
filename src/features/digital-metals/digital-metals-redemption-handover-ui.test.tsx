/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

function PickupHandoverFixture({
  onSubmit,
}: {
  onSubmit: (payload: { pickupCode: string; staffHandoverConfirmed: boolean }) => void;
}) {
  const [pickupCode, setPickupCode] = useState("");
  const [staffHandoverConfirmed, setStaffHandoverConfirmed] = useState(false);

  return (
    <div>
      <label htmlFor="pickup-code">Pickup code from the customer</label>
      <Input id="pickup-code" value={pickupCode} onChange={(e) => setPickupCode(e.target.value)} />
      <label className="flex items-center gap-2">
        <Checkbox
          checked={staffHandoverConfirmed}
          onCheckedChange={(v) => setStaffHandoverConfirmed(v === true)}
          aria-label="I verified the customer's pickup code and am handing over the physical metal now."
        />
        <span>I verified the customer&apos;s pickup code and am handing over the physical metal now.</span>
      </label>
      <Button
        type="button"
        onClick={() => {
          if (!staffHandoverConfirmed) return;
          onSubmit({ pickupCode, staffHandoverConfirmed: true });
        }}
      >
        Complete pickup
      </Button>
    </div>
  );
}

describe("Redemption pickup handover UI journey", () => {
  afterEach(() => cleanup());

  it("blocks submit until staff attestation is checked", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<PickupHandoverFixture onSubmit={submit} />);
    await user.type(screen.getByRole("textbox"), "482910");
    await user.click(screen.getByRole("button", { name: /complete pickup/i }));
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits pickup code with staff attestation", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<PickupHandoverFixture onSubmit={submit} />);
    await user.type(screen.getByRole("textbox"), "482910");
    await user.click(screen.getByLabelText(/verified the customer/i));
    await user.click(screen.getByRole("button", { name: /complete pickup/i }));
    expect(submit).toHaveBeenCalledWith({ pickupCode: "482910", staffHandoverConfirmed: true });
  });
});
