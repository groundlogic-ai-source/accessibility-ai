# AccessibilityAI — by GroundLogic AI

> Autonomous WCAG 2.1 accessibility auditor that scans, fixes, re-verifies, and generates VPAT 2.5 EN 301 549 reports using AI vision analysis + DOM scanning.

> **⚠️ Beta Release** — AccessibilityAI is an early-stage prototype. Automated tools detect approximately 40–60% of accessibility issues. Manual review by a certified specialist is recommended before submitting VPAT reports for formal compliance purposes. Expect rough edges — please [share feedback or report bugs](https://docs.google.com/forms/d/e/1FAIpQLSfRsgE_-xFmkuwtMhmVHJULcvfY4y8SNw81iEJJxJREra6t7Q/viewform?usp=publish-editor) using the form below.

**[Add demo GIF here]**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![WCAG 2.1](https://img.shields.io/badge/WCAG-2.1-green.svg)](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Feedback

AccessibilityAI is actively developed. If something breaks or you have a feature request, we want to know.

**[→ Open the feedback form](https://docs.google.com/forms/d/e/1FAIpQLSfRsgE_-xFmkuwtMhmVHJULcvfY4y8SNw81iEJJxJREra6t7Q/viewform?usp=publish-editor)**

You can also [open a GitHub Issue](https://github.com/groundlogic-ai-source/accessibility-ai/issues) for bug reports.

---

## What It Does

AccessibilityAI is an open-source MCP server that:

1. **Scans** a URL using axe-core (DOM) + Claude Vision (AI screenshot analysis)
2. **Generates** surgical, framework-specific code fixes for every violation
3. **Re-verifies** by re-scanning after fixes are applied, showing exactly what was resolved
4. **Produces** a complete VPAT 2.5 EN 301 549 accessibility conformance report (all clauses, PDF + JSON)

It runs as an MCP server over Streamable HTTP — compatible with Claude Desktop, Claude Code, Cursor, and any MCP client.

---

## Quick Start

This is a **pnpm monorepo**. The MCP server lives in `artifacts/api-server/`.

```bash
# 1. Clone and install
git clone https://github.com/groundlogic-ai-source/accessibility-ai
cd accessibility-ai
pnpm install

# 2. Install the Playwright browser (required for scanning)
npx playwright install chromium

# 3. Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/accessibilityai"
# Or copy from a .env file — pnpm-workspace reads it automatically

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. Start the MCP server
pnpm --filter @workspace/api-server run dev
# MCP endpoint:   http://localhost:8080/mcp
# Health check:   http://localhost:8080/api/healthz
# REST scan:      http://localhost:8080/api/scan  (no MCP client needed)
```

---

## Bring Your Own Key

AccessibilityAI uses a **Bring Your Own Key (BYOK)** model. You supply your own Anthropic API key with each tool call — it is never stored, never logged, and used only for the duration of that single request.

**Your key is never retained.** See [PRIVACY.md](PRIVACY.md) for full details.

You can get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com).

---

## MCP Tools

### `scan_accessibility`

Scans a URL for WCAG 2.1 accessibility violations using DOM analysis and visual AI.

**Input:**
```json
{
  "url": "https://example.com",
  "anthropic_api_key": "sk-ant-...",
  "scan_depth": "single_page",
  "max_pages": 1
}
```

**Output:**
```json
{
  "scan_id": "uuid",
  "url": "https://example.com",
  "total_violations": 12,
  "violations_by_severity": { "critical": 2, "serious": 4, "moderate": 5, "minor": 1 },
  "estimated_fix_time": "2-4 hours",
  "violations": [...]
}
```

---

### `generate_fixes`

Takes scan results and generates specific code fixes for each violation. Returns patches ready to paste into Claude Code or Replit Agent.

**Input:**
```json
{
  "scan_id": "uuid-from-scan",
  "framework": "react",
  "anthropic_api_key": "sk-ant-..."
}
```

**Output:**
```json
{
  "scan_id": "uuid",
  "fixes": [
    {
      "wcag_criterion": "1.1.1",
      "issue": "Image missing alt text",
      "before": "<img src=\"hero.jpg\">",
      "after": "<img src=\"hero.jpg\" alt=\"Hero banner showing product dashboard\">",
      "explanation": "...",
      "caveats": "..."
    }
  ],
  "copy_paste_summary": "Please fix the following accessibility violations in my codebase:\n..."
}
```

The `copy_paste_summary` field is formatted to paste directly into Claude Code or Replit Agent.

---

### `re_verify`

Re-scans the URL after fixes have been applied and compares against the original scan.

**Input:**
```json
{
  "scan_id": "original-scan-uuid",
  "anthropic_api_key": "sk-ant-..."
}
```

**Output:**
```json
{
  "original_violations": 12,
  "current_violations": 3,
  "resolved": [...],
  "persisting": [...],
  "new_violations": [],
  "improvement_percentage": 75,
  "summary": "9 of 12 violations resolved (75% improvement). 3 violation(s) remain."
}
```

---

### `generate_vpat`

Generates a complete VPAT 2.5 EN 301 549 accessibility conformance report. Returns a PDF (base64) and structured JSON covering all clauses.

**Input:**
```json
{
  "scan_id": "uuid-from-scan",
  "product_name": "My SaaS App",
  "product_version": "2.1.0",
  "company_name": "Acme Corp",
  "contact_email": "accessibility@acme.com",
  "anthropic_api_key": "sk-ant-..."
}
```

**Output:**
- `vpat_json` — Full structured VPAT report (all EN 301 549 clauses)
- `pdf_base64` — Base64-encoded PDF, decode and save as `.pdf`
- `overall_conformance_percentage` — % of WCAG 2.1 Level A & AA criteria met

---

## Example Prompts

Use these prompts with Claude Desktop, Claude Code, or any MCP client connected to AccessibilityAI:

**1. Scan a site and get a violation summary:**
```
Scan https://example.com for WCAG 2.1 accessibility violations using my Anthropic key sk-ant-... and give me a prioritized summary of what needs to be fixed.
```

**2. Generate code fixes for a specific framework:**
```
Use the scan_id from the accessibility scan you just ran to generate React code fixes for all the violations. Format them so I can paste them directly into my codebase.
```

**3. Re-verify fixes and produce a VPAT report:**
```
Re-verify https://example.com using the original scan_id to confirm my fixes resolved the issues, then generate a complete VPAT 2.5 compliance report for "Acme Corp" and return the PDF.
```

---

## Used in Production

AccessibilityAI powers accessibility compliance workflows in healthcare and government sectors where VPAT documentation is required for procurement. Organizations use it to generate baseline conformance reports before manual audits, saving 4-8 hours per audit cycle.

---

## Limitations

- Automated tools detect approximately **40–60% of accessibility issues**. Manual review by a certified accessibility specialist is recommended for full compliance certification.
- VPAT reports generated by this tool should be reviewed before regulatory submission.
- Full-site scans are capped at 10 pages. Deep navigation paths may not be reached.
- Non-web EN 301 549 clauses (hardware, voice, closed software) are marked "Not Evaluated" — manual assessment required for those.
- Scan results are retained for 1 hour. Re-run `scan_accessibility` if results expire.

---

## MCP Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "accessibility-ai": {
      "url": "https://your-deployed-instance.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

### Claude Code / CLI

```bash
claude mcp add --transport http accessibility-ai https://your-deployed-instance.com/mcp
```

---

## Contributing

Contributions are welcome. Please:

1. Fork the repo and create a feature branch
2. Follow existing code style (TypeScript strict mode, no `any`)
3. Add or update tests for changed behavior
4. Open a pull request with a clear description

For bug reports and feature requests, open a [GitHub Issue](https://github.com/groundlogic-ai-source/accessibility-ai/issues) or use the [feedback form](https://docs.google.com/forms/d/e/1FAIpQLSfRsgE_-xFmkuwtMhmVHJULcvfY4y8SNw81iEJJxJREra6t7Q/viewform?usp=publish-editor).

---

## License

MIT — see [LICENSE](LICENSE) for details.

GroundLogic AI — [info@groundlogic.ai](mailto:info@groundlogic.ai)
