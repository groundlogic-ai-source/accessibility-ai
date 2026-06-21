import { Router, type IRouter } from "express";
import healthRouter from "./health";
import metaRouter from "./meta";
import scanRouter from "./scan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(metaRouter);
router.use(scanRouter);

export default router;
