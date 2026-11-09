import { and, desc, eq } from "drizzle-orm";
import { db, projectsTable, type Project } from "@workspace/db";
import { Router, type IRouter, type RequestHandler } from "express";
import { requireProjectUser } from "../middlewares/require-project-user";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";

type ProjectsRouterOptions = {
  database?: typeof db;
  authenticate?: RequestHandler;
};

const projectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toProjectResponse({ ownerId: _ownerId, ...project }: Project) {
  return project;
}

export function createProjectsRouter({
  database = db,
  authenticate = requireProjectUser,
}: ProjectsRouterOptions = {}): IRouter {
  const router: IRouter = Router();

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.use(authenticate);

  router.get("/projects", async (req, res): Promise<void> => {
    const requestedStatus = req.query.status;
    const status =
      typeof requestedStatus === "string" ? requestedStatus : "active";

    if (!["active", "archived", "all"].includes(status)) {
      res.status(400).json({ error: "Invalid project status" });
      return;
    }

    try {
      const ownerId = req.localUserId!;
      const projectStatus = status === "archived" ? "archived" : "active";
      const projects =
        status === "all"
          ? await database
              .select()
              .from(projectsTable)
              .where(eq(projectsTable.ownerId, ownerId))
              .orderBy(desc(projectsTable.updatedAt))
          : await database
              .select()
              .from(projectsTable)
              .where(
                and(
                  eq(projectsTable.ownerId, ownerId),
                  eq(projectsTable.status, projectStatus),
                ),
              )
              .orderBy(desc(projectsTable.updatedAt));

      res.json(projects.map(toProjectResponse));
    } catch (error) {
      req.log.error({ err: error }, "Failed to list projects");
      res.status(500).json({ error: "Projects could not be loaded" });
    }
  });

  router.post("/projects", async (req, res): Promise<void> => {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A valid project name is required" });
      return;
    }
    const name = parsed.data.name.trim();
    if (!name) {
      res.status(400).json({ error: "A valid project name is required" });
      return;
    }

    try {
      const [project] = await database
        .insert(projectsTable)
        .values({
          ownerId: req.localUserId!,
          name,
          description: parsed.data.description?.trim() || null,
        })
        .returning();

      res.status(201).json(toProjectResponse(project));
    } catch (error) {
      req.log.error({ err: error }, "Failed to create project");
      res.status(500).json({ error: "Project could not be created" });
    }
  });

  router.get("/projects/:projectId", async (req, res): Promise<void> => {
    const { projectId } = req.params;
    if (!projectIdPattern.test(projectId)) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    try {
      const [project] = await database
        .select()
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.id, projectId),
            eq(projectsTable.ownerId, req.localUserId!),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json(toProjectResponse(project));
    } catch (error) {
      req.log.error({ err: error }, "Failed to load project");
      res.status(500).json({ error: "Project could not be loaded" });
    }
  });

  router.patch("/projects/:projectId", async (req, res): Promise<void> => {
    const { projectId } = req.params;
    if (!projectIdPattern.test(projectId)) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      res.status(400).json({ error: "A valid project update is required" });
      return;
    }

    const changes: {
      name?: string;
      description?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim();
      if (!name) {
        res.status(400).json({ error: "Project name cannot be empty" });
        return;
      }
      changes.name = name;
    }

    if (parsed.data.description !== undefined) {
      changes.description =
        parsed.data.description === null
          ? null
          : parsed.data.description.trim() || null;
    }

    try {
      const [project] = await database
        .update(projectsTable)
        .set(changes)
        .where(
          and(
            eq(projectsTable.id, projectId),
            eq(projectsTable.ownerId, req.localUserId!),
            eq(projectsTable.status, "active"),
          ),
        )
        .returning();

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json(toProjectResponse(project));
    } catch (error) {
      req.log.error({ err: error }, "Failed to update project");
      res.status(500).json({ error: "Project could not be updated" });
    }
  });

  router.post(
    "/projects/:projectId/archive",
    async (req, res): Promise<void> => {
      const { projectId } = req.params;
      if (!projectIdPattern.test(projectId)) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      try {
        const whereOwned = and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.ownerId, req.localUserId!),
        );
        const [existing] = await database
          .select()
          .from(projectsTable)
          .where(whereOwned)
          .limit(1);

        if (!existing) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        if (existing.status === "archived") {
          res.json(toProjectResponse(existing));
          return;
        }

        const [project] = await database
          .update(projectsTable)
          .set({
            status: "archived",
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(whereOwned)
          .returning();

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        res.json(toProjectResponse(project));
      } catch (error) {
        req.log.error({ err: error }, "Failed to archive project");
        res.status(500).json({ error: "Project could not be archived" });
      }
    },
  );

  return router;
}

export default createProjectsRouter();
