import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger";
import type { ViolationItem, FixSuggestion, FixResult } from "./types";

type Framework = "react" | "html" | "vue" | "angular" | "next";

interface FixBatchRaw {
  fixes: Array<{
    before: string;
    after: string;
    explanation: string;
    caveats: string;
  }>;
}

async function generateFixBatch(
  violations: ViolationItem[],
  framework: Framework,
  client: Anthropic
): Promise<FixSuggestion[]> {
  const violationList = violations
    .map(
      (v, i) =>
        `${i + 1}. Violation: ${v.issue}\n   WCAG: ${v.wcagCriterion}\n   Element: ${v.elementDescription}\n   Suggested: ${v.suggestedFix}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an expert accessibility engineer. Generate specific code fixes for these WCAG 2.1 violations. Framework: ${framework}.

${violationList}

Return ONLY a valid JSON object with this structure:
{
  "fixes": [
    {
      "before": "code before the fix (or 'N/A - structural change required')",
      "after": "code after the fix",
      "explanation": "why this fixes the WCAG violation",
      "caveats": "edge cases or things to watch out for (or 'None')"
    }
  ]
}

Provide exactly ${violations.length} fixes in the same order as the violations listed. Keep fixes minimal and surgical.`,
      },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== "text") return [];

  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as FixBatchRaw;

  return violations.map((v, i) => {
    const fix = parsed.fixes[i];
    return {
      violationId: v.id,
      wcagCriterion: v.wcagCriterion,
      issue: v.issue,
      before: fix?.before ?? "N/A",
      after: fix?.after ?? "Apply the suggested fix manually",
      explanation: fix?.explanation ?? v.suggestedFix,
      caveats: fix?.caveats ?? "None",
    };
  });
}

function buildCopyPasteSummary(fixes: FixSuggestion[]): string {
  const items = fixes
    .map(
      (f, i) =>
        `${i + 1}. [WCAG ${f.wcagCriterion}] ${f.issue}
   Before: ${f.before}
   After: ${f.after}
   Why: ${f.explanation}
   Caveats: ${f.caveats}`
    )
    .join("\n\n");

  return `Please fix the following accessibility violations in my codebase:

${items}

After applying each fix, verify it resolves the issue by checking the element in your browser's accessibility inspector or re-running an axe scan.`;
}

const BATCH_SIZE = 5;

export async function generateFixes(
  violations: ViolationItem[],
  framework: Framework,
  anthropicKey: string,
  scanId: string
): Promise<FixResult> {
  const client = new Anthropic({ apiKey: anthropicKey });
  const allFixes: FixSuggestion[] = [];

  const batches: ViolationItem[][] = [];
  for (let i = 0; i < violations.length; i += BATCH_SIZE) {
    batches.push(violations.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const batchFixes = await generateFixBatch(batch, framework, client);
      allFixes.push(...batchFixes);
    } catch (err) {
      logger.warn({ err }, "Fix batch failed, adding placeholder fixes");
      for (const v of batch) {
        allFixes.push({
          violationId: v.id,
          wcagCriterion: v.wcagCriterion,
          issue: v.issue,
          before: "Could not generate — see violation description",
          after: v.suggestedFix,
          explanation: "Manual review required",
          caveats: "AI fix generation failed for this batch",
        });
      }
    }
  }

  return {
    scanId,
    fixes: allFixes,
    copyPasteSummary: buildCopyPasteSummary(allFixes),
  };
}
