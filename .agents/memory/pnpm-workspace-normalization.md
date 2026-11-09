---
name: pnpm workspace normalization
description: Keep pnpm package additions from introducing unrelated workspace configuration changes.
---

After adding a package in this workspace, inspect `pnpm-workspace.yaml` and the lockfile diff. pnpm may reserialize the workspace file, remove explanatory comments, reorder overrides, or pin a catalog entry. Preserve the existing release-age policy and overrides, revert unrelated normalization, and keep the lockfile catalog specifier consistent with the intended workspace range.

**Why:** A scoped package addition unexpectedly rewrote workspace policy documentation and override formatting.

**How to apply:** Before finishing a dependency change, compare the workspace configuration with its prior state and retain only the intended package and lockfile updates.
