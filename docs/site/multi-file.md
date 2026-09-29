# Multi-file projects

Keep the root entry small. Put reusable helpers and event/timer logic in folders:

```text
main.rhai
events/kills.rhai
events/rounds.rhai
timers/reminder.rhai
helpers/eligibility.rhai
```

## Root entry and imports

```rhai
import "events/kills" as kills;
import "timers/reminder.rhai" as reminder;
fn on_event(ctx) { kills::handle(ctx); }
fn on_timer(ctx) { reminder::handle(ctx); }
```

The main handler routes into module functions. Imports are resolved from the **project root**, not the importing file's directory. Inside `events/kills.rhai`, import `"helpers/eligibility"`, not `"../helpers/eligibility"`. `.rhai` is optional in import strings but required in stored file paths. The resolver reads only the project snapshot, never the host filesystem.

Use [the complete multi-file recipe](./cookbook/multi-file) for working module code and timer payload routing.

## Path rules

- Required entry: `main.rhai` at root; it cannot be moved, renamed or deleted in the tree.
- ASCII letters, numbers, underscore, dash and dot in path segments; no leading dot, empty segment, `.` or `..`, backslashes, absolute paths or drive names.
- Stored paths end in `.rhai`, maximum 180 bytes, maximum 64 source files and 256 KiB of combined source.
- Folders are implicit. Empty folders use an internal `_folder.rhai` comment-only marker, hidden in the tree; it counts as a source file. User code in that name is not silently hidden as a marker.
- A file cannot share a path with a folder. Collisions, traversal and moving a folder into itself are rejected.

Module import depth is at most 16, modules at most 64, circular imports fail. Module-level definitions must be pure. Host calls belong inside functions that a handler invokes.

## Create, rename, move, delete

Use the visible file tools or right-click/keyboard context menu. A folder menu creates children; a background menu creates at root. Rename preserves the directory, Move chooses a new relative path. Open file tabs retain unsaved text. Delete asks for confirmation and returns an affected open editor to the protected entry when needed. Nothing changes live source until Save and Publish.

Moving/renaming **does not automatically rewrite imports**. Update every affected import yourself, Save, then Validate. Validation compiles all files including unused modules, so a broken orphan file can block publication. File/line diagnostics let you jump to the relevant editor location. Do not assume that a successful move implies a valid project.
