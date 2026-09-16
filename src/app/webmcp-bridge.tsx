"use client";

import { useEffect } from "react";
import { store } from "@/src/store";
import { adminApi } from "@/src/store/api/admin-api";
import { idempotencyKey } from "@/src/lib/format";

type ModelContext = {
  registerTool: (
    tool: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export function WebMcpBridge() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Record<string, unknown>) =>
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => undefined);
    void register({
      name: "search_customer_records",
      title: "Search customers",
      description:
        "Search tenant customer records by name, phone number or customer ID.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", minLength: 2 } },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input: unknown) {
        const query = (input as { query?: unknown })?.query;
        if (typeof query !== "string" || query.trim().length < 2)
          throw new Error("query must contain at least two characters");
        const result = await store
          .dispatch(
            adminApi.endpoints.getCustomers.initiate(
              { q: query.trim() },
              { forceRefetch: true },
            ),
          )
          .unwrap();
        return {
          total: result.total,
          customers: result.items
            .slice(0, 10)
            .map(({ id, customerNo, name, phone, branch, status }) => ({
              id,
              customerNo,
              name,
              phone,
              branch,
              status,
            })),
        };
      },
    });
    void register({
      name: "record_scheme_payment",
      title: "Record scheme payment",
      description:
        "Record a confirmed tenant-admin payment against an enrollment and refresh the visible ledgers.",
      inputSchema: {
        type: "object",
        properties: {
          schemeId: { type: "string", minLength: 1 },
          amount: { type: "number", exclusiveMinimum: 0 },
          mode: {
            type: "string",
            enum: ["CASH", "PHONEPE", "UPI", "BANK_TRANSFER", "CARD"],
          },
        },
        required: ["schemeId", "amount", "mode"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input: unknown) {
        const value = input as {
          schemeId?: unknown;
          amount?: unknown;
          mode?: unknown;
        };
        if (
          typeof value.schemeId !== "string" ||
          typeof value.amount !== "number" ||
          value.amount <= 0 ||
          !["CASH", "PHONEPE", "UPI", "BANK_TRANSFER", "CARD"].includes(
            String(value.mode),
          )
        )
          throw new Error(
            "schemeId, positive amount and a supported mode are required",
          );
        const result = await store
          .dispatch(
            adminApi.endpoints.recordPayment.initiate({
              schemeId: value.schemeId,
              amount: value.amount,
              mode: value.mode as any,
              idempotencyKey: idempotencyKey(),
            }),
          )
          .unwrap();
        return {
          paymentId: result.id,
          receiptNo: result.receiptNo,
          status: result.status,
          amount: result.amount,
        };
      },
    });
    return () => lifecycle.abort();
  }, []);
  return null;
}
