# Customer Digital Gold & Silver UI overhaul (2026-10-21)

## Screen checklist (routed components)

| Route (customer slug) | Component | Status |
|------------------------|-----------|--------|
| `digital-metals` | `CustomerDigitalMetalsPage` | Overhauled — wallet cards, quick actions, passbook, statements |
| `digital-metals/buy` | `CustomerDigitalMetalsBuyPage` | Overhauled — capability-driven asset, budget input |
| `digital-metals/review/:quoteId` | `CustomerDigitalMetalsBuyReviewPage` | Quote breakdown + terms |
| `digital-metals/order/:orderId` | `CustomerDigitalMetalsBuyOrderPage` | Payment timeline + retry-safe idempotency |
| `digital-metals/sell` | `CustomerDigitalMetalsSellPage` | Holdings picker + grams |
| `digital-metals/sell-review/:quoteId` | `CustomerDigitalMetalsSellReviewPage` | Sell quote + bank select |
| `digital-metals/sell-order/:orderId` | `CustomerDigitalMetalsSellOrderPage` | Sale vs payout timelines |
| `digital-metals/bank` | `CustomerDigitalMetalsBankPage` | List / add accounts |
| `digital-metals/bank-edit/:id` | `CustomerDigitalMetalsBankEditPage` | Reconfirm account |
| `digital-metals/redeem` | `CustomerDigitalMetalsRedeemCatalogPage` | Catalogue cards |
| `digital-metals/redeem-review/:quoteId` | `CustomerDigitalMetalsRedeemReviewPage` | Metal + INR charge breakdown |
| `digital-metals/redeem-order/:orderId` | `CustomerDigitalMetalsRedeemOrderPage` | Fulfilment timeline, pickup reveal |
| `digital-metals/document/:artifactId` | `CustomerDigitalMetalsDocumentPage` | Document shell |

Shared layout: `customer-digital-metals-shared.tsx`, passbook copy: `customer-digital-metals-passbook-ui.ts`, statement dates: `customer-digital-metals-statement-dates.ts`.

## Visual verification

**Status:** Not completed in this session — local portal/API/worker stack was not kept running for Playwright capture at 390 / 768 / 1440px.

**Before screenshots:** Not archived (pre-overhaul UI existed only in the prior working tree).

**After screenshots:** Pending — run portal with demo tenant, then capture:

- Portfolio, buy review, sell review, bank list, redemption catalogue/order, statement panel

Suggested path after `npm run dev` (Tenant-Admin) + backend on `:4000`:

`/customer/kairali/digital-metals` and flow routes above.

## Tests (2026-10-21)

| Suite | Result |
|-------|--------|
| `npm run typecheck` | pass |
| `customer-digital-metals-buy-silver.test.tsx` | 1/1 |
| `customer-digital-metals-portfolio-ui.test.tsx` | 1/1 |
| `customer-digital-metals-bank-copy.test.tsx` | 1/1 |
| `customer-digital-metals-statement-dates.test.ts` | 1/1 |
| `digital-metals-quote-preview.test.tsx` | 4/4 |
| `digital-metals-customer-sell.test.tsx` | 2/2 |
| `digital-metals-redeem.test.tsx` | 1/1 |
| `digital-metals-deep-link.test.ts` | pass |

## Remaining gaps

- Browser screenshots and responsive polish pass (overflow/spacing) on real API data.
- Expanded flow tests (buy payment harness, redemption pickup reveal) with MSW payload assertions.
- Full `npm run test:release` / Playwright phase-9 customer flows A–D.
- Staging: live payment gateway, FCM deep-link smoke on device.

**Not declaring** full Digital Metals product release complete.
