import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { registerMcpRoutes } from "./mcp/server";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

registerMcpRoutes(app);

app.get("/privacy", (_req, res): void => {
  const privacyPath = path.resolve(workspaceRoot, "PRIVACY.md");
  try {
    const content = fs.readFileSync(privacyPath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.type("text/plain").send("Privacy policy not available.");
  }
});

export default app;
