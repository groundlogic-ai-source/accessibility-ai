# Privacy Policy — AccessibilityAI by GroundLogic AI

**Last updated: June 2026**

## What We Are

AccessibilityAI is an open-source MCP (Model Context Protocol) server that scans web pages for WCAG 2.1 accessibility violations, generates code fixes, and produces VPAT 2.5 EN 301 549 compliance reports.

---

## Data Collected

### URLs Submitted for Scanning
- URLs you provide are used solely to perform the accessibility scan.
- URLs are stored in the database temporarily for session continuity (scan results are retained for up to 1 hour, then automatically deleted).
- URLs are never shared with third parties, never used for analytics, and never retained beyond the scan session.

### Screenshots
- Full-page screenshots of submitted URLs are taken during scanning.
- Screenshots are processed in memory and sent to the Anthropic Claude Vision API using the API key you provide.
- Screenshots are **never stored on disk or in any database**.
- Screenshots are held in memory only for the duration of the API call, then discarded.

### User-Supplied Anthropic API Keys
- You supply your own Anthropic API key with each tool call (Bring Your Own Key model).
- API keys are **never logged**. The logging system automatically redacts keys from all output.
- API keys are **never stored** in any database, file, or cache.
- API keys are held in memory only for the duration of the individual scan request, then discarded.
- We have no access to your API key usage, billing, or account information.

### Scan Results and VPAT Reports
- Violation data and generated VPAT reports are stored in the database temporarily to allow follow-up tool calls (generate_fixes, generate_vpat, re_verify) within the same session.
- Scan records expire after 1 hour and are automatically deleted.
- No scan result is linked to any user account or identity.

---

## What We Do NOT Collect

- No user accounts or authentication
- No IP addresses (beyond standard server access logs)
- No analytics or telemetry
- No cookies or tracking pixels
- No persistent user profiles
- No third-party data sharing or advertising

---

## Third-Party Services

When you use the AI analysis features, scan data (screenshots and violation descriptions) is sent to:

- **Anthropic Claude API** — using the API key you provide. Anthropic's data processing is governed by [Anthropic's Privacy Policy](https://www.anthropic.com/privacy). We do not control how Anthropic processes data sent via the API.

No other third-party services receive your data.

---

## Data Retention

| Data Type | Retention Period |
|---|---|
| Scan results (URL, violations) | 1 hour (auto-deleted) |
| VPAT reports | 1 hour (auto-deleted) |
| Screenshots | Never stored (memory only) |
| API keys | Never stored (memory only) |
| Server access logs | Standard server logs, no sensitive content |

---

## Security

- API keys are automatically redacted from all application logs.
- No persistent user data is maintained between sessions.
- This is an open-source project — you can self-host it and retain full control of your data.

---

## Contact

For privacy questions or concerns:

**GroundLogic AI**
Email: info@groundlogic.ai

---

## Changes to This Policy

If this policy changes materially, the update date above will be changed and a note will be added to the repository changelog.
