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

## Product workflow pass — September 2026

This pass preserves the committed graphite/lime identity, navigation, global tokens,
role handling, confirmations and contextual guide. It restructures the remaining workflows:

- Reward creation now has item selection, behavior configuration and explicit review.
  Fixed/Pool/Filter retain their specialized editors. Optional restrictions use disclosure,
  currency-aware price protection and a live viewer summary. Per-user/channel/reward
  drafts persist as changed fields in session storage; failed saves retain them. Editing
  opens explicitly from a read-only overview with recent redemptions and sends only changes.
- Expanded purchases are cases: outcome, item/points/market amount, recorded failure,
  matching retained events, reference details and consequence-labelled resolution actions.
- Operator profiles focus on held purchases, history, chat and limit eligibility. Personal
  global profiles emphasize communities and cross-channel history; channel profiles emphasize
  local history and limits. Cash amounts remain per-purchase, avoiding mixed-currency totals.
- Shared ChatHistory supports dated groups, author context, text/viewer/period filters,
  bounded pagination and optional live refresh that pauses on old pages. Browser back restores
  applied inputs. Analytics has a compact dashboard pulse and a dedicated period-linked chart
  and leaderboard, keyboard interval selection and an accessible values table.
- Workspace selection groups owner/editor/pinned channels and reveals actual setup/held
  state on demand without switching or issuing background requests for every channel.
- Login is a shared identity entry for viewers, editors and returning streamers. Connecting
  a channel is a separate action with its additional permissions explained. Instance setup
  remains technical bootstrap: prerequisites, callback/env instructions, requested scopes
  and bot authorization. Unknown server state never enables bootstrap authorization.

Shared workflow components live in components/rewards, components/redemptions/RedemptionCase,
components/profiles/ViewerHistory and components/chat. Existing item/pool/filter editors,
settings, permission checks and transaction mutations are reused because their capabilities
remain necessary. The guide's first-run, skip, restart and permission behavior is unchanged.

### Supporting backend changes

Deploy the accompanying backend changes with this frontend. Channel logs accept an exact,
channel-scoped redemption_id UUID filter. Authorized owners/editors can request the existing
viewer channel-profile shape through /broadcasters/{channel_id}/chat/users/{user_id}/profile.
This reuses current profile calculation and permission enforcement; failed limit-count queries
now return an error rather than reporting zero usage. No migration or purchase/refund business
logic changes. The new route and log query are documented through backend OpenAPI annotations.

### Review boundaries

Browser checks use isolated representative API fixtures, not real purchases or Twitch writes.
Desktop/laptop/tablet/mobile coverage is 1440/1280/768/390px. Detailed screenshots are under
ignored test-results/product; full route captures under test-results/visual. Prior .qa baselines
are preserved. Review real OAuth (all three paths), market currency/pricing, an existing reward
edit and controlled case resolution in staging before release. Real database integration,
external artwork and live delivery cannot be proven by fixture-based tests.

Retained logs are not a complete audit trail; the case view says so. Exact Twitch cooldown
expiry and bot/deleted-message labels are not available from the current API and are not
invented. Browser-tab drafts do not synchronize across devices. Message-template editing
remains dense and was intentionally left outside this workflow pass.

Final verification for this pass: 27 Playwright tests passed, including the 48
page/viewport sweep. After the final visual review, focused case and reward-dialog
checks passed again at desktop and mobile sizes. The dialog checks now detect tab
rows overlapping their content. Type checking, production build and diff checks pass;
lint has only the existing effect/dependency/shared-export warnings. The shared entry
bundle still triggers the existing 500 kB advisory. Backend cargo check and all 68
unit tests pass. Final captures are retained in .qa/workflow-pass without replacing
older baselines. Changes remain in the current working tree for review.

## Focused workflow correction pass — 14 September 2026

This completes the requested correction pass on top of the committed redesign. The
shell, graphite/lime tokens, typography, workspace switching, shared login, instance
bootstrap, role boundaries, contextual guide and consequential-action confirmations
are preserved. No new UI dependencies were introduced.

### Corrections and reusable components

- `ProfileIdentity` reunites avatar, display name, Twitch identity and channel/account
  context on operator, global and channel profiles. Profiles have a bounded 1240px
  reading area and related content stays grouped on wide screens. Community names
  wrap even when they contain uninterrupted text.
- Personal histories retain expandable outcomes and now include item artwork and a
  contextual public-reward link. Reference IDs and purchase metadata move into a
  secondary disclosure. Operator purchase rows also regain item artwork. A reward
  that is no longer available has an explicit unavailable state at its public URL.
- Chat uses timestamp, colored author and message on the same reading line, with
  date separators and a small keyboard-accessible author filter. Continuations are
  used only for adjacent messages in an unfiltered conversation; filtered/search
  histories retain every author because omitted messages may have intervened.
  Newest-first remains the default. The optional reverse direction is explicitly
  scoped to the current page, preserving the server's existing pagination contract.
- Shared `Segments` exposes small fixed choices directly. Analytics restores 1h/6h/24h
  aggregation, visible measure selection and an aligned quiet-interval switch while
  keeping the graph design. Quiet mode actually excludes empty intervals; both modes
  bound the graph to 350 intervals. Leaderboard ranks 1–3 have restrained, dense
  visual distinctions and ranking modes stay visible.
- `BehaviorEditor` replaces the concatenated legacy configuration steps with focused
  viewer-experience, pricing/market, eligibility and usage-limit panels. Only the
  chosen panel is rendered. Type-dependent pricing, enabled chat rules, rolling
  limits and market safety reveal their controls when relevant. Live summaries,
  changed-field saves, validation, draft recovery and failed-save preservation remain.
  Resetting a draft also resets local disclosure state. Mobile editing removes the
  unrelated action bar while keeping those actions in the overview.
- `RewardShowcase` gives public Fixed/Pool/Filter details an open composition with
  reward identity, points, instructions, contents, restrictions and short-link sharing.
  `ItemManifest` shares artwork, prices, probabilities, search and incremental display
  between the showcase and `EffectiveReward`, which replaces the old technical dump.
  Full item names/messages wrap safely; the compact live summary truncates long item
  names without squeezing probabilities. Full configuration remains inspectable.
- Cases foreground meaningful retained milestones and current outcome. Repeated
  low-level records stay available under All retained events. The incomplete-audit-
  trail disclaimer and existing resolution permissions/confirmations remain.
- Logs regain a compact terminal register with line numbers, level/category, expandable
  event data, wrapped JSON and clipboard feedback. Filtering and pagination remain.
- Follow latest now has a stable switch label and checked-state meaning. Separate
  status text explains manual refresh, 10-second polling, or an automatic pause while
  reading older pages. Return to latest resumes polling. Toggling it on while reading
  an older page does not unexpectedly navigate away.

### Narrow backend support

The final contract review caught a real public-price discrepancy. Public responses
use major currency amounts, while operator reward responses use minor units. The
shared manifest now handles those contracts explicitly. Public reward conversion in
`necko7/src/api/v1/public_broadcasters.rs` now uses the existing currency-aware helper
for item prices, pool prices and displayed automatic Channel Points (USD/EUR use
1000 units; RUB uses 100). Currency accompanies published pool/filter prices even
when the headline market price is hidden. Hidden prices/chances stay hidden; an
unpublished chance is not displayed as 0%. Deploy this small backend correction with
the frontend. There is no migration, new endpoint, or purchase/refund processing change.

### Verification and rendered review

- Final full Playwright run: **39 passed**. It includes the existing 48 page/viewport
  sweep and new correction tests for identities/artwork, reward navigation, pool
  discovery, hidden probabilities, currency units, selective save payloads, draft
  reset, retained events, author filtering/grouping, aggregation and live-refresh
  pause/resume in both channel and operator-viewer chat.
- Type checking and production build pass. Lint exits successfully with the same
  existing 10 shared-export/effect/dependency warnings. The existing >500kB shared
  bundle advisory remains; no advisory is treated as a new failure.
- Backend: `cargo check` and **70 tests passed**, including new public-price and
  visibility tests for USD, EUR, RUB, manual pricing and hidden values.
- Desktop/mobile rendered review covered all affected surfaces with long URLs,
  uninterrupted strings, long usernames/items, 26-item pools, one/18-channel profiles,
  alternating/consecutive authors and held/completed/refunded/penalized/pending rows.
  Widths include 1440/390, analytics at 768, and profiles at 1920/768/390. Enabled mobile
  eligibility and rolling-limit controls were reviewed separately. Issues found and
  fixed during review included mobile community overflow, squeezed probabilities and
  false continuation grouping after filtering.
- 43 correction captures are retained locally under `.qa/correction-pass`; prior
  `.qa/workflow-pass` and earlier baselines are preserved. All browser responses and
  writes were isolated fixtures. No production purchases, refunds or Twitch writes
  were performed. Final diffs were inspected; the pre-existing deleted OpenAPI file
  and backend `.idea` directory were left untouched. This pass is not committed/pushed.

### Remaining boundaries and release review

Public Filter rewards expose configured criteria, not a promised current item list;
actual candidates change with the market. Bot/deleted-message classification and
precise Twitch cooldown expiry are not supplied by the current API and are not
invented. Retained case logs remain bounded and are not a complete audit trail.
Browser-tab drafts still do not synchronize between devices.

Fixtures use deterministic artwork/avatar substitutes to verify layout and loading,
not live CDN delivery. Real OAuth, database-backed updates, actual market artwork,
clipboard permissions across browsers and external delivery need staging review.
Before merging/deploying, check public prices against an actual USD/EUR/RUB account,
an existing reward edit with safety/chat/rolling limits, and representative profile
artwork. Review one controlled case resolution in staging. Safari/Firefox and real mobile-device testing were not performed. Broader
chat search/order APIs, bulk history tools and message-template editing remain outside
this focused correction pass.
