---
name: Drizzle migration output
description: Drizzle Kit path handling when invoked through a pnpm-filtered workspace command.
---

When generating migrations from `lib/db` through pnpm, configure Drizzle Kit's `out` as a package-relative path such as `./migrations`. An absolute path formed with `path.join(__dirname, ...)` was normalized as `.//home/...` and Drizzle then failed to locate its existing snapshot.

**Why:** The filtered workspace invocation made Drizzle Kit resolve its migration output against the package directory in a way that mishandled an absolute `out` path.

**How to apply:** If migration generation cannot find snapshots despite the files being present, check whether `out` is absolute and prefer `./migrations` before changing snapshot files or regenerating the migration history.
