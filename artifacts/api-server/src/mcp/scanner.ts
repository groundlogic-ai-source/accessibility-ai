import { chromium } from "playwright";
import type { Page } from "playwright";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import type { ViolationItem, ScanResult } from "./types";

export type VisionMode = "standard" | "thorough";

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

/**
 * Stable, source-aware dedupe key. Deliberately excludes uuids and free-form
 * issue text (both vary run-to-run). The same key is used for section merging,
 * dual-pass consensus, and re_verify comparison so all three agree.
 */
function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function violationKey(v: ViolationItem): string {
  const elem = normalizeText(v.elementDescription).slice(0, 80);
  if (v.source === "axe") {
    // helpUrl encodes the axe rule (e.g. .../rules/axe/color-contrast), which
    // distinguishes two different rules that happen to map to the same criterion
    // and element. Falls back to the criterion when helpUrl is absent.
    const rule = v.helpUrl ? normalizeText(v.helpUrl) : v.wcagCriterion;
    return `axe::${rule}::${elem}`;
  }
  return `vision::${v.wcagCriterion}::${elem}`;
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
  // axe-core encodes success criteria as digit-only tags like "wcag143" (1.4.3)
  // or "wcag1410" (1.4.10) — there are NO dots in real axe tags. Level/version
  // tags (wcag2a, wcag2aa, wcag21aa) contain letters and are skipped by the
  // digit-only match. Parse: 1st digit = principle, 2nd = guideline, rest = SC.
  for (const tag of axeViolation.tags) {
    const m = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  }
  return "4.1.2";
}

// ---------------------------------------------------------------------------
// Vision tier (Claude) — advisory, judgment-only analysis.
// ---------------------------------------------------------------------------

const MIN_VISION_CONFIDENCE = 4;
const VISION_MODEL = "claude-opus-4-5";
const MAX_THOROUGH_SECTIONS = 6;
const SECTION_VIEWPORT_HEIGHT = 900;

/**
 * Criteria that require human-like visual judgment a DOM scanner (axe) cannot
 * perform. Scoping the model to exactly these reduces overlap/noise with axe.
 */
const VISION_CRITERIA: Array<{ criterion: string; name: string; check: string }> = [
  {
    criterion: "1.1.1",
    name: "Non-text Content",
    check:
      "An image clearly conveys information but appears to need a meaningful text alternative, or a purely decorative image adds noise. Judge meaning, not the presence of an alt attribute.",
  },
  {
    criterion: "1.3.2",
    name: "Meaningful Sequence",
    check:
      "The visual reading order looks illogical and would confuse a screen-reader user following the underlying order.",
  },
  {
    criterion: "1.4.1",
    name: "Use of Color",
    check:
      "Color alone conveys meaning (required fields, errors, links, status) with no text, icon, or underline backup.",
  },
  {
    criterion: "1.4.3",
    name: "Contrast (visual)",
    check:
      "Text rendered inside images, over photos, or over gradients appears to have insufficient contrast. (Axe already measures plain DOM text — do not repeat that.)",
  },
  {
    criterion: "1.4.11",
    name: "Non-text Contrast",
    check:
      "Icons, buttons, form borders, or other graphical UI objects have insufficient contrast against their background.",
  },
  {
    criterion: "2.4.7",
    name: "Focus Visible",
    check: "Interactive elements appear to lack any visible focus indicator.",
  },
  {
    criterion: "2.5.5",
    name: "Target Size",
    check:
      "Tap/click targets look smaller than ~44x44px or are crowded so close together they would be hard to hit accurately.",
  },
  {
    criterion: "3.3.2",
    name: "Labels or Instructions",
    check:
      "Form fields appear to lack a visible label or instruction (placeholder-only fields count as missing a persistent label).",
  },
];

function buildVisionPrompt(axeViolations: ViolationItem[]): string {
  const axeSummary =
    axeViolations.length > 0
      ? axeViolations
          .slice(0, 20)
          .map((v) => `- [${v.wcagCriterion}] ${v.issue} (${v.elementDescription.slice(0, 80)})`)
          .join("\n")
      : "(none)";

  const criteriaList = VISION_CRITERIA.map(
    (c, i) => `${i + 1}. [${c.criterion}] ${c.name} — ${c.check}`
  ).join("\n");

  return `You are an expert web accessibility auditor performing a VISUAL-ONLY review of this screenshot.

A DOM scanner (axe-core) has ALREADY analyzed this page programmatically and found the issues below. DO NOT repeat any of these, and DO NOT report anything detectable from markup alone (missing alt attributes, programmatic form-label associations, ARIA roles/names, or computed contrast of plain DOM text):
${axeSummary}

Evaluate ONLY the following criteria, each of which requires human-like visual judgment that an automated DOM scanner cannot perform. For EACH criterion return one of these statuses:
- PASS: no visible issue
- FAIL: a clear, visible issue
- CANNOT_DETERMINE: not enough visual information to decide

Criteria to evaluate:
${criteriaList}

For every FAIL, list each distinct finding with a STABLE visual locator (for example "primary nav 'Sign up' button, top-right") so the same element is described identically on a re-scan.

Return ONLY valid JSON, no prose, in exactly this shape:
{
  "evaluations": [
    {
      "criterion": "1.4.3",
      "status": "PASS",
      "reason": "one short sentence",
      "findings": [
        {
          "element_description": "stable visual locator",
          "issue": "short description of the problem",
          "severity": "critical",
          "suggested_fix": "specific actionable fix",
          "confidence": 5
        }
      ]
    }
  ]
}

"severity" is one of critical|serious|moderate|minor. "confidence" is an integer 1-5 (5 = certain this is a real issue, 1 = uncertain guess). Only list findings you genuinely believe are real issues. Use an empty findings array for PASS and CANNOT_DETERMINE.`;
}

interface VisionFindingRaw {
  element_description?: string;
  issue?: string;
  severity?: string;
  suggested_fix?: string;
  confidence?: number;
}

interface VisionEvalRaw {
  criterion?: string;
  status?: string;
  reason?: string;
  findings?: VisionFindingRaw[];
}

interface VisionResponseRaw {
  evaluations?: VisionEvalRaw[];
}

function parseVisionResponse(text: string): ViolationItem[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  let parsed: VisionResponseRaw;
  try {
    parsed = JSON.parse(jsonMatch[0]) as VisionResponseRaw;
  } catch {
    return [];
  }

  const out: ViolationItem[] = [];
  for (const ev of parsed.evaluations ?? []) {
    if ((ev.status ?? "").toUpperCase() !== "FAIL") continue;
    for (const f of ev.findings ?? []) {
      const confidence = typeof f.confidence === "number" ? f.confidence : 0;
      if (confidence < MIN_VISION_CONFIDENCE) continue;
      if (!f.issue || !f.element_description) continue;
      out.push({
        id: uuidv4(),
        wcagCriterion: ev.criterion ?? "1.4.3",
        issue: f.issue,
        severity: normalizeSeverity(f.severity ?? "minor"),
        elementDescription: f.element_description,
        suggestedFix: f.suggested_fix ?? "Manual review recommended.",
        source: "vision",
        confidence,
      });
    }
  }
  return out;
}

async function runVisionPass(
  client: Anthropic,
  base64: string,
  prompt: string
): Promise<ViolationItem[]> {
  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") return [];
  return parseVisionResponse(content.text.trim());
}

function dedupeByKey(items: ViolationItem[]): ViolationItem[] {
  const seen = new Set<string>();
  const out: ViolationItem[] = [];
  for (const v of items) {
    const k = violationKey(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** Keep only findings present in BOTH passes (by stable key). */
function consensus(passA: ViolationItem[], passB: ViolationItem[]): ViolationItem[] {
  const bKeys = new Set(passB.map(violationKey));
  return passA.filter((v) => bKeys.has(violationKey(v)));
}

/**
 * Run the vision tier over one or more screenshots.
 * - standard: a single pass per screenshot.
 * - thorough: two passes per screenshot, keeping only the consensus.
 */
async function runVisionAnalysis(
  screenshots: Buffer[],
  anthropicKey: string,
  axeViolations: ViolationItem[],
  thorough: boolean
): Promise<ViolationItem[]> {
  const client = new Anthropic({ apiKey: anthropicKey });
  const prompt = buildVisionPrompt(axeViolations);
  const collected: ViolationItem[] = [];

  for (const buf of screenshots) {
    const base64 = buf.toString("base64");
    if (thorough) {
      const [a, b] = await Promise.all([
        runVisionPass(client, base64, prompt),
        runVisionPass(client, base64, prompt),
      ]);
      collected.push(...consensus(a, b));
    } else {
      collected.push(...(await runVisionPass(client, base64, prompt)));
    }
  }

  return dedupeByKey(collected);
}

// The page.evaluate callbacks below execute in the browser, but tsc checks them
// against the Node lib (no DOM types). Access the browser globals via a typed
// globalThis cast — mirrors the $$eval gotcha used for anchor hrefs above.
type BrowserGlobals = {
  scrollTo: (x: number, y: number) => void;
  document: { documentElement: { scrollHeight: number } };
};

/** Capture viewport-height sections top-to-bottom for section-by-section analysis. */
async function captureSections(page: Page): Promise<Buffer[]> {
  const totalHeight = await page.evaluate(
    () => (globalThis as unknown as BrowserGlobals).document.documentElement.scrollHeight
  );
  const count = Math.min(
    Math.max(1, Math.ceil(totalHeight / SECTION_VIEWPORT_HEIGHT)),
    MAX_THOROUGH_SECTIONS
  );

  const buffers: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    await page.evaluate(
      (y) => (globalThis as unknown as BrowserGlobals).scrollTo(0, y),
      i * SECTION_VIEWPORT_HEIGHT
    );
    await page.waitForTimeout(200);
    buffers.push(await page.screenshot());
  }
  await page.evaluate(() => (globalThis as unknown as BrowserGlobals).scrollTo(0, 0));
  return buffers;
}

// ---------------------------------------------------------------------------
// Scan orchestration
// ---------------------------------------------------------------------------

export async function scanPage(
  url: string,
  anthropicKey: string,
  scanDepth: "single_page" | "full_site" = "single_page",
  maxPages: number = 1,
  visionMode: VisionMode = "standard"
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
    const seenAxeRuleIds = new Set<string>();
    const seenVisionKeys = new Set<string>();

    for (let i = 0; i < Math.min(urlsToScan.length, maxPages); i++) {
      const pageUrl = urlsToScan[i]!;
      const context = await browser.newContext({
        viewport: { width: 1280, height: SECTION_VIEWPORT_HEIGHT },
      });
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

      const pageAxeViolations: ViolationItem[] = [];
      for (const violation of axeResults.violations) {
        const axeV = violation as unknown as AxeViolation;
        if (seenAxeRuleIds.has(axeV.id)) continue;
        seenAxeRuleIds.add(axeV.id);

        const wcag = mapAxeToWcag(axeV);
        const node = axeV.nodes[0];

        const item: ViolationItem = {
          id: uuidv4(),
          wcagCriterion: wcag,
          issue: axeV.description,
          severity: normalizeSeverity(axeV.impact ?? "minor"),
          elementDescription: node?.html?.slice(0, 300) ?? "Unknown element",
          suggestedFix: node?.failureSummary ?? axeV.description,
          source: "axe",
          impact: axeV.impact ?? undefined,
          helpUrl: axeV.helpUrl,
        };
        allViolations.push(item);
        pageAxeViolations.push(item);
      }

      // Thorough mode is expensive (sections x 2 passes); only apply it to the
      // first page so a full-site crawl does not multiply cost per page.
      const thorough = visionMode === "thorough" && i === 0;
      const screenshots = thorough
        ? await captureSections(page)
        : [await page.screenshot({ fullPage: true })];

      await context.close();

      try {
        const visionViolations = await runVisionAnalysis(
          screenshots,
          anthropicKey,
          pageAxeViolations,
          thorough
        );
        for (const vv of visionViolations) {
          const key = violationKey(vv);
          if (!seenVisionKeys.has(key)) {
            allViolations.push(vv);
            seenVisionKeys.add(key);
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
