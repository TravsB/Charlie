import { and, eq } from "drizzle-orm";
import {
  db,
  projectsTable,
  providerConnectionsTable,
  type ProviderConnection,
} from "@workspace/db";
import { ConfigureProjectProviderConnectionBody } from "@workspace/api-zod";
import { Router, type IRouter, type RequestHandler } from "express";
import { requireProjectUser } from "../middlewares/require-project-user";
import {
  OPENAI_PROVIDER_KEY,
  OPENAI_SECRET_REF,
  OpenAIProviderAdapter,
  ProviderAdapterError,
  providerCapabilityKeys,
  type ModelProviderAdapter,
  type ProviderCapabilityKey,
} from "../lib/provider-registry";

type ProvidersRouterOptions = {
  database?: typeof db;
  authenticate?: RequestHandler;
  openAI?: ModelProviderAdapter;
};

const projectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toConnectionResponse(connection: ProviderConnection) {
  const capabilities = connection.capabilities.filter(
    (capability): capability is ProviderCapabilityKey =>
      providerCapabilityKeys.includes(capability as ProviderCapabilityKey),
  );
  return {
    id: connection.id,
    providerKey: connection.providerKey as typeof OPENAI_PROVIDER_KEY,
    modelIdentifier: connection.modelIdentifier,
    status: connection.status,
    capabilities,
    validatedAt: connection.validatedAt?.toISOString() ?? null,
    updatedAt: connection.updatedAt.toISOString(),
  };
}

function publicProviderError(error: unknown): string {
  if (!(error instanceof ProviderAdapterError)) {
    return "The provider could not be reached. Try again later.";
  }

  switch (error.code) {
    case "missing_credential":
      return "The server-side provider credential is not configured.";
    case "invalid_credential":
      return "The server-side provider credential was rejected.";
    case "model_unavailable":
      return "The selected model is not available to this provider account.";
    case "rate_limited":
      return "The provider is rate-limiting requests. Try again later.";
    case "invalid_provider_response":
      return "The provider returned an unexpected response.";
    case "provider_unavailable":
      return "The provider could not be reached. Try again later.";
  }
}

export function createProvidersRouter({
  database = db,
  authenticate = requireProjectUser,
  openAI = new OpenAIProviderAdapter(),
}: ProvidersRouterOptions = {}): IRouter {
  const router: IRouter = Router();

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.use(authenticate);

  async function ownedActiveProject(
    projectId: string,
    ownerId: string,
  ): Promise<boolean> {
    if (!projectIdPattern.test(projectId)) return false;
    const [project] = await database
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.ownerId, ownerId),
          eq(projectsTable.status, "active"),
        ),
      )
      .limit(1);
    return Boolean(project);
  }

  router.get("/providers", (_req, res): void => {
    res.json([
      {
        providerKey: OPENAI_PROVIDER_KEY,
        displayName: "OpenAI",
        configured: openAI.isConfigured(),
        capabilities: [...openAI.capabilities],
      },
    ]);
  });

  router.get("/providers/openai/models", async (req, res): Promise<void> => {
    if (!openAI.isConfigured()) {
      res.json({
        providerKey: OPENAI_PROVIDER_KEY,
        configured: false,
        models: [],
      });
      return;
    }

    try {
      res.json({
        providerKey: OPENAI_PROVIDER_KEY,
        configured: true,
        models: await openAI.listModels(),
      });
    } catch (error) {
      if (error instanceof ProviderAdapterError) {
        req.log.warn(
          { providerKey: OPENAI_PROVIDER_KEY, code: error.code },
          "Provider model listing failed",
        );
      } else {
        req.log.error({ err: error }, "Provider model listing failed");
      }
      res.status(502).json({ error: publicProviderError(error) });
    }
  });

  router.get(
    "/projects/:projectId/provider-connection",
    async (req, res): Promise<void> => {
      const { projectId } = req.params;
      try {
        if (!(await ownedActiveProject(projectId, req.localUserId!))) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        const [connection] = await database
          .select()
          .from(providerConnectionsTable)
          .where(eq(providerConnectionsTable.projectId, projectId))
          .limit(1);

        res.json({
          providerConfigured: openAI.isConfigured(),
          connection: connection ? toConnectionResponse(connection) : null,
        });
      } catch (error) {
        req.log.error({ err: error }, "Failed to load provider configuration");
        res.status(500).json({ error: "Provider configuration could not be loaded" });
      }
    },
  );

  router.put(
    "/projects/:projectId/provider-connection",
    async (req, res): Promise<void> => {
      const { projectId } = req.params;
      const parsed = ConfigureProjectProviderConnectionBody.safeParse(
        req.body,
      );
      if (!parsed.success || !parsed.data.modelIdentifier.trim()) {
        res.status(400).json({ error: "A valid provider and model are required" });
        return;
      }

      try {
        if (!(await ownedActiveProject(projectId, req.localUserId!))) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        const [connection] = await database
          .insert(providerConnectionsTable)
          .values({
            projectId,
            providerKey: parsed.data.providerKey,
            modelIdentifier: parsed.data.modelIdentifier.trim(),
            secretRef: OPENAI_SECRET_REF,
            status: "pending",
            capabilities: [],
            validatedAt: null,
          })
          .onConflictDoUpdate({
            target: [
              providerConnectionsTable.projectId,
              providerConnectionsTable.providerKey,
            ],
            set: {
              modelIdentifier: parsed.data.modelIdentifier.trim(),
              secretRef: OPENAI_SECRET_REF,
              status: "pending",
              capabilities: [],
              validatedAt: null,
              updatedAt: new Date(),
            },
          })
          .returning();

        if (!connection) {
          res.status(500).json({ error: "Provider selection could not be saved" });
          return;
        }
        res.json(toConnectionResponse(connection));
      } catch (error) {
        req.log.error({ err: error }, "Failed to save provider configuration");
        res.status(500).json({ error: "Provider selection could not be saved" });
      }
    },
  );

  router.post(
    "/projects/:projectId/provider-connection/validate",
    async (req, res): Promise<void> => {
      const { projectId } = req.params;
      try {
        if (!(await ownedActiveProject(projectId, req.localUserId!))) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        const [connection] = await database
          .select()
          .from(providerConnectionsTable)
          .where(eq(providerConnectionsTable.projectId, projectId))
          .limit(1);

        if (!connection || connection.providerKey !== OPENAI_PROVIDER_KEY) {
          res.status(404).json({ error: "Provider configuration not found" });
          return;
        }

        if (!openAI.isConfigured()) {
          const [pending] = await database
            .update(providerConnectionsTable)
            .set({
              status: "pending",
              capabilities: [],
              validatedAt: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(providerConnectionsTable.id, connection.id),
                eq(
                  providerConnectionsTable.modelIdentifier,
                  connection.modelIdentifier,
                ),
              ),
            )
            .returning();
          res.status(503).json({
            error: publicProviderError(
              new ProviderAdapterError("missing_credential"),
            ),
            connection: pending ? toConnectionResponse(pending) : null,
          });
          return;
        }

        let validatedCapabilities: ProviderCapabilityKey[];
        try {
          const model = await openAI.validateModel(connection.modelIdentifier);
          validatedCapabilities = model.capabilities;
        } catch (error) {
          const isModelUnavailable =
            error instanceof ProviderAdapterError &&
            error.code === "model_unavailable";
          const [updated] = await database
            .update(providerConnectionsTable)
            .set({
              status: isModelUnavailable ? "invalid" : "pending",
              capabilities: [],
              validatedAt: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(providerConnectionsTable.id, connection.id),
                eq(
                  providerConnectionsTable.modelIdentifier,
                  connection.modelIdentifier,
                ),
              ),
            )
            .returning();

          if (!updated) {
            res.status(409).json({
              error: "Provider selection changed during validation",
            });
            return;
          }

          if (isModelUnavailable) {
            res.json({
              connection: toConnectionResponse(updated),
              message: publicProviderError(error),
            });
            return;
          }

          if (error instanceof ProviderAdapterError) {
            req.log.warn(
              { providerKey: OPENAI_PROVIDER_KEY, code: error.code },
              "Provider validation failed",
            );
          } else {
            req.log.error({ err: error }, "Provider validation failed");
          }
          res.status(502).json({ error: publicProviderError(error) });
          return;
        }

        const [ready] = await database
          .update(providerConnectionsTable)
          .set({
            status: "ready",
            capabilities: validatedCapabilities,
            validatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(providerConnectionsTable.id, connection.id),
              eq(
                providerConnectionsTable.modelIdentifier,
                connection.modelIdentifier,
              ),
            ),
          )
          .returning();

        if (!ready) {
          res.status(409).json({
            error: "Provider selection changed during validation",
          });
          return;
        }

        res.json({
          connection: toConnectionResponse(ready),
          message: "Provider credential and selected model are ready.",
        });
      } catch (error) {
        req.log.error({ err: error }, "Failed to validate provider configuration");
        res.status(500).json({ error: "Provider configuration could not be validated" });
      }
    },
  );

  return router;
}

export default createProvidersRouter();
