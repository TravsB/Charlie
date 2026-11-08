# NEXUS AI

NEXUS AI is a supervised workspace for coordinating AI teams across projects, tasks, approvals, and deliverables.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (workflow-injected port)
- `pnpm --filter @workspace/nexus-ai run dev` — run the NEXUS AI web app
- `pnpm run typecheck` — full typecheck across all packages
- `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/nexus-ai run build` — build the web app
- `pnpm --filter @workspace/api-server run build` — build the API server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate Drizzle SQL migrations
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Local infra: `docker compose up -d postgres redis` (outside Replit; Redis is not connected in Phase 1)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nexus-ai/` — React/Vite web application
- `artifacts/api-server/` — Express API
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — Drizzle database models
- `lib/db/migrations/` — generated SQL migrations
- `docs/architecture/` — phased roadmap and architecture decisions

## Architecture decisions

- Replit's runnable stack is React/Vite + Express + Drizzle; preserve the blueprint's modular monolith boundaries.
- PostgreSQL is authoritative. Redis is configured for local infrastructure but is not used by Phase 1.
- The project is built phase by phase; do not add orchestration behavior before its planned milestone.

## Product

Phase 1 provides the web/API foundation and service health checks. Projects, identity, provider connections, agents, and orchestration are planned but not implemented yet.

## User preferences

- Build NEXUS AI in the documented phases and verify each phase before starting the next.

## Gotchas

- Update `lib/api-spec/openapi.yaml` before implementing API routes and rerun codegen after every contract change.
- Production database schema changes are managed through Replit's Publish flow; do not add startup-time DDL or custom production migration hooks.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
