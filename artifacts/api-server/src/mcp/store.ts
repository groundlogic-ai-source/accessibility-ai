import { eq } from "drizzle-orm";
import { db, scansTable, violationsTable, vpatReportsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import type { ScanResult, ViolationItem, VpatReport } from "./types";

export async function persistScan(result: ScanResult): Promise<void> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(scansTable).values({
    id: result.scanId,
    url: result.url,
    scanDepth: "single_page",
    pagesScanned: result.pagesScanned,
    totalViolations: result.totalViolations,
    violationsBySeverity: result.violationsBySeverity,
    estimatedFixTime: result.estimatedFixTime,
    status: "complete",
    expiresAt,
  });

  if (result.violations.length > 0) {
    await db.insert(violationsTable).values(
      result.violations.map((v) => ({
        id: v.id,
        scanId: result.scanId,
        wcagCriterion: v.wcagCriterion,
        issue: v.issue,
        severity: v.severity,
        elementDescription: v.elementDescription,
        suggestedFix: v.suggestedFix,
        source: v.source,
        impact: v.impact ?? null,
        helpUrl: v.helpUrl ?? null,
      }))
    );
  }

  logger.info({ scanId: result.scanId, totalViolations: result.totalViolations }, "Scan persisted");
}

export async function loadScan(scanId: string): Promise<ScanResult | null> {
  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId));
  if (!scan) return null;

  if (scan.expiresAt < new Date()) {
    logger.info({ scanId }, "Scan expired, cleaning up");
    await db.delete(scansTable).where(eq(scansTable.id, scanId));
    return null;
  }

  const violations = await db
    .select()
    .from(violationsTable)
    .where(eq(violationsTable.scanId, scanId));

  const sev = scan.violationsBySeverity as {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };

  return {
    scanId: scan.id,
    url: scan.url,
    timestamp: scan.createdAt.toISOString(),
    totalViolations: scan.totalViolations,
    violationsBySeverity: sev,
    pagesScanned: scan.pagesScanned,
    estimatedFixTime: scan.estimatedFixTime,
    violations: violations.map((v) => ({
      id: v.id,
      wcagCriterion: v.wcagCriterion,
      issue: v.issue,
      severity: v.severity as ViolationItem["severity"],
      elementDescription: v.elementDescription,
      suggestedFix: v.suggestedFix,
      source: v.source as ViolationItem["source"],
      impact: v.impact ?? undefined,
      helpUrl: v.helpUrl ?? undefined,
    })),
  };
}

export async function persistVpatReport(
  reportId: string,
  scanId: string,
  report: VpatReport,
  pdfBase64: string
): Promise<void> {
  await db.insert(vpatReportsTable).values({
    id: reportId,
    scanId,
    productName: report.productName,
    productVersion: report.productVersion,
    companyName: report.companyName,
    contactEmail: report.contactEmail,
    evaluationDate: report.evaluationDate,
    notes: report.notes ?? null,
    reportJson: report as unknown as Record<string, unknown>,
    pdfBase64,
  });

  logger.info({ reportId, scanId }, "VPAT report persisted");
}

export async function cleanupExpiredScans(): Promise<void> {
  try {
    const { lt } = await import("drizzle-orm");
    const result = await db
      .delete(scansTable)
      .where(lt(scansTable.expiresAt, new Date()))
      .returning({ id: scansTable.id });
    if (result.length > 0) {
      logger.info({ count: result.length }, "Expired scans cleaned up");
    }
  } catch (err) {
    logger.warn({ err }, "Cleanup task failed");
  }
}
