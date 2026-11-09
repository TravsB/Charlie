import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { test } from "node:test";
import express, { type RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { createProjectsRouter } from "./projects";

type ProjectResponse = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
};

async function startServer(app: express.Express): Promise<Server> {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function getOrigin(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The test API server has no TCP address");
  }
  return `http://127.0.0.1:${address.port}`;
}

test("project APIs keep reads and writes private to the authenticated owner", async () => {
  const rollback = new Error("ROLLBACK_PHASE2_TEST_FIXTURES");

  try {
    await db.transaction(async (transaction) => {
      const [ownerA, ownerB] = await transaction
        .insert(usersTable)
        .values([
          { authProviderId: `phase2-test-${randomUUID()}` },
          { authProviderId: `phase2-test-${randomUUID()}` },
        ])
        .returning({ id: usersTable.id });

      const sessions = new Map([
        ["owner-a", ownerA.id],
        ["owner-b", ownerB.id],
      ]);
      const authenticateTestOwner: RequestHandler = (req, res, next) => {
        const ownerId = sessions.get(req.header("x-test-session") ?? "");
        if (!ownerId) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        req.localUserId = ownerId;
        next();
      };

      const app = express();
      app.use(express.json());
      app.use(
        "/api",
        createProjectsRouter({
          database: transaction as unknown as typeof db,
          authenticate: authenticateTestOwner,
        }),
      );

      const server = await startServer(app);
      const origin = getOrigin(server);
      const call = (session: string | null, path: string, init: RequestInit = {}) =>
        fetch(`${origin}${path}`, {
          ...init,
          headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(session ? { "x-test-session": session } : {}),
            ...init.headers,
          },
        });

      try {
        const anonymous = await call(null, "/api/projects");
        assert.equal(anonymous.status, 401);
        assert.equal(anonymous.headers.get("cache-control"), "private, no-store");

        const createdA = await call("owner-a", "/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: "  Market research  ", description: "  Initial brief  " }),
        });
        const createdB = await call("owner-b", "/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: "Private to owner B", description: "B's context" }),
        });
        assert.equal(createdA.status, 201);
        assert.equal(createdB.status, 201);
        assert.equal(createdA.headers.get("cache-control"), "private, no-store");

        const projectA = (await createdA.json()) as ProjectResponse;
        const projectB = (await createdB.json()) as ProjectResponse;
        assert.equal(projectA.name, "Market research");
        assert.equal(projectA.description, "Initial brief");
        assert.equal("ownerId" in projectA, false);
        assert.equal("ownerId" in projectB, false);

        const listA = await call("owner-a", "/api/projects");
        const listB = await call("owner-b", "/api/projects");
        const projectsA = (await listA.json()) as ProjectResponse[];
        const projectsB = (await listB.json()) as ProjectResponse[];
        assert.deepEqual(projectsA.map(({ id }) => id), [projectA.id]);
        assert.deepEqual(projectsB.map(({ id }) => id), [projectB.id]);
        assert.ok(projectsA.every((project) => !("ownerId" in project)));
        assert.ok(projectsB.every((project) => !("ownerId" in project)));

        const crossAccountRead = await call("owner-a", `/api/projects/${projectB.id}`);
        const crossAccountUpdate = await call("owner-a", `/api/projects/${projectB.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: "Overwritten by owner A" }),
        });
        const crossAccountArchive = await call(
          "owner-a",
          `/api/projects/${projectB.id}/archive`,
          { method: "POST" },
        );
        assert.equal(crossAccountRead.status, 404);
        assert.equal(crossAccountUpdate.status, 404);
        assert.equal(crossAccountArchive.status, 404);

        const updateA = await call("owner-a", `/api/projects/${projectA.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: "  Kenya market study ", description: null }),
        });
        assert.equal(updateA.status, 200);
        const updatedA = (await updateA.json()) as ProjectResponse;
        assert.equal(updatedA.name, "Kenya market study");
        assert.equal(updatedA.description, null);
        assert.equal("ownerId" in updatedA, false);

        const emptyUpdate = await call("owner-a", `/api/projects/${projectA.id}`, {
          method: "PATCH",
          body: JSON.stringify({}),
        });
        assert.equal(emptyUpdate.status, 400);

        const ownerBStillOwnsProject = await call("owner-b", `/api/projects/${projectB.id}`);
        assert.equal(ownerBStillOwnsProject.status, 200);
        const unchangedB = (await ownerBStillOwnsProject.json()) as ProjectResponse;
        assert.equal(unchangedB.name, "Private to owner B");
        assert.equal(unchangedB.description, "B's context");
        assert.equal(unchangedB.status, "active");

        const archivedA = await call("owner-a", `/api/projects/${projectA.id}/archive`, {
          method: "POST",
        });
        assert.equal(archivedA.status, 200);
        const archivedProjectA = (await archivedA.json()) as ProjectResponse;
        assert.equal(archivedProjectA.status, "archived");
        assert.ok(archivedProjectA.archivedAt);
        assert.equal("ownerId" in archivedProjectA, false);

        const archivedDetailA = await call("owner-a", `/api/projects/${projectA.id}`);
        assert.equal(archivedDetailA.status, 200);
        const readableArchive = (await archivedDetailA.json()) as ProjectResponse;
        assert.equal(readableArchive.status, "archived");
        assert.equal(readableArchive.archivedAt, archivedProjectA.archivedAt);

        const archivedListA = await call("owner-a", "/api/projects?status=archived");
        const archivedProjectsA = (await archivedListA.json()) as ProjectResponse[];
        assert.deepEqual(archivedProjectsA.map(({ id }) => id), [projectA.id]);

        const hiddenArchiveB = await call("owner-b", `/api/projects/${projectA.id}`);
        assert.equal(hiddenArchiveB.status, 404);

        const updateArchivedA = await call("owner-a", `/api/projects/${projectA.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: "Should not update" }),
        });
        assert.equal(updateArchivedA.status, 404);
      } finally {
        await closeServer(server);
      }

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
