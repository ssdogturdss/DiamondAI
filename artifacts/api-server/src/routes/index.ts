import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serverRouter from "./server";
import githubRouter from "./github";
import filesRouter from "./files";
import metaRouter from "./meta";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serverRouter);
router.use(githubRouter);
router.use(filesRouter);
router.use(metaRouter);

export default router;
