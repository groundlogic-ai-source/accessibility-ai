import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

router.get("/health", (_req, res): void => {
  res.json({ status: "ok" });
});

router.get("/privacy", (_req, res): void => {
  const privacyPath = path.resolve(workspaceRoot, "PRIVACY.md");
  try {
    const content = fs.readFileSync(privacyPath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.type("text/plain").send("Privacy policy not found.");
  }
});

export default router;
