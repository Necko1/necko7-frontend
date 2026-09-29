# Access and desktop pairing

| Role | Scripts | CS2 device authority |
| --- | --- | --- |
| Owner | All normal scripting operations | Create/replace pairing code, authorize desktop, revoke/unpair |
| Editor | Projects, drafts, save, validate, publish, activation/rollback, enable/disable, rename/delete, dry run, storage, matches, scheduler, logs and docs | Read useful integration status only; no pairing credentials or authority controls |
| Viewer / unrelated user | No operator scripting workspace | No device authority |

Editor is the existing channel permission, not a special scripting role. Editors can run automation with real channel side effects after publication/enable; grant this trusted role deliberately. Backend checks apply independently of the UI, and all project/storage/job/revision/snapshot queries remain channel-scoped. Audit records retain the actual human actor for editor operations.

## Owner pairing flow

Open **Scripts > CS2 Integration**. A new code expires in five minutes. Opening the installed companion uses a registered `necko7-cs2i://pair?code=...` deep link. Alternatively install the public Windows companion and enter the same code manually. The page polls status and clears the code when consumed. **Check connection** rechecks status and reports the outcome without invalidating a still-valid code. **Retry** is reserved for a failed status/code request. Expired codes renew after status reconciliation.

Pairing codes are credentials. Do not share codes or screenshots containing valid codes. A desktop claims the owner's one-shot authorization using the code and its Ed25519 public key; it does not log in as the Editor. Signed GSI/heartbeat/unpair requests prove device authority and do not accept a channel Editor cookie in place of a signature. The dashboard pairing-code and revoke mutations require Owner access. Editors never receive a code or a usable pairing deep link.

## Revocation

The Owner can revoke the channel's desktop in the dashboard. The companion can unpair only using the paired device's signature. A rejected/revoked device returns to pairing; its protected local key and owned game configuration are retained. Downloading the public installer grants no channel authority and remains available to Editors.

## Dashboard URL configuration

The companion's API and dashboard addresses are separate. `CS2_API_URL` selects backend transport. `CS2_DASHBOARD_URL` selects the user-facing frontend and opens `/scripts/cs2`, removing any supplied query and fragment. The installer can embed the dashboard origin at build time; runtime configuration can override it. Production must configure this value; missing production configuration produces an actionable opener error, never a fallback to the API origin. Debug builds without a dashboard override use `http://127.0.0.1:4173`.
