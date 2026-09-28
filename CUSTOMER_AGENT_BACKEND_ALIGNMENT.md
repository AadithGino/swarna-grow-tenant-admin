# Customer and Collection Agent backend alignment

This build was aligned manually against backend commit `8e014b7`.

## Customer portal changes

- Uses gross, refunded, and net retained payment values; partially refunded payments remain visible.
- Fetches all payment-history cursor pages instead of silently stopping at 100 rows.
- Uses the authoritative scheme passbook endpoint for scheme-level contribution history.
- Displays settlement-preview lines and blockers before a redemption request.
- Requires and submits a bill number for `PURCHASE_ADJUSTMENT` redemption.
- Treats temporary payment-poll failures as unknown/retryable rather than payment failure.
- Enforces discrete fixed-payment amounts returned in `allowedAmountsPaise`.
- Supports per-jeweller Aadhaar/PAN KYC selection when the backend exposes allowed types.

## Collection Agent portal changes

- Removes CHEQUE; supported manual modes are CASH, UPI, CARD, and BANK_TRANSFER.
- Uses server-authoritative payable ranges and target cycles; does not calculate a UTC cycle in the browser.
- Enforces minimum, maximum, per-transaction maximum, increment, and discrete allowed amounts.
- Shows pending online reservations in the payable position.
- Uses net retained amounts and refund detail in collection history and passbook.
- Cursor-drains collection rows for date-range reports and uses the authoritative summary total/count.
- Creates 30-minute customer payment links from the current server quote.
- Shares successful receipts using the backend WhatsApp queue endpoint.
- Adds the backend-supported collection-agent notifications inbox.

## Backend response gaps that the frontend cannot safely invent

These are backend follow-ups, not missing frontend calls:

1. `tenantBrandingDto()` does not currently expose `operations.kycAllowedTypes` or redemption/self-KYC capability. The frontend accepts these fields when supplied, but a redemption-only KYC policy cannot be represented reliably until the DTO and self-KYC policy are extended.
2. `mapCustomerPaymentListItem()` maps CARD/POS payments to `PHONEPE`. The frontend supports `CARD`, but the backend DTO must preserve it for an accurate customer label.
3. Collection agents do not receive `customer.write`, `scheme.write`, `report.read`, or grievance permissions in `ROLE_PERMISSIONS`. Accordingly, this portal does not expose customer onboarding, enrolment, dues/overdues, or grievance actions to collection agents.

## Verification

- Customer and Collection Agent changed-file ESLint: pass.
- Collection Agent full-scope ESLint: pass.
- Production build (`npm run build`): pass.
- The repository has unrelated pre-existing global TypeScript/Customer lint debt outside these changed flows; it is not introduced by this alignment pass.
