import { v4 as uuidv4 } from "uuid";
import { scanPage } from "./scanner";
import type { ViolationItem, ReVerifyResult } from "./types";

function violationKey(v: ViolationItem): string {
  return `${v.wcagCriterion}::${v.issue.slice(0, 60).toLowerCase().replace(/\s+/g, " ")}`;
}

export async function reVerify(
  url: string,
  originalViolations: ViolationItem[],
  originalScanId: string,
  anthropicKey: string
): Promise<ReVerifyResult> {
  const newScan = await scanPage(url, anthropicKey, "single_page", 1);
  const newViolations = newScan.violations;

  const originalKeys = new Map<string, ViolationItem>(
    originalViolations.map((v) => [violationKey(v), v])
  );
  const newKeys = new Map<string, ViolationItem>(
    newViolations.map((v) => [violationKey(v), v])
  );

  const resolved: ViolationItem[] = [];
  const persisting: ViolationItem[] = [];

  for (const [key, original] of originalKeys) {
    if (newKeys.has(key)) {
      persisting.push(original);
    } else {
      resolved.push(original);
    }
  }

  const newViolationsList: ViolationItem[] = [];
  for (const [key, newV] of newKeys) {
    if (!originalKeys.has(key)) {
      newViolationsList.push(newV);
    }
  }

  const originalCount = originalViolations.length;
  const currentCount = newViolations.length;
  const resolvedCount = resolved.length;
  const improvementPct =
    originalCount > 0 ? Math.round((resolvedCount / originalCount) * 100) : 100;

  let summary: string;
  if (resolvedCount === originalCount && newViolationsList.length === 0) {
    summary = `All ${originalCount} violations have been resolved. The page now fully conforms to the scanned WCAG 2.1 criteria.`;
  } else if (resolvedCount > 0 && newViolationsList.length === 0) {
    summary = `${resolvedCount} of ${originalCount} violations resolved (${improvementPct}% improvement). ${persisting.length} violation(s) remain. No new issues introduced.`;
  } else if (resolvedCount > 0 && newViolationsList.length > 0) {
    summary = `${resolvedCount} of ${originalCount} original violations resolved (${improvementPct}% improvement). ${persisting.length} violation(s) persist and ${newViolationsList.length} new violation(s) were introduced.`;
  } else if (resolvedCount === 0 && newViolationsList.length > 0) {
    summary = `No original violations were resolved and ${newViolationsList.length} new violation(s) were introduced. Total violations increased from ${originalCount} to ${currentCount}.`;
  } else {
    summary = `No change detected. ${persisting.length} violation(s) persist from the original scan.`;
  }

  return {
    scanId: newScan.scanId,
    originalScanId,
    url,
    timestamp: newScan.timestamp,
    originalViolations: originalCount,
    currentViolations: currentCount,
    resolved,
    persisting,
    newViolations: newViolationsList,
    improvementPercentage: improvementPct,
    summary,
  };
}
