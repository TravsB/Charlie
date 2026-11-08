# Architecture decisions

- Keep one modular monolith for the initial release. Application services own business rules; orchestration owns execution state and scheduling; provider adapters and agent runtime remain separate boundaries.
- Use the Replit pnpm workspace stack for the runnable product: React/Vite, Express, Drizzle, and managed PostgreSQL. This is the platform-compatible implementation of the blueprint's Next.js/FastAPI/Alembic proposal.
- Use PostgreSQL as the durable source of truth. WebSocket or Redis delivery must not become the source of truth when realtime execution is added.
- Keep Redis in local Compose configuration for the later event-bus phase. Phase 1 does not claim a live Redis connection.
- Store provider credentials only in managed secrets or secure references; do not persist raw credentials in agent configuration or application records.
- Agent suggestions do not authorize actions. Backend permission and approval checks must control execution.
