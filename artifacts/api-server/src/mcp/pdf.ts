import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { VpatReport } from "./types";

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

  function conformanceBadgeColor(level: string): string {
  switch (level) {
    case "Supports": return "#16a34a";
    case "Partially Supports": return "#d97706";
    case "Does Not Support": return "#dc2626";
    case "Not Applicable": return "#6b7280";
    default: return "#9ca3af";
  }
}

function buildHtml(report: VpatReport): string {
  const webSection = report.sections.find((s) => s.clause.startsWith("Clause 9"));
  const otherSections = report.sections.filter((s) => !s.clause.startsWith("Clause 9"));

  const webRows = webSection?.criteria
    .map(
      (c) => `
      <tr>
        <td class="criterion-cell">
          <strong>${c.criterion}</strong> ${c.name}<br>
          <span class="level-badge">Level ${c.level}</span>
        </td>
        <td class="conformance-cell">
          <span class="badge" style="background:${conformanceBadgeColor(c.conformanceLevel)}">${c.conformanceLevel}</span>
        </td>
        <td class="remarks-cell">${c.remarksAndExplanations}</td>
      </tr>`
    )
    .join("") ?? "";

  const otherSectionsHtml = otherSections
    .map(
      (section) => `
      <div class="section-block">
        <h3>${section.clause} — ${section.title}</h3>
        ${section.notes ? `<p class="section-note">${section.notes}</p>` : ""}
        ${
          section.criteria.length > 0
            ? `<table>
            <thead><tr><th>Criterion</th><th>Conformance Level</th><th>Remarks and Explanations</th></tr></thead>
            <tbody>
              ${section.criteria
                .map(
                  (c) => `<tr>
                <td class="criterion-cell"><strong>${c.criterion}</strong> ${c.name}</td>
                <td class="conformance-cell"><span class="badge" style="background:${conformanceBadgeColor(c.conformanceLevel)}">${c.conformanceLevel}</span></td>
                <td class="remarks-cell">${c.remarksAndExplanations}</td>
              </tr>`
                )
                .join("")}
            </tbody>
          </table>`
            : ""
        }
      </div>`
    )
    .join("");

  const supporting = webSection?.criteria.filter((c) => c.conformanceLevel === "Supports").length ?? 0;
  const total = webSection?.criteria.length ?? 1;
  const pct = report.overallConformancePercentage;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: #fff; }
  .cover { page-break-after: always; padding: 60px 50px; background: #1e293b; color: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 28pt; margin-bottom: 16px; color: #f8fafc; }
  .cover h2 { font-size: 16pt; margin-bottom: 40px; color: #94a3b8; font-weight: normal; }
  .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 40px; }
  .cover-field { background: rgba(255,255,255,0.08); padding: 12px 16px; border-radius: 6px; }
  .cover-field label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
  .cover-field span { font-size: 11pt; color: #f1f5f9; }
  .cover-badge { display: inline-block; background: #3b82f6; color: #fff; font-size: 9pt; padding: 4px 12px; border-radius: 20px; margin-top: 20px; }
  .content { padding: 40px 50px; }
  .executive-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 32px; }
  .executive-summary h2 { font-size: 14pt; margin-bottom: 16px; color: #1e293b; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
  .summary-card { text-align: center; padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
  .summary-card .number { font-size: 24pt; font-weight: bold; }
  .summary-card .label { font-size: 8pt; color: #64748b; text-transform: uppercase; margin-top: 4px; }
  .progress-bar-outer { background: #e2e8f0; border-radius: 4px; height: 12px; margin: 12px 0; }
  .progress-bar-inner { background: #16a34a; border-radius: 4px; height: 12px; }
  h2.section-heading { font-size: 14pt; margin: 32px 0 12px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9pt; }
  thead th { background: #1e293b; color: #fff; padding: 8px 10px; text-align: left; font-size: 9pt; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td { padding: 8px 10px; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
  .criterion-cell { width: 28%; }
  .conformance-cell { width: 18%; text-align: center; vertical-align: middle; }
  .remarks-cell { width: 54%; }
  .badge { display: inline-block; color: #fff; font-size: 8pt; padding: 3px 8px; border-radius: 12px; white-space: nowrap; }
  .level-badge { display: inline-block; font-size: 7.5pt; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 10px; margin-top: 3px; }
  .section-block { margin-bottom: 32px; }
  .section-block h3 { font-size: 12pt; color: #1e293b; margin-bottom: 8px; }
  .section-note { font-size: 9pt; color: #64748b; margin-bottom: 12px; font-style: italic; }
  .disclaimer { background: #fef9c3; border: 1px solid #fde68a; border-radius: 6px; padding: 16px; margin-top: 32px; font-size: 8.5pt; color: #713f12; }
  .disclaimer strong { display: block; margin-bottom: 6px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; }
  @page { margin: 0; }
</style>
</head>
<body>

<div class="cover">
  <div>
    <div class="cover-badge">VPAT® 2.5Rev — EN 301 549 Edition</div>
    <h1 style="margin-top:20px">${report.companyName}</h1>
    <h2>Accessibility Conformance Report</h2>
    <p style="color:#94a3b8;font-size:11pt">Based on VPAT® Version 2.5Rev</p>
    <div class="cover-grid">
      <div class="cover-field"><label>Product</label><span>${report.productName}</span></div>
      <div class="cover-field"><label>Version</label><span>${report.productVersion}</span></div>
      <div class="cover-field"><label>Report Date</label><span>${report.evaluationDate}</span></div>
      <div class="cover-field"><label>Contact</label><span>${report.contactEmail}</span></div>
      <div class="cover-field" style="grid-column:1/-1"><label>Web Conformance</label><span>${report.overallConformancePercentage}% of WCAG 2.1 Level A &amp; AA criteria met</span></div>
    </div>
  </div>
</div>

<div class="content">

  <div class="executive-summary">
    <h2>Executive Summary</h2>
    <p style="font-size:9.5pt;color:#475569">
      This report was generated by AccessibilityAI (GroundLogic AI) using automated DOM scanning (axe-core) 
      and AI visual analysis (Claude Vision). It covers WCAG 2.1 Level A and AA success criteria (${total} total) 
      and all EN 301 549 clauses as applicable.
    </p>
    <div class="progress-bar-outer">
      <div class="progress-bar-inner" style="width:${pct}%"></div>
    </div>
    <p style="font-size:9pt;color:#475569">${pct}% conformance (${supporting} of ${total} web criteria meet WCAG 2.1)</p>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="number" style="color:#16a34a">${supporting}</div>
        <div class="label">Supports</div>
      </div>
      <div class="summary-card">
        <div class="number" style="color:#d97706">${webSection?.criteria.filter(c => c.conformanceLevel === "Partially Supports").length ?? 0}</div>
        <div class="label">Partial</div>
      </div>
      <div class="summary-card">
        <div class="number" style="color:#dc2626">${webSection?.criteria.filter(c => c.conformanceLevel === "Does Not Support").length ?? 0}</div>
        <div class="label">Does Not Support</div>
      </div>
      <div class="summary-card">
        <div class="number" style="color:#6b7280">${webSection?.criteria.filter(c => c.conformanceLevel === "Not Applicable").length ?? 0}</div>
        <div class="label">Not Applicable</div>
      </div>
    </div>
  </div>

  <h2 class="section-heading">Applicable Standards/Guidelines</h2>
  <table>
    <thead><tr><th>Standard/Guideline</th><th>Included in Report</th></tr></thead>
    <tbody>
      <tr><td>Web Content Accessibility Guidelines 2.1 — Level A</td><td>Yes</td></tr>
      <tr><td>Web Content Accessibility Guidelines 2.1 — Level AA</td><td>Yes</td></tr>
      <tr><td>EN 301 549 V3.1.1 (2019-11) &amp; V3.2.1 (2021-03)</td><td>Yes — Clause 9 (Web) fully evaluated; other clauses Not Evaluated (web-only product)</td></tr>
    </tbody>
  </table>

  <h2 class="section-heading">Terms</h2>
  <table>
    <thead><tr><th>Term</th><th>Definition</th></tr></thead>
    <tbody>
      <tr><td><strong>Supports</strong></td><td>The functionality meets the criterion without known defects.</td></tr>
      <tr><td><strong>Partially Supports</strong></td><td>Some functionality does not meet the criterion.</td></tr>
      <tr><td><strong>Does Not Support</strong></td><td>The majority of product functionality does not meet the criterion.</td></tr>
      <tr><td><strong>Not Applicable</strong></td><td>The criterion is not relevant to the product.</td></tr>
      <tr><td><strong>Not Evaluated</strong></td><td>The product has not been evaluated against the criterion.</td></tr>
    </tbody>
  </table>

  <h2 class="section-heading">Evaluation Methods Used</h2>
  <p style="font-size:9.5pt;color:#374151;margin-bottom:24px">
    Evaluation performed by AccessibilityAI (GroundLogic AI) using: (1) Automated DOM scanning via axe-core 
    with WCAG 2.1 Level A and AA rulesets, run against a live Chromium browser instance via Playwright; 
    (2) AI visual analysis via Claude Vision API, examining full-page screenshots for visually apparent 
    accessibility issues not detectable by DOM scanning (color contrast, target size, label visibility); 
    (3) Automated WCAG criterion mapping and conformance determination based on violation severity and count. 
    Testing was performed by automated tools with AI assistance. Manual testing by certified accessibility 
    specialists is recommended for full compliance certification.
  </p>

  ${report.notes ? `<h2 class="section-heading">Notes</h2><p style="font-size:9.5pt;color:#374151;margin-bottom:24px">${report.notes}</p>` : ""}

  <h2 class="section-heading">Table 1 &amp; 2: WCAG 2.1 — Level A and AA (Clause 9 — Web)</h2>
  <table>
    <thead>
      <tr>
        <th>Criteria</th>
        <th>Conformance Level</th>
        <th>Remarks and Explanations</th>
      </tr>
    </thead>
    <tbody>${webRows}</tbody>
  </table>

  <h2 class="section-heading">EN 301 549 — Additional Clauses</h2>
  ${otherSectionsHtml}

  <div class="disclaimer">
    <strong>Important Disclaimer</strong>
    This report covers automated and AI-assisted checks. Automated tools detect approximately 40–60% of 
    accessibility issues. Manual review by certified accessibility specialists is recommended for full 
    WCAG compliance certification. This report does not constitute legal certification of conformance. 
    GroundLogic AI makes no warranty of completeness or fitness for regulatory submission without 
    supplemental manual evaluation.
  </div>

  <div class="footer">
    <p>Generated by AccessibilityAI — GroundLogic AI | info@groundlogic.ai</p>
    <p>Report ID: ${report.reportId} | Scan ID: ${report.scanId}</p>
    <p>VPAT® is a registered service mark of the Information Technology Industry Council (ITI).</p>
  </div>

</div>
</body>
</html>`;
}

export async function generatePdf(report: VpatReport): Promise<string> {
  const html = buildHtml(report);
  const executablePath = resolveBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer).toString("base64");
  } finally {
    await browser.close();
  }
}
