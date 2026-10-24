# SwarnaGrow — AI, Digital Metals and ecommerce pre-launch review

Reviewed: 22 October 2026. Verdict: **NOT READY for launch approval.**

This review is based on the supplied 2026-10-22T095621Z source archives. It combines source inspection, direct execution of relevant functions with controlled model/Redis stubs, focused tests, and a separate frontend UI patch. It is not a full running-stack financial or infrastructure certification.

Source SHA-256:
- Backend: a72fa845f74e4df1272edfa12fe3beff5e6fa1ccc1d8ea29fd43475656dbc1e9
- Tenant Admin: 481c2519e7c997d9f9e39bd9a6fb164ed15c35e1e34116bafd820ee1a879d09c

## Product assessment

Sidekick has a useful foundation: it translates questions into allowlisted query/report actions, computes results server-side, and uses Gemini for interpretation and optional narration. The execution catalogue is read-only. It reuses existing report builders and supports history, charts, tables and exports.

Its strongest positioning is a jewellery operations assistant: owners ask a business question and receive traceable, scoped figures. Accuracy, scope, period and a visible source matter more than a generic conversational personality.

It currently lives in **Tenant Admin**, not the customer portal. The query catalogue covers customers, scheme collections, schemes, scheme redemptions, branches and staff. Standard ecommerce reports are available. **Digital Metals wallets, buy/sell orders, payouts, physical redemptions and hedge reports are absent from the assistant catalogue.** Do not present it as already answering every Digital Metals question.

## Confirmed findings and required fixes

### F1 — P1: Assistant query filters override the authenticated branch

Files: `src/services/assistant/query-compiler.js`, `src/validators/assistant.validators.js`.

`compileQuerySpec()` initializes a match from authenticated tenant/branch scope, then merges every interpreted filter with `Object.assign`. `branchId` is an allowed filter field. An `eq` or `in` filter replaces the authenticated branch rather than narrowing it.

Direct reproduction through the actual validator and compiler:

```json
{"authenticatedScope":{"tenantId":"tenant-A","branchId":"branch-A"},"compiledMatch":{"tenantId":"tenant-A","branchId":{"$in":["branch-B","branch-C"]}}}
```

Both chat and query exports use this compiler. The export endpoint accepts a validated action directly, so the defect does not depend on persuading Gemini to produce the filter. Tenant ID stays enforced in this reproduction; the proven boundary break is **cross-branch within a tenant**.

Fix: compose immutable server scope with filters using an intersection, such as separate `$and` clauses, and reject unauthorized branch selectors. Add HTTP tests for both chat and export with branch `eq` and `in` filters. Apply the same rule to any future tools.

### F2 — P1: Digital Metals idempotency replay is not customer-bound

Files: `src/services/digital-metals-phase4.service.js` (`createBuyOrder` and duplicate-key recovery), `digital-metals-sell.service.js` (`createSellOrder`), `digital-metals-redemption.service.js` (`createRedemptionOrder`).

Existing orders are looked up by `{ tenantId, idempotencyKey }` and returned before checking the current customer or the submitted quote. A controlled execution of the actual buy service, with only model lookups stubbed, returned customer A's credited order to customer B using A's known idempotency key.

The HTTP idempotency middleware is actor-scoped. It therefore does not protect this separate tenant-wide service lookup when a different customer first submits that key. Treat keys as replay identifiers, not authorization secrets.

Fix: verify customer ownership and request binding before returning an existing order, including duplicate-key catch paths. Bind to quote/request hash and reject incompatible reuse. Decide whether the unique index remains tenant/key with explicit conflict rejection, or becomes customer-scoped with an index migration. Audit payment attempts, reservations and related replay helpers for the same problem. Tests must cover two customers sharing a key, changed quote/body, concurrent insert races, and same-customer valid replay.

Ecommerce's corresponding order/quote replay paths already include customer ownership and body-hash checks; its payment-intent replay explicitly checks order and customer. Use those as the pattern.

### F3 — P1: Query refinement changes the question being answered

File: `src/services/assistant/refine-query.js`.

`isLastPaymentDetailQuestion()` matches broad words such as “last” and “who paid”. The subsequent override discards grouping, dates and customer filters.

Reproduced: “Who paid the most last month?” with a valid customer-grouped sum action for September is rewritten to a latest-successful-payment query with `limit: 1` and **no date range**. Similarly, a latest-payment question constrained to a named customer can lose that customer filter.

Fix: distinguish recency from ranking and relative date language. Preserve validated constraints when refining. Prefer clarification over changing an already valid action. Add ranking/recency/date/customer regression examples.

### F4 — P1: Uploaded source fails release checks

Backend `npm run lint` fails on two new assistant items:
- `src/services/assistant/query-compiler.js`: unused `ASSISTANT_EXPORT_MAX_TIME_MS`.
- `tests/assistant-export.test.js`: unused `branch`.

Frontend `npm run typecheck` fails on un-narrowed `AssistantExportable` fields/columns and `hasPermission(session, ...)` in `admin-shell.tsx`. The latter passes the session envelope instead of `session.user`; the permission helper consequently sees no permission list and its empty-list fallback allows the launcher to appear for users who should not see it. Backend authorization still applies.

The **separate UI patch fixes the frontend errors and launcher argument**. Backend lint remains unchanged in the reviewed source. A missing new dependency in the reused local installation was installed before verification; that environment issue is not attributed to source.

Fix backend lint and run the complete release gate on the final tree without a pipeline hiding the exit status. The exported release checklist still records an older in-progress/blocked run; it is not evidence of a green release on this archive.

### F5 — P2: Chat cache loses context and conversation persistence

File: `src/services/assistant/assistant.service.js`.

Two separate reproductions:
1. With the same current question, prior customer queries for Alice and Bob produce **identical cache keys**. The query history fingerprint includes entity/date range but omits filters, groupings and aggregate details; report/composite fingerprints also omit meaningful filters.
2. A repeated cached question creates a second conversation but returns the first conversation's assistant message ID and writes **zero new history messages**. `handleChat()` returns from the cache path before `appendTurn()`. Reloading that new conversation can lose the visible exchange.

Fix: cache the data/result payload only. Include the complete normalized action context and effective authorization scope in its key. Persist a fresh user/assistant turn with new IDs on every successful request, including cache hits. Never reuse another conversation's message identity. Do not cache transient provider failures as ordinary reusable answers.

### F6 — P2: Assistant CSV exports do not neutralize formulas

File: `src/services/assistant/assistant-export.service.js`.

`csvEscape()` handles quotes and delimiters but not spreadsheet formula prefixes. The actual stream exporter, with a controlled cursor containing customer name `=1+1`, outputs:

```text
name
=1+1
```

Fix: apply the project's established spreadsheet formula escaping policy to untrusted text, including leading control/whitespace cases. Preserve typed numbers and money. Add CSV and XLSX tests that inspect produced cells/bytes. Quoting a CSV cell alone is insufficient.

### F7 — P2: LLM requests have no explicit timeout/cancellation

File: `src/integrations/llm/gemini.js`.

Both interpretation and narration call `fetch` without an abort signal or an application deadline. Database query time limits do not bound the preceding/following provider requests. A slow provider can leave chat waiting indefinitely from the application's perspective; interpretation can also make a corrective second call.

Fix: bounded provider timeouts plus an overall request budget, cancellation propagation, bounded retries, and a useful recoverable UI error. Keep deterministic results available when narration fails. Do not represent a timeout as a normal clarification and cache it.

### F8 — P2: Average/min/max money results have incorrect units

File: `src/services/assistant/response-bundle.js`.

The chart/table treats only `aggregate.fn === "sum"` as currency. For an average collection of 50,000 paise, the generated chart has `yAxisType: "count"` and the table labels 50,000 as “Count”, rather than showing ₹500. Ungrouped non-count aggregates also need dedicated scalar result handling instead of a count-only summary.

Fix: derive display units from the aggregated field's type, independently of the operation. Cover sum/average/min/max, grouped and scalar cases, and propagate those units into narration/export.

### F9 — P2: Customer open-order summary uses nonexistent redemption states

File: `src/services/digital-metals-customer-orders.service.js`.

`listCustomerOpenOrdersSummary()` includes `QUOTE_ACCEPTED`, `CHARGE_PAYMENT_PENDING`, and `CHARGE_PAYMENT_FAILED` for redemption. The actual model uses `RESERVED` and `CHARGE_PENDING`, and checkout creates non-zero-charge orders as `CHARGE_PENDING`. These pending orders are therefore omitted. The sell list also omits `RESERVED`; the buy summary omits `PAYMENT_VERIFIED` recovery work.

Fix: centralize the actual lifecycle status sets used for summary/history/resume actions. Assert that pending-charge, reserved-sell and verified-but-not-yet-credited buys remain visible after reload and during allowed legacy access.

### F10 — P2: Payout/payable operational lists truncate without a cursor

File: `src/services/digital-metals-payout.service.js`.

`listAdminPayables()` and `listAdminPayouts()` return at most 100 rows, with no continuation cursor or has-more metadata. Newer sell/redemption/buy lists have real cursor pagination, but the payout queues remain capped. Older outstanding work can become unreachable through these list APIs.

Fix: server-side cursor pagination and filters applied before paging, DTO metadata, RTK/UI paging, and a regression dataset exceeding the cap. Do not paginate only the first fetched page in the browser.

### F11 — P2: Checkout policy still defaults non-production to demo

File: `src/lib/digital-metals-demo-policy.js`.

The centralized policy and persisted checkout modes are improvements, but the unset mode defaults to `demo`; unknown values also fall back to demo. Reproduced with `NODE_ENV=development`, `PROVIDER_MODE=live`, and the Digital Metals checkout mode unset: **DIGITAL_METALS_DEMO**.

Production explicitly returns LIVE_REQUIRED; **this is not a demonstrated production free-credit bypass**. It does make staging/live-provider verification misleading and makes a configuration typo silently select simulation.

Fix: require explicit validated demo/mock opt-in outside tests; unknown configuration must fail startup, and live provider mode must not silently become demo. Preserve the persisted payment-attempt mode checks and the production prohibition.

## What improved in Digital Metals

Source now contains the previously requested branch/customer scope helpers and applies them to order lists and document access; sell acknowledgement amounts resolve the actual settlement field; customer buy/sell/redemption history APIs and UI exist; admin bank verification/disable endpoints are wired into RTK; bank listing no longer auto-verifies destinations. Persisted checkout mode separates existing mock attempts from live attempts.

The wallet, sale/payable, physical redemption, fulfilment and hedge architecture remains present. This review does not establish that every concurrency, payment-provider and fulfilment path is production proven.

## Ecommerce review boundary

The ecommerce source paths are largely unchanged from the preceding export. I checked the relevant shared PhonePe integration, the assistant ecommerce report access path, customer order/quote/payment replay guards, and promotion chunk revalidation/reconciliation. The existing product/category/rate campaign pipeline and lease-based per-chunk validation are present.

No new independent ecommerce transaction defect was reproduced in this pass. **That is not an all-clear:** the assistant query defect affects scheme/customer reporting, shared provider configuration still needs staging checks, and the full ecommerce release, cancellation/refund concurrency and physical FCM matrix could not be rerun here.

## UI patch included

The frontend-only patch makes Sidekick more prominent and usable:
- Header “Ask Sidekick” entry, permission-gated using the actual user.
- Desktop default grows from 440×640 to 880×760, clamped to the viewport.
- Expand/restore workspace, new-chat control, history, minimize and close.
- Full mobile viewport with safe-area footer; desktop resize/drag remains.
- Larger introductory layout and useful supported example questions.
- Accessible multiline input, Enter/Shift+Enter handling and Escape close.
- Full table columns with horizontal scrolling and optional expansion of loaded rows.
- Correct union narrowing for export field controls.
- Cache-age copy replaces the unsupported “live data” claim.

This patch does **not** implement backend audit fixes, new Digital Metals AI tools, provider streaming, or a dedicated routed assistant page. Existing conversation-switch races and request recovery in `useAssistantChat` still merit additional tests; it has no stale-response guard when switching conversations during a request.

## Verification actually performed

| Check | Result |
|---|---|
| Original backend lint | FAIL: two assistant unused-variable errors |
| Backend route coverage | PASS: 471 applicable contract routes |
| Original frontend typecheck | FAIL: assistant export union and session/user argument errors |
| Patched frontend typecheck | PASS |
| Patched assistant + admin-shell + new test ESLint | PASS |
| Existing Digital Metals portal tests | PASS: 31/31 across 17 files |
| New assistant workspace component tests | PASS: 5/5 |
| Backend interpretation/refinement pure tests | PASS: 10/10 |
| Isolated design preview production bundle | PASS; this is not the complete portal production build |
| Compiler, cache/history, CSV, aggregate-format and order-replay reproductions | Actual functions with controlled inputs/model/Redis stubs; no live tenant data |
| Mongo-backed assistant integration tests | BLOCKED: MongoMemoryServer process exits with code 100 in this runtime |
| Browser visual pass | NOT VERIFIED: remote browser could not reach local preview server |
| Full backend release / live PhonePe / real storage / physical FCM | NOT RUN in this review |

## Finish before launch

1. Resolve F1–F4 before enabling the assistant for staff or accepting production Digital Metals use. Complete F5–F11 before calling the corresponding features launch-ready.
2. Show answer provenance: active showroom scope, exact period, source report/tool, as-of time, cache state and a source-view action.
3. Decide which customer/staff fields may be sent to the LLM. Narration currently receives sample rows that can contain customer names and mobile numbers. Minimize fields deliberately; do not assume model interpretation is the only outbound payload.
4. If Digital Metals questions are advertised, add narrow read-only tools for wallets/orders/payables/redemption/hedge with the same subject/scope checks and explicit money/weight units. Label unsupported tools honestly until then.
5. Run the final unpiped backend release, portal typecheck/test/build, and real browser flows at 390/768/1440. Confirm scope denial, failed/retried provider requests, history reload and export bytes, not only happy paths.
6. Complete staging checks for verified PhonePe buy/redemption/refund, live object-storage PDFs, Redis worker restart/retained jobs, physical FCM, manual bank settlement evidence, pickup and courier handover. No stock-availability gate should be added to digital buys.

No deployment, source-tree commit, live financial transaction, or live broadcast was performed.
