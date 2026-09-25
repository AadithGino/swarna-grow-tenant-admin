# Tenant Admin alignment — backend 8e014b7

Authoritative backend: `https://github.com/AadithGino/swarna-grow-backend.git` at
commit `8e014b7e25e1db80814a5a1922734b32d1a80340`.

This frontend pass was compared directly against the latest backend source. The deprecated `swarna-grow-api-contract-v1.2` bundle was not used and is excluded from the release ZIP.

## Included in this phase

- Current scheme, enrollment, payment, refund, and redemption states.
- Plan builder removal of CHEQUE, PRORATE, and TRANSFER_TO_SCHEME.
- Fixed-only per-transaction caps; flexible cap/increment and gold rounding configuration.
- Required customer address.
- Atomic staff-assisted first payment and post-enrollment payment-link creation.
- Mode-authoritative redemption previews and purchase-adjustment bill numbers.
- Net/gross/refunded payment presentation and PhonePe refund initiation/history/reconcile/manual release.
- Always-visible Collections tabs for Payments, PhonePe refunds, and Daily settlement; refund tools no longer depend on discovering a row-only action.
- Detailed PhonePe poll results.
- Daily PhonePe settlement statement upload, run visibility, mismatch review, and resolution.
- Inbound WhatsApp message list, detail, and mark-read workflow.
- Strict reminder settings writes.
- Correct cash-handover accept/reject/discrepancy bodies.
- Redemption KYC, customer maintenance, KYC type, and 22K operations controls.
- Invoice-number display precedence.

## Verification

- `npm run build`: pass.
- Targeted ESLint for the new gateway/refund/inbound UI: pass.
- The repository's pre-existing global TypeScript and ESLint debt spans the other portals and older Tenant Admin components; it is not introduced by this alignment pass. The production bundler completes successfully.

## Explicit scope

This is the Tenant Admin phase. Customer, staff/agent, and platform portal alignment remains a separate phase.
