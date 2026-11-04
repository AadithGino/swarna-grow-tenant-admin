import { describe, expect, it } from "vitest";
import { pollSessionFromInitResponse } from "@/src/lib/customer-payment-session";

describe("pollSessionFromInitResponse", () => {
  it("uses authenticated link poll for fixed scheme hosted checkout", () => {
    const session = pollSessionFromInitResponse(
      {
        id: "plk_01M6JRETFRH28XEGDWTH53738G",
        token: "tok_secret",
        paymentUrl: "https://mercury.phonepe.com/transact/pg?token=abc",
        statusPollUrl: "/app/payments/plk_01M6JRETFRH28XEGDWTH53738G/status",
      },
      "sch_01",
    );
    expect(session).toEqual({
      kind: "link",
      linkId: "plk_01M6JRETFRH28XEGDWTH53738G",
      linkToken: "tok_secret",
      schemeId: "sch_01",
    });
  });

  it("uses payment intent poll for flexible schemes", () => {
    const session = pollSessionFromInitResponse(
      {
        id: "pmi_01ABC",
        intentId: "pmi_01ABC",
        paymentUrl: "https://mercury.phonepe.com/transact/pg?token=abc",
        statusPollUrl: "/app/payment-intents/pmi_01ABC",
      },
      "sch_02",
    );
    expect(session?.kind).toBe("intent");
    expect(session?.intentId).toBe("pmi_01ABC");
  });
});
