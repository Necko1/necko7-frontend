# Scripting documentation maintenance

Public static VitePress site: `docs/site`. Framework configuration/theme: `docs/.vitepress`. Production frontend build includes static output in `dist/docs/scripting`; the existing Docker static copy includes it. No publishing/deployment is performed by these commands.

The production Docker builder uses Node 22 / npm 10. Regenerate lockfiles with that npm major, for example `npx --yes npm@10.9.9 install --package-lock-only --ignore-scripts`. npm 11 can omit nested optional React 18 peers used by VitePress's DocSearch package while the dashboard remains on React 19. A successful build against existing node_modules is not a clean-install check. Before publishing, run `docker build --no-cache -t necko7-frontend:qa .`; the Verify frontend image workflow performs this build and checks documentation routes on pushes/PRs without publishing an image. Do not bypass npm ci with legacy-peer-deps or replace it with npm install in production.

```sh
npm ci
npm run api:sync
npm run docs:check
npm run docs:build
npm run docs:dev
```

`api:sync` copies the canonical API catalog, event catalog and tested recipes from the sibling backend `docs/scripting/{api,events,recipes}.json`, then generates reference/cookbook Markdown. Set SCRIPTING_SOURCE_ROOT for a different backend checkout. Generated Markdown is versioned and must not be edited manually. The frontend can build independently from its versioned JSON snapshots. When the backend checkout exists, generate/check reject any catalog drift instead of silently accepting it.

Backend runtime tests inspect native function signatures/arity, exercise every catalog invocation, verify context properties against serialized types, pin the documented Rhai version and execute every recipe's scenarios (including error/empty/gap paths). Monaco completion/hover and public reference use the exact same catalog snapshot. This is a documentation contract, not a new runtime API or language server. Behavioral prose still needs review when service semantics change; tests cannot prove every prose claim.

The CS2 events reference is one page with a dedicated anchor/section for every event, typed field explanations, an event-specific fragment, expandable complete JSON and a tested main.rhai handler. The backend runs events.json observation pairs through the real normalizer and checks full serialization; an exhaustive EventKind match catches new variants. Handler tests exercise correct-kind, wrong-kind and unknown-value inputs. Edit the backend catalog and sync, not the generated events.md page. Counter descriptions must explicitly identify whose counter it is and whether it covers this update, this round or this match; do not leave "cumulative" unqualified.

`docs:build` rejects stale generated content before VitePress dead-link checks and static internal path/fragment validation. `npm run build` builds the dashboard and docs together. Serve `/docs/scripting/` as static files with `.html` resolution, not the dashboard SPA fallback. Docs are public and contain no credentials. The search index is local; no external search account required.

VitePress 1.6.4 uses a scoped npm override to patched Vite 6.4.3+ because its original Vite 5 dev-server dependency has known security issues. Keep this override until a stable framework release incorporates a patched dependency. Preview/dev servers bind loopback only; production serves static files, never a docs development server. Build and browser tests cover the override.

Development: dashboard on 4173, docs on 4174 via `docs:dev` or `docs:preview`. Production link defaults to `/docs/scripting/`. Optional VITE_SCRIPTING_DOCS_URL (build/dev) or SCRIPTING_DOCS_URL (Docker runtime) can select a separately hosted site; use an http(s) URL with a trailing slash. Nginx includes the static directory in the normal frontend artifact; do not point a separate URL at an unbuilt site.

Keep API version/Rhai version metadata aligned with the source contract. A backend package patch does not automatically mean the scripting API changed. For a signature change: update the canonical catalog, runtime tests, recipes, sync both repos, and build/check docs. Prefer adding regression scenarios over a broad code generator.
