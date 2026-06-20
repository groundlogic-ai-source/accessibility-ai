import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scansTable = pgTable("scans", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  scanDepth: text("scan_depth").notNull().default("single_page"),
  pagesScanned: integer("pages_scanned").notNull().default(1),
  totalViolations: integer("total_violations").notNull().default(0),
  violationsBySeverity: jsonb("violations_by_severity").notNull().default({}),
  estimatedFixTime: text("estimated_fix_time").notNull().default("Unknown"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const violationsTable = pgTable("violations", {
  id: text("id").primaryKey(),
  scanId: text("scan_id").notNull().references(() => scansTable.id, { onDelete: "cascade" }),
  wcagCriterion: text("wcag_criterion").notNull(),
  issue: text("issue").notNull(),
  severity: text("severity").notNull(),
  elementDescription: text("element_description").notNull(),
  suggestedFix: text("suggested_fix").notNull(),
  source: text("source").notNull().default("axe"),
  impact: text("impact"),
  helpUrl: text("help_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vpatReportsTable = pgTable("vpat_reports", {
  id: text("id").primaryKey(),
  scanId: text("scan_id").notNull().references(() => scansTable.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  productVersion: text("product_version").notNull().default("1.0"),
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  evaluationDate: text("evaluation_date").notNull(),
  notes: text("notes"),
  reportJson: jsonb("report_json").notNull().default({}),
  pdfBase64: text("pdf_base64"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanSchema = createInsertSchema(scansTable);
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;

export const insertViolationSchema = createInsertSchema(violationsTable);
export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type Violation = typeof violationsTable.$inferSelect;

export const insertVpatReportSchema = createInsertSchema(vpatReportsTable);
export type InsertVpatReport = z.infer<typeof insertVpatReportSchema>;
export type VpatReport = typeof vpatReportsTable.$inferSelect;
