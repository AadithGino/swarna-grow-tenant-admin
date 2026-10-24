# Cursor prompt — finish the remaining pre-launch fixes

Work in the existing SwarnaGrow backend and Tenant Admin repositories. The updated frontend ZIP already contains the Sidekick workspace redesign and frontend chat type/permission fixes. Preserve them and all other uncommitted work. Read applicable AGENTS.md files, docs/PRELAUNCH_REVIEW_2026-10-22.md, and the existing Digital Metals spec, API contract, progress and release checklist before changing code.

Implement the fixes below, starting with P1 and continuing through all sections. Reproduce each defect, make the fix, add meaningful regression coverage, and verify the resulting behavior. Do not stop after a plan or declare success from isolated reruns. Do not commit, push, deploy, run live financial transactions or send live notifications. Keep Digital Metals independent from scheme/ecommerce. Digital buys must not be gated by physical stock availability; keep paise/microgram precision and the existing wallet/reservation/payable/handover accounting model.

1. P1 — Immutable assistant authorization scope
- In assistant/query-compiler.js, user/LLM filters must only narrow authenticated tenant/branch scope. Never merge filters over server scope with Object.assign.
- Use separate intersecting match clauses and enforce allowed branch selectors server-side. Treat the export action as untrusted input too; do not rely on the LLM prompt for security.
- Enforce the same scope for every entity, grouping, report, lookup and export. For branches, scope the branch document by its actual ID rather than assuming it has a branchId field.
- Add HTTP and compiler tests for eq/in selectors targeting another branch, mixed permitted/forbidden branches, tenant isolation, report actions and direct export requests. Assert returned rows AND aggregates, not only the presence of tenantId in a pipeline.

2. P1 — Customer-bound Digital Metals replay
- Audit createBuyOrder, createSellOrder, createRedemptionOrder, payment-attempt replay and their duplicate-key recovery paths.
- A tenant-wide idempotency lookup must never return another customer's record. Check ownership, operation/order/quote binding and a canonical request hash before returning an existing result; reject incompatible reuse without exposing the other record.
- Preserve valid same-customer replays and atomic financial behavior. If changing an index's scope is necessary, provide a dry-run/apply migration with collision detection; do not casually drop production indexes.
- Add two-customer/same-key tests, same-customer/changed-body tests, duplicate-key race recovery and valid replay tests through HTTP. Confirm no duplicate reservation, metal credit/debit, payable or physical-out event.

3. P1 — Correct question interpretation/refinement
- Fix refine-query.js so “Who paid the most last month?” remains a customer-ranked sum in the requested month. It must not become the latest receipt.
- Distinguish latest/last-payment intent from ranking and relative date phrases. Preserve customer, branch, status and date filters when refining an already valid action.
- Cover “who paid most last month”, “latest payment from Ravi last month”, “last 30 days”, monthly comparison and follow-ups. Clarify ambiguity rather than silently changing the question.

4. P1 — Restore actual build/check gates
- Fix the backend assistant unused import and unused test binding; do not suppress lint or weaken route coverage.
- Verify the redesigned frontend still passes typecheck. Keep AssistantExportable properly narrowed and permission checks using session.user.
- Gate UI on the user's actual permission and handle ASSISTANT_DISABLED/403 gracefully. Do not add permissive fallbacks.

5. P2 — Cache correctness and durable history
- Cache reusable result data rather than conversation-specific responses. Keys must incorporate complete normalized relevant action/history context, filters, dates, grouping, aggregates, effective scope and authorization context.
- Every successful request, including a cache hit, must append a fresh turn in the owned conversation and return that conversation's new message ID. Never reuse another conversation's message identity.
- Do not cache transient provider failures as normal answers. Keep as-of/cache-age information accurate.
- Test identical follow-ups after Alice vs Bob queries, different report filters, separate conversations/users, reload after a cache hit, and scope changes.
- In useAssistantChat, guard against stale initial/history/send responses overwriting a newly selected conversation. Retain or recover a failed draft and surface actionable errors instead of losing the input.

6. P2 — Safe exports and bounded provider requests
- Use the existing spreadsheet-safe escaping policy for untrusted CSV text, including =, +, -, @ and leading whitespace/control variants. Preserve real numeric values and currency. Verify CSV bytes and XLSX cell types; CSV quoting alone is not a fix.
- Validate selected fields and ensure allowed exported fields are actually projected/resolved, including nested fields. Keep scope, row caps and query deadlines.
- Add abortable interpretation/narration requests, bounded corrective retries and an overall request deadline. Propagate cancellation where feasible. Keep deterministic query/report results if narration fails.
- Add stalled-provider, abort, transient failure/retry and narration-fallback tests. Return a retryable error rather than a misleading clarification for infrastructure failures.

7. P2 — Correct financial result units
- In response-bundle.js, derive units from field metadata rather than treating only sum as currency. Money averages/min/max remain money; counts remain counts; metal weights retain their correct unit.
- Handle ungrouped scalar aggregates explicitly. Keep paise-to-rupee conversion consistent across stat cards, tables, charts, narration and exports; no double conversion or silent zero.
- Test grouped/scalar sum, avg, min, max and count. For example, 50,000 paise must display ₹500.00, not a count of 50,000.

8. P2 — Accurate pending work and real pagination
- Centralize real lifecycle status sets for customer open-order summaries and resume actions. Include redemption RESERVED/CHARGE_PENDING, sell RESERVED and buy PAYMENT_VERIFIED recovery as appropriate; remove nonexistent states such as CHARGE_PAYMENT_PENDING.
- Test reload/resume before charge payment, after failed payment, during verified-but-not-credited recovery, and when trading is paused/downgraded but legacy access is allowed.
- Add server-side cursor pagination to payout/payable lists, with stable ordering, filters applied before paging and nextCursor/hasMore metadata. Wire RTK and admin UI to it, including mocks.
- Test more than 100 entries, older outstanding work, branch scope, cross-tenant denial and filtered pagination. Browser pagination over a truncated first 100 rows is not sufficient.

9. P2 — Explicit checkout simulation policy
- digital-metals-demo-policy.js must not silently default to demo when PROVIDER_MODE=live or when an unknown mode is supplied.
- Validate configuration; require explicit demo/mock opt-in outside the test harness. Reject invalid settings clearly. Preserve production LIVE_REQUIRED behavior and immutable persisted attempt checkout modes.
- Keep bank list GET read-only and real bank verification staff-controlled. Test unset/typo/live/demo/mock configurations and in-flight attempt recovery after configuration changes.

10. Verify the entire final tree and update evidence
- Run backend npm run check; all affected assistant, Digital Metals, resend, promotion and gateway/refund regressions; and the unpiped full npm run test:release on the final tree.
- Run portal typecheck, full Vitest and production build. Use the repository's supported install/runtime workflow. Preserve real exit status when logging; do not mask failures with rg/tail pipelines. Record flakes and resolve their causes rather than treating an isolated pass as full-suite success.
- Run browser flows at 390/768/1440: header launcher, expanded/mobile chat, history reload, conversation switching during an in-flight request, failed draft recovery, scope denial, correct ranked/dated answers and export downloads. Verify customer pending buy/sell/redemption recovery and admin payout pagination.
- Preserve wallet/delivery invariants and run existing financial regression coverage. Document any environment-blocked Mongo/Redis/storage/provider checks honestly; do not turn them into passes or weaken tests.
- Show answer scope, exact period, source and as-of/cache state using authoritative metadata. Digital Metals tools are not currently in the AI catalogue: do not advertise them as supported or expand into autonomous financial actions in this fix pass.
- Review/minimize customer/staff fields sent to narration; do not send bank details, credentials or pickup codes to the LLM. Keep any policy decisions explicit.
- Update API contracts, route lock where needed, migration notes and release checklist around the final implementation. Report each issue as fixed+verified, fixed+unverified or still open, with exact commands and counts.

Deliver a concise final summary of changed behavior, test evidence, index/config rollout requirements and remaining staging checks. No production-ready claim until the required final gates and staging evidence support it.
