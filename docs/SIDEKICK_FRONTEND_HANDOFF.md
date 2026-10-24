# Updated full frontend handoff — 22 October 2026

This is the complete Tenant Admin/frontend source export based on the supplied 2026-10-22T095621Z archive, with the Sidekick workspace changes integrated. It includes the existing customer, tenant-admin and platform portal code. It is not a backend export.

To install into the matching local checkout, copy the extracted archive's contents into the frontend project and merge folders / replace matching files. Keep your local environment files and repository metadata. Do not delete your existing project folder. If you made changes after the original export, merge those changes rather than replacing them blindly.

No node_modules, build output or local environment secrets are included. Install dependencies from the existing lockfile using your usual workflow.

Integrated changes:
- Header Ask Sidekick entry with the correct user permission argument.
- 880×760 default desktop chat, viewport clamping, expand/restore, mobile full-screen layout.
- New chat/history/minimize/close controls, multiline composer and keyboard handling.
- Full result table columns and expandable loaded rows.
- Narrowed export types and five workspace regression tests.

Read docs/PRELAUNCH_REVIEW_2026-10-22.md for the remaining audit findings and docs/PRELAUNCH_FIXES_CURSOR_PROMPT.md for the complete Cursor fix prompt. Backend findings are not fixed by replacing this frontend.

Browser visual/live-provider checks remain required. This handoff does not constitute production approval.

Verified for this full frontend handoff:
- npm run typecheck: PASS.
- npm test -- src/lib/assistant-workspace.test.tsx: 5/5 PASS.
- npm run build: PASS (complete Vinext client/RSC/SSR build).
- Existing focused Digital Metals portal tests: 31/31 passed in the preceding review.
- Export completeness: all 640 original entries retained; 7 modified source files and 4 added files; 644 entries total.
- Export manifest: OK; denied paths: 0. Browser visual checks and full backend release remain open.
