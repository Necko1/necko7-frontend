# Operational control panel redesign

## Audit and scope

The application uses React Query for server state, Zustand for the selected channel,
cookie sessions, React Router, and English/Russian translations. The backend is Rust.
Owners and editors operate rewards, settings and redemptions; only owners can list,
grant or revoke editor access. Viewers use public rewards and their own profiles.
Keep all fixed/pool/filter reward configuration, pricing, limits, messages, image
downloads, public visibility, chat history, rankings and profile functionality.

Critical issues: no attention queue on the overview; immediate financial and point
actions; nested buttons in redemption rows; empty-state fallbacks for API errors;
stale rows while changing filters; hidden settings navigation; owner-only controls
shown to editors; narrow reward cards; unvalidated settings inputs; oversized,
inconsistent surfaces and poor mobile density. Existing lint warnings were recorded
before changes. The backend's untracked .idea and the frontend's deleted OpenAPI file are pre-existing.

## Implementation plan

1. Foundation: graphite surfaces, mint primary actions, amber attention, blue progress,
   green completion and red failures. Figtree, 4px spacing, restrained radii, visible
   keyboard focus, reduced motion, shared page/state/confirmation primitives.
2. Shell: clearly branded channel workspace; Operations, Configuration, Community;
   permanent settings and held queue entries; accessible mobile dialog navigation.
3. Overview and redemptions: live attention counts, setup readiness, compact ledger,
   failure explanations, expandable details and explicit action confirmations.
   Never infer a successful purchase from a retry request alone.
4. Settings: market-first setup, grouped two-column section layouts, validated save
   form, dirty state, feedback, owner-only permissions. Preserve all existing options.
5. Lightweight driver.js contextual tour, scoped to user/channel/role in localStorage,
   skip/restart, responsive targets, no real mutations. Setup checklist uses API data.
6. Remaining pages: shared spacing and surfaces, readable reward grid, consistent
   dialogs and errors, public/auth identity, contextual feedback.
7. Verify production build, lint, workflow regression tests and rendered pages at
   desktop/laptop/tablet/mobile. Use isolated mock API responses for visual QA;
   do not execute purchases, refunds or settings writes against a live account.

No backend change is required for the planned UX: filtered totals and setup flags
already exist. Browser-local onboarding persistence is deliberate and lightweight.

## Implemented visual direction — second pass

The first rendered baseline is retained in `.qa/baseline` locally. The second pass
keeps the operational structure and replaces the generic card composition with an
open register: a cut-seven wordmark, condensed display typography, graphite and
paper neutrals, restrained acid-lime navigation/actions, and amber manual review.

The overview uses real held entries beside a market/setup rail. Transactions use
column labels, alternating quiet rows, status marks and inline expansion. Rewards
and the public catalog share open image plates and separated pricing. Settings use
numbered sections; wizard progress is a compact numbered rail. Dialogs use the same
type hierarchy and retain viewport gutters. Shared styles live in `src/index.css`;
PageHeader, QueryError, EmptyState, ConfirmAction and Brand are reusable primitives.

Route-level lazy loading preserves the shell during page loading. Channel selection
waits for initialization, errors are distinct from empty states, mutations invalidate
operational summaries, and consequential actions require confirmation. Settings
message/catalog edits survive background refreshes.

## Verification and review boundaries

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` are the checks.
Lint retains existing React effect/dependency and shared-export warnings. The build
still reports a shared entry chunk above 500 kB; route pages are split. No backend
code or transaction logic was changed.

Playwright isolates every API and external request. It exercises permissions,
confirmation/cancellation, filters/pagination, numeric validation, tour skip/restart
and completion, dialog Escape behavior, and rendering across 1440/1280/768/390px.
Screenshots go to `test-results/visual`; `.qa` and test output are ignored by git.
These checks do not prove real OAuth, live market images, Twitch writes, purchases,
refunds or delivery. Review those integrations in a controlled staging account.
Onboarding persistence is browser-local, so another browser can show the guide again.
The long message-template editor remains dense; a full editor redesign and cross-device
onboarding synchronization are intentionally outside this pass.

Final verification: 13 Playwright tests passed, including 48 page/viewport renders.
Final selected captures are retained locally in `.qa/final`. Barlow Condensed is
paired with a bundled Roboto Condensed Cyrillic subset for Russian headings.
