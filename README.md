# NEXUS AI

NEXUS AI is a supervised workspace for coordinating AI teams across projects, tasks, approvals, and deliverables. It is being built in phases so each milestone can be run and checked before orchestration is added.

## Phase 1: Foundation

Phase 1 establishes the runnable application shell, API health checks, PostgreSQL models, local PostgreSQL/Redis configuration, and contributor documentation. AI providers, authentication flows, agent execution, and orchestration are intentionally deferred to later phases.

## Stack for this Replit project

This project uses the Replit workspace's supported pnpm monorepo: React + Vite, Express 5, Drizzle ORM, and PostgreSQL. This differs from the blueprint's Next.js + FastAPI + Alembic stack, but keeps its modular-monolith boundaries and lets the project run in the current Replit environment. Docker Compose provides local PostgreSQL and Redis for development outside Replit; Replit workflows use the managed PostgreSQL database. Redis is configured now and will be connected when the event-bus phase begins.

## Run and verify

The Replit workflows start the web app and API server. Useful commands:

```bash
pnpm run typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/nexus-ai run build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run push
```

The API exposes:

- `GET /api/healthz` — process liveness
- `GET /api/readyz` — API and PostgreSQL readiness

For local infrastructure outside Replit, copy `.env.example` to `.env` and run:

```bash
docker compose up -d postgres redis
```

The Compose file starts only the infrastructure dependencies. Run the web and API packages using the workspace scripts after loading your local `.env` values into the shell.

## Repository map

- `artifacts/nexus-ai/` — NEXUS AI web application
- `artifacts/api-server/` — shared Express API
- `lib/api-spec/` — source OpenAPI contract
- `lib/api-client-react/` and `lib/api-zod/` — generated API client, hooks, and validation
- `lib/db/src/schema/` — Drizzle models
- `lib/db/migrations/` — generated PostgreSQL migration snapshots
- `docs/architecture/` — architecture decisions and phased delivery gates
- `docker-compose.yml` — local PostgreSQL and Redis

See [the implementation roadmap](docs/architecture/implementation-roadmap.md) for phase boundaries and acceptance gates.
