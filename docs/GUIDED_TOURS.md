# Guided tours (on-screen walkthroughs)

Spotlight + tooltip walkthroughs that move a user through a real task on the real
screens: 79 guides covering customers, KYC, schemes (fixed, gold-weight, flexible),
enrolments, payments, dues, redemption, cash, gold rates, the online store, COD,
Digi Gold, reminders, reports, support, staff, branches and settings.

They start from:

- **Sidekick**: "how do I accept a COD order?" returns an answer with a
  *Show me step by step* button (`bundle.guide`).
- **Guides** (graduation-cap button in the top bar): a searchable panel of every guide.
- **Dashboard**: the first-login welcome prompt, and *Show me* on setup-checklist tasks.

Keyboard: → next / do it, ← back, Esc ends the guide.

## Files

| Where | What |
|---|---|
| `src/lib/tours/tours/*.ts` | The guides, one file per area |
| `src/lib/tours/tours/helpers.ts` | Step builders (`nav`, `opener`, `field`, `submit`, `pickRow`, `tab`, `section`) |
| `src/lib/tours/types.ts` | Step options |
| `src/lib/tours/dom.ts` | How steps find elements on screen |
| `src/components/tour/tour-provider.tsx` | Engine: navigation, finding elements, advancing, keyboard |
| `src/components/tour/tour-overlay.tsx` | Spotlight and card, positioned every frame on the GPU |
| `src/components/tour/guides-menu.tsx` | The searchable Guides panel |
| `backend/.../agent/guide-catalog.js` | Generated copy for Sidekick (`pnpm guides:export`) |

## Pointing a step at something

Most steps need no new markup:

| Step option | Finds |
|---|---|
| `text: "Create customer"` | the button / link / tab with that visible text (exact match wins, else "starts with") |
| `field: "Mobile number"` | the form field whose `<FieldLabel>` starts with that text |
| `section: "Customer tools"` | the card / section with that heading (combine with `text` or `field` to look inside it) |
| `selector: "table"` | a CSS selector (with `text`, the matching element with that text) |
| `target: "@dialog"` | the open dialog or side sheet (dialogs are outside `<main>`) |
| `target: "@header"`, `"@main"`, `"@tabs"`, `"@sidekick"` | page title bar, page content, first tab row, Sidekick column |
| `target: "my-id"` | an element with `data-tour="my-id"`: use for things with no stable text |

How a step moves on:

| `advance` | Moves on when… | "Do it for me" |
|---|---|---|
| (none) | the user presses Next | — |
| `"click"` | the user clicks the element | clicks it |
| `"selected"` | the tab / wizard step is clicked or becomes current another way | clicks it |
| `{ route: "^/customers/[^/]+$" }` | the URL matches (user opened a row) | opens the first row |

`route: "/customers"` makes the guide navigate there first. `optional: true` skips the step
silently when it isn't on screen (plan, role, phone layout). `backTo: "open"` returns to the
"open the form" step when the user closes the dialog. Steps that only get the user to a page
(menu clicks, "open the customer") are skipped when they're already there.

## Adding or changing a guide

1. Add it to the right file in `src/lib/tours/tours/`. Examples are only shown, never typed
   in, and the last step points at Save without clicking it.
2. `pnpm guides:export` regenerates Sidekick's catalogue (`registry.test.ts` fails if you forget).
3. Check it on screen: start the app in mock mode (`NEXT_PUBLIC_USE_MOCKS=true pnpm dev --port 3123`),
   then `pnpm guides:check` (all guides) or `node scripts/check-guides.cjs add-customer`. It walks
   each guide like a user and lists any step whose element wasn't found.

Progress (welcome tour seen, guides finished) is stored per tenant + user in the browser
(`localStorage`). Moving it to the user profile on the API would make it follow the user
across devices.
