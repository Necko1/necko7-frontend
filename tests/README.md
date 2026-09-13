# Frontend workflow and visual checks

Install dependencies with `npm ci`, then run `npm test`. Windows uses installed
Microsoft Edge; other platforms use Playwright Chromium (`npx playwright install
chromium`). Override with `PLAYWRIGHT_CHANNEL` when needed. Tests start a local Vite
server at port 4173 and mock all API responses; no real market/Twitch changes occur.

The responsive test visits twelve operational/community pages at four widths.
Screenshots are written to `test-results/visual`. Inspect these visually: overflow
assertions alone do not evaluate composition, contrast, or interaction quality.

Before merging, review real item artwork and long/localized content, sign in as an
owner/editor/viewer, and check live settings and transaction state in staging.
Financial actions in this suite exercise request intent and confirmations only.
