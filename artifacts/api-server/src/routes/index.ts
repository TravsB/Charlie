import { Router, type IRouter } from "express";
import healthRouter from "./health";
import readinessRouter from "./readiness";
import projectsRouter from "./projects";

const router: IRouter = Router();

router.use(healthRouter);
router.use(readinessRouter);
router.use(projectsRouter);

export default router;
