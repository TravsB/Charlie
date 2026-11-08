import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { ReadinessCheckResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/readyz", async (req, res): Promise<void> => {
  const checkedAt = new Date().toISOString();

  try {
    await db.execute(sql`SELECT 1`);
    res.json(
      ReadinessCheckResponse.parse({
        status: "ready",
        database: "ok",
        checkedAt,
      }),
    );
  } catch (error) {
    req.log.warn({ err: error }, "Database readiness check failed");
    res.status(503).json(
      ReadinessCheckResponse.parse({
        status: "not_ready",
        database: "unavailable",
        checkedAt,
      }),
    );
  }
});

export default router;
