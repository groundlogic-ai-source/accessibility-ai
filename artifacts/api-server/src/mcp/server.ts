import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import type { Express, Request, Response } from "express";
import { scanPage } from "./scanner";
import { generateFixes } from "./fixer";
import { buildVpatReport } from "./vpat";
import { generatePdf } from "./pdf";
import { reVerify } from "./reverify";
import { persistScan, loadScan, persistVpatReport } from "./store";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";

function redactKey(key: string): string {
  if (key.length < 8) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function assertScanFound(
  scan: Awaited<ReturnType<typeof loadScan>>,
  scanId: string
): NonNullable<typeof scan> {
  if (!scan) {
    throw new Error(
      `Scan not found or expired: "${scanId}". Scans are retained for 1 hour. ` +
        `Please re-run scan_accessibility to create a new scan.`
    );
  }
  return scan;
}

const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const READONLY_LOCAL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

export function registerMcpRoutes(app: Express): void {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  function createMcpServer(): McpServer {
    const server = new McpServer({
      name: "accessibility-ai",
      version: "1.0.0",
    });

    server.tool(
      "scan_accessibility",
      "Scans a URL for WCAG 2.1 accessibility violations using DOM analysis (axe-core) and visual AI (Claude Vision). Returns structured violation data and a scan_id for use with other tools.",
      {
        url: z.string().url().describe("The URL to scan for accessibility violations"),
        anthropic_api_key: z
          .string()
          .min(10)
          .describe("Your Anthropic API key (used only for this request, never stored)"),
        scan_depth: z
          .enum(["single_page", "full_site"])
          .optional()
          .default("single_page")
          .describe("Whether to scan a single page or crawl the full site (max 10 pages)"),
        max_pages: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(1)
          .describe("Maximum pages to scan when scan_depth is full_site"),
      },
      READONLY_ANNOTATIONS,
      async ({ url, anthropic_api_key, scan_depth, max_pages }) => {
        logger.info(
          { url, scan_depth, max_pages, key: redactKey(anthropic_api_key) },
          "scan_accessibility called"
        );

        const depth = scan_depth ?? "single_page";
        let pages = max_pages ?? 1;
        if (depth === "full_site" && pages === 1) pages = 5;

        const result = await scanPage(url, anthropic_api_key, depth, pages);
        await persistScan(result);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ...result,
                  note: "Use the scan_id with generate_fixes, generate_vpat, or re_verify tools.",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.tool(
      "generate_fixes",
      "Takes scan results and generates specific code fixes for each accessibility violation. Returns ready-to-apply code patches and a copy-paste summary for Claude Code or Replit Agent.",
      {
        scan_id: z.string().describe("The scan_id returned by scan_accessibility"),
        framework: z
          .enum(["react", "html", "vue", "angular", "next"])
          .optional()
          .default("html")
          .describe("The frontend framework of the codebase being fixed"),
        anthropic_api_key: z
          .string()
          .min(10)
          .describe("Your Anthropic API key (used only for this request, never stored)"),
      },
      READONLY_LOCAL_ANNOTATIONS,
      async ({ scan_id, framework, anthropic_api_key }) => {
        logger.info(
          { scan_id, framework, key: redactKey(anthropic_api_key) },
          "generate_fixes called"
        );

        const scan = assertScanFound(await loadScan(scan_id), scan_id);
        const result = await generateFixes(
          scan.violations,
          framework ?? "html",
          anthropic_api_key,
          scan_id
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      "re_verify",
      "Re-scans a URL after fixes have been applied and compares results against the original scan. Returns which violations were resolved, which persist, and any new issues introduced.",
      {
        scan_id: z
          .string()
          .describe("The original scan_id from scan_accessibility to compare against"),
        anthropic_api_key: z
          .string()
          .min(10)
          .describe("Your Anthropic API key (used only for this request, never stored)"),
      },
      READONLY_ANNOTATIONS,
      async ({ scan_id, anthropic_api_key }) => {
        logger.info({ scan_id, key: redactKey(anthropic_api_key) }, "re_verify called");

        const scan = assertScanFound(await loadScan(scan_id), scan_id);
        const result = await reVerify(
          scan.url,
          scan.violations,
          scan_id,
          anthropic_api_key
        );

        await persistScan({
          scanId: result.scanId,
          url: result.url,
          timestamp: result.timestamp,
          totalViolations: result.currentViolations,
          violationsBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0 },
          violations: [...result.persisting, ...result.newViolations],
          pagesScanned: 1,
          estimatedFixTime: "N/A",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      "generate_vpat",
      "Generates a complete VPAT 2.5 EN 301 549 accessibility conformance report based on scan results. Returns structured JSON and a downloadable PDF (base64-encoded). Covers all EN 301 549 clauses; non-web clauses are marked Not Evaluated with professional notes.",
      {
        scan_id: z.string().describe("The scan_id from scan_accessibility"),
        product_name: z.string().describe("Name of the product being evaluated"),
        product_version: z
          .string()
          .optional()
          .default("1.0")
          .describe("Version of the product"),
        company_name: z.string().describe("Company or organization name"),
        contact_email: z.string().email().describe("Contact email for accessibility questions"),
        evaluation_date: z
          .string()
          .optional()
          .describe("Evaluation date (YYYY-MM-DD). Defaults to today."),
        notes: z
          .string()
          .optional()
          .describe("Additional context about the product or evaluation scope"),
        anthropic_api_key: z
          .string()
          .min(10)
          .describe("Your Anthropic API key (used only for this request, never stored)"),
      },
      READONLY_LOCAL_ANNOTATIONS,
      async ({
        scan_id,
        product_name,
        product_version,
        company_name,
        contact_email,
        evaluation_date,
        notes,
        anthropic_api_key,
      }) => {
        logger.info(
          { scan_id, product_name, key: redactKey(anthropic_api_key) },
          "generate_vpat called"
        );

        const scan = assertScanFound(await loadScan(scan_id), scan_id);
        const evalDate =
          evaluation_date ?? new Date().toISOString().split("T")[0]!;
        const reportId = uuidv4();

        const report = await buildVpatReport(
          scan_id,
          scan.violations,
          product_name,
          product_version ?? "1.0",
          company_name,
          contact_email,
          evalDate,
          notes ?? "",
          anthropic_api_key,
          reportId
        );

        const pdfBase64 = await generatePdf(report);
        await persistVpatReport(reportId, scan_id, report, pdfBase64);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  report_id: reportId,
                  overall_conformance_percentage: report.overallConformancePercentage,
                  evaluation_date: evalDate,
                  product_name,
                  product_version: product_version ?? "1.0",
                  company_name,
                  sections_summary: report.sections.map((s) => ({
                    clause: s.clause,
                    title: s.title,
                    criteria_count: s.criteria.length,
                  })),
                  vpat_json: report,
                  pdf_base64: pdfBase64,
                  note: "The pdf_base64 field contains the full PDF report. Decode and save as a .pdf file.",
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    return server;
  }

  app.post("/mcp", async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => uuidv4(),
        onsessioninitialized: (id) => {
          transports.set(id, transport);
          logger.info({ sessionId: id }, "MCP session initialized");
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
          logger.info({ sessionId: transport.sessionId }, "MCP session closed");
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
  });

  logger.info("MCP routes registered at /mcp");
}
