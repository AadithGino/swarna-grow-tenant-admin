# Backend V1 alignment (swarnagrow-backend `7582ac6+`)

This portal targets the Phase 6 admin API. When in doubt, use the backend repo’s `docs/API_CONTRACT_ADMIN.md` and `src/constants/enums.js` — not the older `swarna-grow-api-contract-v1.2/` bundle in this repo.

## Enum and UX changes

| Area | Backend V1 | Portal behavior |
| --- | --- | --- |
| Manual payment modes | `CASH`, `CARD`, `UPI`, `BANK_TRANSFER` | No cheque in collect/payment dialogs, agent app, or report mocks |
| Redemption modes | `CASH`, `GOLD_HANDOVER`, `PURCHASE_ADJUSTMENT` | Plan builder and settlement flows omit transfer-to-scheme |
| Premature benefit treatment | `FORFEIT`, `FULL` only | `PRORATE` removed from plan builder; legacy values map to `FORFEIT` on load |
| Purchase adjustment | `modeDetails.billNumber` required on redeem / close / complete | Bill field on redemption and premature closure dialogs; redemption queue completion if missing at initiate |
| Maturity projection | `GET /admin/schemes/:id/maturity-projection` returns principal/benefit/amount paise + weight | Enrollment maturity tab uses API projection instead of `installment × tenure` when available |
| Settlement preview (`GOLD_WEIGHT`) | Query `mode` required (`CASH`, `GOLD_HANDOVER`, or `PURCHASE_ADJUSTMENT`); response may include `modePreviews` + `valuationNote` | Admin + customer redemption flows send `mode` and show per-mode notes/weight; customer app uses `GET /app/schemes/:id/settlement-preview` before submit |
| Collection reports | No cheque bucket | Mock charts match backend mode breakdown |

## Shared libraries

- `src/lib/v1-payment-modes.ts` — canonical manual/redemption mode lists for forms
- `src/lib/v1-maturity-projection.ts` — response adapter for maturity projection
- `src/lib/settlement-form-validation.ts` — bill number validation for purchase adjustment

## Live verification

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

Smoke: login → plan create (no PRORATE/TRANSFER) → manual payment (no CHEQUE) → maturity projection on enrollment → redeem with purchase adjustment bill number → complete handover.
