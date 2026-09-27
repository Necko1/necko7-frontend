100% vibecoded slop
## CS2 Integration

Channel owners have a CS2 Integration navigation item at `/cs2`, using the existing Axios session and React Query architecture. Editors/viewers cannot manage devices. The page renews expired five-minute pairing codes, opens `necko7-cs2i://pair?code=...`, polls paired state every 15 seconds and supports revocation. Reward processing remains outside this feature; no placeholder card is shown.

The download defaults to the stable latest GitHub Release installer asset. `VITE_CS2_DOWNLOAD_URL` at build time or `CS2_DOWNLOAD_URL` in Docker/runtime config can override it with another HTTPS URL. Backend routing and authentication configuration are unchanged. See [the companion README](../necko7-cs2i/README.md) for cross-project development, installer and troubleshooting instructions. Run `npm test -- tests/cs2.spec.ts` for focused workflow/permission tests.

CS2 QA: pairing-code requests are deduplicated/cached and never refetched on focus. The countdown renews expired codes; status polls every 15 seconds and on focus to discover completed pairing. Retry checks status first and retains a valid cached code. Desktop heartbeat reachability is separate from last received CS2 data. The default download is the stable latest GitHub Release installer asset; runtime/build configuration can still override it.
