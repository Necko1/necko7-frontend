100% vibecoded slop
## CS2 Integration

Owners and Editors can use Scripts, including `/scripts/cs2` integration status. Only Owners can create/renew pairing codes or revoke devices; Editors receive no pairing credential or deep link. The page uses the existing Axios session and React Query architecture, renews expired five-minute codes for Owners, opens `necko7-cs2i://pair?code=...`, polls paired state every 15 seconds and supports Owner revocation.

The download defaults to the stable latest GitHub Release installer asset. `VITE_CS2_DOWNLOAD_URL` at build time or `CS2_DOWNLOAD_URL` in Docker/runtime config can override it with another HTTPS URL. Backend routing and authentication configuration are unchanged. See [the companion README](../necko7-cs2i/README.md) for cross-project development, installer and troubleshooting instructions. Run `npm test -- tests/cs2.spec.ts` for focused workflow/permission tests.

CS2 QA: pairing-code requests are deduplicated/cached and never refetched on focus. Check connection reports a fresh status result while retaining a valid cached code; Retry is reserved for failed requests. Opening the app gives honest browser/installation guidance without claiming to detect installed software. Desktop heartbeat reachability is separate from last received CS2 data.

## Scripting documentation

The static VitePress site is in `docs/site`; `npm run build` builds both dashboard and docs into `dist`, with docs under `dist/docs/scripting`. The existing Docker/nginx deployment serves that path separately from SPA routes. `npm run docs:dev` previews source at http://127.0.0.1:4174/docs/scripting/; production docs are linked from Scripts and the Editor's project menu.

See [docs/README.md](docs/README.md) for catalog synchronization, drift checks, generated API/cookbook pages, deployment and internal-link validation. `SCRIPTING_DOCS_URL` (runtime) / `VITE_SCRIPTING_DOCS_URL` (build) can point to a separately hosted static site; the default production path is `/docs/scripting/`.
