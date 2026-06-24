import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { scanPage } from "../mcp/scanner";
import { generateFixes } from "../mcp/fixer";
import { persistScan } from "../mcp/store";

const router = Router();

// Scan and fix endpoints are expensive (Playwright + Claude per request).
// 15 requests per 15-minute window per IP is generous for legitimate use
// but prevents runaway abuse or accidental loops.
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait before retrying (15 req / 15 min limit)." },
});

const ScanBodySchema = z.object({
  url: z.string().url({ message: "url must be a valid URL" }),
  anthropic_api_key: z.string().min(10, { message: "anthropic_api_key is required" }),
  scan_depth: z.enum(["single_page", "full_site"]).optional().default("single_page"),
  max_pages: z.number().int().min(1).max(10).optional().default(1),
  vision_mode: z.enum(["standard", "thorough"]).optional().default("standard"),
});

/**
 * POST /api/scan
 *
 * REST convenience endpoint — identical to the scan_accessibility MCP tool.
 * Useful for testing without a full MCP client (curl, Postman, etc.).
 *
 * Body: { url, anthropic_api_key, scan_depth?, max_pages? }
 * Returns: scan result JSON including scan_id, violations, etc.
 */
router.post("/scan", scanLimiter, async (req, res) => {
  const parsed = ScanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { url, anthropic_api_key, scan_depth, max_pages, vision_mode } = parsed.data;
  let pages = max_pages;
  if (scan_depth === "full_site" && pages === 1) pages = 5;

  req.log.info({ url, scan_depth, pages, vision_mode }, "REST /api/scan called");

  try {
    const result = await scanPage(url, anthropic_api_key, scan_depth, pages, vision_mode);
    await persistScan(result);
    res.json({
      ...result,
      note: "Use scan_id with the generate_fixes, re_verify, or generate_vpat MCP tools.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    req.log.error({ err, url }, "REST /api/scan failed");
    const status =
      message.includes("Invalid Anthropic API key") ? 401
      : message.includes("Scanner not ready") ? 503
      : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * POST /api/fixes
 *
 * REST convenience endpoint — runs scan then immediately generates fixes.
 * Saves a round-trip for simple integrations.
 *
 * Body: { url, anthropic_api_key, framework?, scan_depth?, max_pages? }
 */
router.post("/fixes", scanLimiter, async (req, res) => {
  const parsed = ScanBodySchema.extend({
    framework: z
      .enum(["react", "html", "vue", "angular", "next"])
      .optional()
      .default("html"),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { url, anthropic_api_key, scan_depth, max_pages, framework, vision_mode } = parsed.data;
  let pages = max_pages;
  if (scan_depth === "full_site" && pages === 1) pages = 5;

  req.log.info({ url, scan_depth, pages, framework, vision_mode }, "REST /api/fixes called");

  try {
    const scanResult = await scanPage(url, anthropic_api_key, scan_depth, pages, vision_mode);
    await persistScan(scanResult);

    const fixResult = await generateFixes(
      scanResult.violations,
      framework,
      anthropic_api_key,
      scanResult.scanId
    );

    res.json({ scan: scanResult, fixes: fixResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    req.log.error({ err, url }, "REST /api/fixes failed");
    const status =
      message.includes("Invalid Anthropic API key") ? 401
      : message.includes("Scanner not ready") ? 503
      : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
