import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import type {
  ViolationItem,
  VpatCriterion,
  VpatCriterionResult,
  VpatSection,
  VpatReport,
} from "./types";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const TEMPLATE_PATH = path.resolve(
  workspaceRoot,
  "artifacts/api-server/vpat-template/vpat-2.5.json"
);

function loadTemplate(): VpatCriterion[] {
  const raw = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  return JSON.parse(raw) as VpatCriterion[];
}

function buildViolationsByCriterion(
  violations: ViolationItem[]
): Map<string, ViolationItem[]> {
  const map = new Map<string, ViolationItem[]>();
  for (const v of violations) {
    const existing = map.get(v.wcagCriterion) ?? [];
    existing.push(v);
    map.set(v.wcagCriterion, existing);
  }
  return map;
}

function determineConformance(
  criterion: VpatCriterion,
  violations: ViolationItem[]
): "Supports" | "Partially Supports" | "Does Not Support" {
  if (violations.length === 0) return "Supports";
  const hasCritical = violations.some((v) => v.severity === "critical");
  const hasSerious = violations.some((v) => v.severity === "serious");
  if (hasCritical || (hasSerious && violations.length > 2)) return "Does Not Support";
  return "Partially Supports";
}

async function generateRemarks(
  criterion: VpatCriterion,
  conformance: string,
  violations: ViolationItem[],
  client: Anthropic
): Promise<string> {
  if (violations.length === 0) {
    return `No violations detected for ${criterion.name}. Automated DOM scanning and AI visual analysis found no issues related to this criterion.`;
  }

  const violationSummary = violations
    .slice(0, 5)
    .map((v) => `- ${v.severity.toUpperCase()}: ${v.issue} (${v.elementDescription.slice(0, 100)})`)
    .join("\n");

  const extra = violations.length > 5 ? `\n(and ${violations.length - 5} more violations)` : "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Write a professional VPAT remarks field (2-3 sentences, plain text, no markdown) for this accessibility criterion.

Criterion: ${criterion.criterion} ${criterion.name}
Conformance Level: ${conformance}
Violations found:
${violationSummary}${extra}

The remarks should describe the specific issues found and their impact on users. Be factual and professional.`,
        },
      ],
    });
    const content = response.content[0];
    return content?.type === "text" ? content.text.trim() : violationSummary;
  } catch {
    return `${violations.length} violation(s) found. Issues include: ${violations
      .slice(0, 3)
      .map((v) => v.issue)
      .join("; ")}.`;
  }
}

const NOT_EVALUATED_NOTE =
  "Not Evaluated. This criterion applies to hardware, voice interfaces, or closed functionality not present in this web-based product. Evaluation was limited to web content per WCAG 2.1 guidelines. Contact the vendor for assessment of non-web components if applicable.";

const EN_301_549_NON_WEB_SECTIONS: VpatSection[] = [
  {
    clause: "Clause 4",
    title: "Functional Performance Statements",
    notes: "Evaluated via WCAG 2.1 web criteria above. See Table 1 and Table 2.",
    criteria: [],
  },
  {
    clause: "Clause 5",
    title: "Generic Requirements",
    notes: "Not applicable to this web-only product evaluation.",
    criteria: [
      {
        criterion: "5.2",
        name: "Activation of accessibility features",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "5.3",
        name: "Biometrics",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
  {
    clause: "Clause 6",
    title: "ICT with Two-Way Voice Communication",
    notes:
      "This clause applies to products with real-time two-way voice communication. This web-based product does not include two-way voice communication features. All criteria in this clause are marked Not Evaluated.",
    criteria: [
      {
        criterion: "6.1",
        name: "Audio bandwidth for speech",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "6.2",
        name: "Real-time text functionality",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "6.3",
        name: "Caller ID",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "6.4",
        name: "Alternatives to voice-based services",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "6.5",
        name: "Video communication",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
  {
    clause: "Clause 7",
    title: "ICT with Video Capabilities",
    notes:
      "Applies to products with video playback. If the scanned web product includes video, relevant WCAG criteria (1.2.x) have been evaluated above. Platform-level video rendering is Not Evaluated.",
    criteria: [
      {
        criterion: "7.1",
        name: "Caption processing technology",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "7.2",
        name: "Audio description technology",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "7.3",
        name: "User controls for captions and audio description",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
  {
    clause: "Clause 8",
    title: "Hardware",
    notes:
      "This clause applies to hardware ICT. This report covers a web-based product only. No hardware assessment was performed. All criteria in this clause are Not Evaluated.",
    criteria: [
      {
        criterion: "8.1",
        name: "General (Hardware)",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "8.2",
        name: "Hardware products with speech output",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "8.3",
        name: "Stationary ICT",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "8.4",
        name: "Mechanically operable parts",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "8.5",
        name: "Tactile indication of speech mode",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
  {
    clause: "Clause 10",
    title: "Non-web Documents",
    notes:
      "Applies to documents that are not web pages. If the product produces downloadable documents (PDF, Word, etc.), those are not covered by this automated web scan. Manual evaluation of non-web documents is recommended.",
    criteria: [
      {
        criterion: "10.0",
        name: "Non-web documents (general)",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations:
          "Not Evaluated. Non-web documents (PDFs, Office files) produced by this product were not evaluated by automated scanning. Manual review is recommended per WCAG 2.1 guidelines for document accessibility.",
      },
    ],
  },
  {
    clause: "Clause 11",
    title: "Software",
    notes:
      "Clause 11.1-11.4 maps to WCAG 2.x criteria evaluated in Table 1 and Table 2 above for web content. Closed functionality (11.6) and authoring tools (11.8) are Not Evaluated as this product is a web application.",
    criteria: [
      {
        criterion: "11.5",
        name: "Interoperability with assistive technology",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "11.6",
        name: "Documented accessibility usage",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "11.7",
        name: "User preferences",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "11.8",
        name: "Authoring tools",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
  {
    clause: "Clause 12",
    title: "Documentation and Support Services",
    notes:
      "Applies to product documentation and support services. These were not evaluated as part of this automated web scan.",
    criteria: [
      {
        criterion: "12.1",
        name: "Product documentation",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations:
          "Not Evaluated. Product documentation accessibility was not assessed by this automated scan. Manual review of documentation is recommended.",
      },
      {
        criterion: "12.2",
        name: "Support services",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations:
          "Not Evaluated. Support service accessibility (help desk, chat support, etc.) was not evaluated by this automated scan.",
      },
    ],
  },
  {
    clause: "Clause 13",
    title: "ICT Providing Relay or Emergency Service Access",
    notes:
      "Applies to relay and emergency services. Not applicable to this web product.",
    criteria: [
      {
        criterion: "13.1",
        name: "Relay services requirements",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "13.2",
        name: "Access to relay services",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
      {
        criterion: "13.3",
        name: "Access to emergency services",
        level: "N/A",
        conformanceLevel: "Not Evaluated",
        remarksAndExplanations: NOT_EVALUATED_NOTE,
      },
    ],
  },
];

export async function buildVpatReport(
  scanId: string,
  violations: ViolationItem[],
  productName: string,
  productVersion: string,
  companyName: string,
  contactEmail: string,
  evaluationDate: string,
  notes: string,
  anthropicKey: string,
  reportId: string
): Promise<VpatReport> {
  const template = loadTemplate();
  const bycriterion = buildViolationsByCriterion(violations);
  const client = new Anthropic({ apiKey: anthropicKey });

  const levelACriteria: VpatCriterionResult[] = [];
  const levelAACriteria: VpatCriterionResult[] = [];

  for (const criterion of template) {
    const criterionViolations = bycriterion.get(criterion.criterion) ?? [];
    const conformance = determineConformance(criterion, criterionViolations);
    const remarks = await generateRemarks(criterion, conformance, criterionViolations, client);

    const result: VpatCriterionResult = {
      criterion: criterion.criterion,
      name: criterion.name,
      level: criterion.level,
      conformanceLevel: conformance,
      remarksAndExplanations: remarks,
    };

    if (criterion.level === "A") levelACriteria.push(result);
    else if (criterion.level === "AA") levelAACriteria.push(result);
  }

  const webSection: VpatSection = {
    clause: "Clause 9 — Web (WCAG 2.1)",
    title: "WCAG 2.x Report — Web Content",
    notes:
      "Evaluated via automated DOM scanning (axe-core) and AI visual analysis (Claude Vision). Covers WCAG 2.1 Level A and Level AA success criteria.",
    criteria: [...levelACriteria, ...levelAACriteria],
  };

  const allWebCriteria = [...levelACriteria, ...levelAACriteria];
  const supporting = allWebCriteria.filter((c) => c.conformanceLevel === "Supports").length;
  const overallConformance = Math.round((supporting / allWebCriteria.length) * 100);

  return {
    reportId,
    scanId,
    productName,
    productVersion,
    companyName,
    contactEmail,
    evaluationDate,
    notes,
    overallConformancePercentage: overallConformance,
    sections: [webSection, ...EN_301_549_NON_WEB_SECTIONS],
  };
}
