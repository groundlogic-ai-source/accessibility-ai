import { scanPage, violationKey } from "./scanner";
import { persistScan } from "./store";
import type { ViolationItem, ReVerifyResult, VisionAdvisory } from "./types";

interface TierDiff {
  resolved: ViolationItem[];
  persisting: ViolationItem[];
  added: ViolationItem[];
}

function diffTier(original: ViolationItem[], current: ViolationItem[]): TierDiff {
  const originalKeys = new Map<string, ViolationItem>(original.map((v) => [violationKey(v), v]));
  const currentKeys = new Map<string, ViolationItem>(current.map((v) => [violationKey(v), v]));

  const resolved: ViolationItem[] = [];
  const persisting: ViolationItem[] = [];
  for (const [key, item] of originalKeys) {
    if (currentKeys.has(key)) persisting.push(item);
    else resolved.push(item);
  }

  const added: ViolationItem[] = [];
  for (const [key, item] of currentKeys) {
    if (!originalKeys.has(key)) added.push(item);
  }

  return { resolved, persisting, added };
}

export async function reVerify(
  url: string,
  originalViolations: ViolationItem[],
  originalScanId: string,
  anthropicKey: string
): Promise<ReVerifyResult> {
  // re_verify always runs the deterministic standard scan: the factual story is
  // anchored on axe, and the vision tier is advisory only.
  const newScan = await scanPage(url, anthropicKey, "single_page", 1, "standard");

  // Persist the actual new scan (every violation already carries a fresh uuid),
  // so the new scan_id is usable by follow-up tools and there is no PK collision
  // from re-inserting original violation rows.
  await persistScan(newScan);

  const newViolations = newScan.violations;

  // --- Factual tier: axe only ---
  const origAxe = originalViolations.filter((v) => v.source === "axe");
  const newAxe = newViolations.filter((v) => v.source === "axe");
  const axe = diffTier(origAxe, newAxe);

  const originalCount = origAxe.length;
  const currentCount = newAxe.length;
  const resolvedCount = axe.resolved.length;
  const improvementPct = originalCount > 0 ? Math.round((resolvedCount / originalCount) * 100) : 100;

  let summary: string;
  if (originalCount === 0 && axe.added.length === 0) {
    summary =
      "No factual (axe-core) violations existed in the original scan and none were introduced. See advisory findings for AI visual observations.";
  } else if (resolvedCount === originalCount && axe.added.length === 0) {
    summary = `All ${originalCount} factual (axe-core) violation(s) have been resolved. The page now passes the automated DOM checks that were previously failing.`;
  } else if (resolvedCount > 0 && axe.added.length === 0) {
    summary = `${resolvedCount} of ${originalCount} factual violation(s) resolved (${improvementPct}% improvement). ${axe.persisting.length} remain. No new factual issues introduced.`;
  } else if (resolvedCount > 0 && axe.added.length > 0) {
    summary = `${resolvedCount} of ${originalCount} factual violation(s) resolved (${improvementPct}% improvement). ${axe.persisting.length} persist and ${axe.added.length} new factual issue(s) were introduced.`;
  } else if (resolvedCount === 0 && axe.added.length > 0) {
    summary = `No factual violations were resolved and ${axe.added.length} new factual issue(s) were introduced (from ${originalCount} to ${currentCount}).`;
  } else {
    summary = `No change in factual violations. ${axe.persisting.length} violation(s) persist from the original scan.`;
  }

  // --- Advisory tier: vision only ---
  const origVision = originalViolations.filter((v) => v.source === "vision");
  const newVision = newViolations.filter((v) => v.source === "vision");
  const vision = diffTier(origVision, newVision);

  const visionAdvisory: VisionAdvisory = {
    originalFindings: origVision.length,
    currentFindings: newVision.length,
    resolved: vision.resolved,
    persisting: vision.persisting,
    newFindings: vision.added,
    note: "Vision findings are AI visual judgments and are non-deterministic. They are advisory only and do not affect the factual resolved/persisting counts or the improvement percentage above. Differences between runs may reflect model variance rather than code changes.",
  };

  return {
    scanId: newScan.scanId,
    originalScanId,
    url,
    timestamp: newScan.timestamp,
    originalViolations: originalCount,
    currentViolations: currentCount,
    resolved: axe.resolved,
    persisting: axe.persisting,
    newViolations: axe.added,
    improvementPercentage: improvementPct,
    summary,
    visionAdvisory,
  };
}
