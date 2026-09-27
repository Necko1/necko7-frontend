100% vibecoded slop
## CS2 Integration

Channel owners have a CS2 Integration navigation item at `/cs2`, using the existing Axios session and React Query architecture. Editors/viewers cannot manage devices. The page renews expired five-minute pairing codes, opens `necko7-cs2i://pair?code=...`, polls paired state every 15 seconds and supports revocation. Rewards remain Coming soon.

Set `VITE_CS2_DOWNLOAD_URL` at build time or `CS2_DOWNLOAD_URL` in Docker/runtime config to the published HTTPS installer URL. Leave it empty until a release is published. Backend routing and authentication configuration are unchanged. See [the companion README](../necko7-cs2i/README.md) for cross-project development, installer and troubleshooting instructions. Run `npm test -- tests/cs2.spec.ts` for focused workflow/permission tests.
