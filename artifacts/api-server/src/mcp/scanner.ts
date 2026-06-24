import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import type { ViolationItem, ScanResult } from "./types";

function resolveBrowserExecutable(): string | undefined {
    const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
    if (envPath && existsSync(envPath)) return envPath;
    for (const bin of ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome", "chrome"]) {
      try {
        const found = execSync(`command -v ${bin}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
        if (found && existsSync(found)) return found;
      } catch {
        // not on PATH; try next candidate
      }
    }
    return undefined;
  }

  const SEVERITY_ORDER: Record<string, "critical" | "serious" | "moderate" | "minor"> = {
  critical: "critical",
  serious: "serious",
  moderate: "moderate",
  minor: "minor",
};

function normalizeSeverity(s: string): "critical" | "serious" | "moderate" | "minor" {
  return SEVERITY_ORDER[s.toLowerCase()] ?? "minor";
}

function estimateFixTime(total: number): string {
  if (total === 0) return "No fixes needed";
  if (total <= 5) return "1-2 hours";
  if (total <= 15) return "2-4 hours";
  if (total <= 30) return "4-8 hours";
  if (total <= 60) return "1-2 days";
  return "2-5 days";
}

interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    failureSummary?: string;
  }>;
  tags: string[];
}

function mapAxeToWcag(axeViolation: AxeViolation): string {
  const wcagTags = axeViolation.tags.filter(
    (t) => t.startsWith("wcag") && /wcag\d+\.\d+\.\d+/.test(t)
  );
  if (wcagTags.length > 0) {
    const raw = wcagTags[0]!.replace("wcag", "");
    const parts = raw.split("").join(".");
    const nums = raw.match(/(\d)(\d)(\d+)/);
    if (nums) return `${nums[1]}.${nums[2]}.${nums[3]}`;
  }
  return "4.1.2";
}

interface VisionViolationRaw {
  issue: string;
  wcag_criterion: string;
  severity: string;
  element_description: string;
  suggested_fix: string;
}

async function runVisionAnalysis(
  screenshotBuffer: Buffer,
  anthropicKey: string
): Promise<ViolationItem[]> {
  const client = new Anthropic({ apiKey: anthropicKey });

  const base64 = screenshotBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 },
          },
          {
            type: "text",
            text: `You are an expert web accessibility auditor. Analyze this screenshot for WCAG 2.1 accessibility issues that a DOM scanner would miss. Look specifically for:
- Color contrast issues (text that looks low-contrast visually)
- Tap/click targets that appear too small (under 44x44px)
- Text that is too small to read comfortably (under 16px apparent size)
- Images where alt text would be insufficient based on visual content
- Form fields that lack visible labels
- Content that appears visually confusing or unclear
- Anything an elderly or visually impaired user would struggle with

Return ONLY a valid JSON array of violations. Each item must have exactly these fields:
{
  "issue": "short description of the problem",
  "wcag_criterion": "e.g. 1.4.3",
  "severity": "critical|serious|moderate|minor",
  "element_description": "description of the element with the issue",
  "suggested_fix": "specific actionable fix"
}

If no issues are found, return an empty array [].`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") return [];

  const text = content.text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as VisionViolationRaw[];

  return parsed.map((v) => ({
    id: uuidv4(),
    wcagCriterion: v.wcag_criterion ?? "1.4.3",
    issue: v.issue,
    severity: normalizeSeverity(v.severity),
    elementDescription: v.element_description,
    suggestedFix: v.suggested_fix,
    source: "vision" as const,
  }));
}

export async function scanPage(
  url: string,
  anthropicKey: string,
  scanDepth: "single_page" | "full_site" = "single_page",
  maxPages: number = 1
): Promise<ScanResult> {
  const scanId = uuidv4();
  const urlsToScan: string[] = [url];
  const allViolations: ViolationItem[] = [];

  if (scanDepth === "full_site" && maxPages > 1) {
    logger.info({ url, maxPages }, "Full site scan — collecting additional URLs");
  }

  let browser;
  try {
    const executablePath = resolveBrowserExecutable();
    if (executablePath) logger.info({ executablePath }, "Using system Chromium");
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "Chromium failed to launch");
    if (
      msg.includes("Executable doesn't exist") ||
      msg.includes("browserType.launch") ||
      msg.includes("playwright") ||
      msg.includes("ENOENT")
    ) {
      throw new Error(
        "Scanner not ready: browser runtime is not installed on this server. " +
          "If self-hosting, run `npx playwright install chromium` after `pnpm install`. " +
          "For the hosted service contact info@groundlogic.ai. " +
          `Underlying error: ${msg}`
      );
    }
    throw err;
  }

  try {
    const seenIds = new Set<string>();

    for (let i = 0; i < Math.min(urlsToScan.length, maxPages); i++) {
      const pageUrl = urlsToScan[i]!;
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();

      await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });

      if (scanDepth === "full_site" && i === 0) {
        const hrefs = await page.$$eval("a[href]", (links) =>
          links
            .map((a) => (a as { href: string }).href)
            .filter((h) => h && !h.startsWith("mailto:") && !h.startsWith("tel:"))
        );
        const sameOrigin = hrefs.filter((h) => {
          try {
            return new URL(h).origin === new URL(pageUrl).origin;
          } catch {
            return false;
          }
        });
        const unique = [...new Set(sameOrigin)];
        urlsToScan.push(...unique.slice(0, maxPages - 1));
      }

      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      for (const violation of axeResults.violations) {
        const axeV = violation as unknown as AxeViolation;
        if (seenIds.has(axeV.id)) continue;
        seenIds.add(axeV.id);

        const wcag = mapAxeToWcag(axeV);
        const node = axeV.nodes[0];

        allViolations.push({
          id: uuidv4(),
          wcagCriterion: wcag,
          issue: axeV.description,
          severity: normalizeSeverity(axeV.impact ?? "minor"),
          elementDescription: node?.html?.slice(0, 300) ?? "Unknown element",
          suggestedFix: node?.failureSummary ?? axeV.description,
          source: "axe",
          impact: axeV.impact ?? undefined,
          helpUrl: axeV.helpUrl,
        });
      }

      const screenshotBuffer = await page.screenshot({ fullPage: true });
      await context.close();

      try {
        const visionViolations = await runVisionAnalysis(screenshotBuffer, anthropicKey);
        const existingIssues = new Set(allViolations.map((v) => v.wcagCriterion + v.issue.slice(0, 30)));
        for (const vv of visionViolations) {
          const key = vv.wcagCriterion + vv.issue.slice(0, 30);
          if (!existingIssues.has(key)) {
            allViolations.push(vv);
            existingIssues.add(key);
          }
        }
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) {
          throw new Error(
            "Invalid Anthropic API key — verify your key at https://console.anthropic.com"
          );
        }
        logger.warn({ err }, "Vision analysis failed, continuing with DOM results only");
      }
    }
  } finally {
    await browser.close();
  }

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of allViolations) counts[v.severity]++;

  return {
    scanId,
    url,
    timestamp: new Date().toISOString(),
    totalViolations: allViolations.length,
    violationsBySeverity: counts,
    violations: allViolations,
    pagesScanned: Math.min(urlsToScan.length, maxPages),
    estimatedFixTime: estimateFixTime(allViolations.length),
  };
}
