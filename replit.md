# AccessibilityAI — GroundLogic AI

An open-source MCP server that autonomously scans URLs for WCAG 2.1 violations, generates code fixes, re-verifies them, and produces complete VPAT 2.5 EN 301 549 compliance reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API + MCP server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- MCP: @modelcontextprotocol/sdk (Streamable HTTP transport)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Browser automation: Playwright (Chromium)
- Accessibility scanning: axe-core via @axe-core/playwright
- AI analysis: Anthropic Claude API (BYOK — user-supplied key per request)
- Validation: Zod 3, drizzle-zod
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/mcp/` — all MCP tool logic
  - `server.ts` — MCP server + tool registration (StreamableHTTP)
  - `scanner.ts` — Playwright + axe-core DOM scan + Claude Vision
  - `fixer.ts` — AI-powered code fix generation (batched, 5 per call)
  - `vpat.ts` — VPAT 2.5 EN 301 549 report builder
  - `pdf.ts` — HTML-to-PDF via Playwright
  - `reverify.ts` — re-scan and diff against original
  - `store.ts` — DB persistence (scan results, violations, VPAT reports)
  - `types.ts` — shared TypeScript interfaces
- `artifacts/api-server/vpat-template/vpat-2.5.json` — all 50 WCAG 2.1 Level A/AA criteria
- `lib/db/src/schema/scans.ts` — DB schema: scans, violations, vpat_reports tables
- `README.md` — user-facing documentation
- `PRIVACY.md` — privacy policy (served at GET /privacy)

## Architecture decisions

- **BYOK model**: Anthropic API key is required per tool call, held in memory for request duration only, never stored or logged. Redacted in all pino log output.
- **Streamable HTTP transport** (not stdio): required for Claude Connector Directory. MCP endpoint at `POST/GET/DELETE /mcp`.
- **DB persistence for scan state**: scan results survive server restarts (1-hour TTL). Chosen over in-memory Map for reliability.
- **HTML-to-PDF via Playwright**: Playwright is already in the stack for scanning; using it for PDF avoids the complex manual layout code pdf-lib requires.
- **Full VPAT 2.5 EN 301 549 scope**: Clause 9 (Web) fully evaluated; Clauses 5–8, 10–13 auto-filled as "Not Evaluated" with professional vendor notes — standard enterprise practice.
- **4 tools not 3**: `re_verify` added as a 4th tool to back the "re-verifies fixes" headline claim.

## Product

4 MCP tools:
1. `scan_accessibility` — scan URL with axe-core + Claude Vision, returns violations + scan_id
2. `generate_fixes` — AI code fixes per violation, batched (5/call), copy-paste summary for Claude Code/Replit Agent
3. `re_verify` — re-scan after fixes, diff resolved/persisting/new violations
4. `generate_vpat` — full VPAT 2.5 EN 301 549 report (JSON + PDF base64)

## Endpoints

- `POST/GET/DELETE /mcp` — MCP Streamable HTTP endpoint
- `GET /api/healthz` — health check (standard)
- `GET /api/health` — health check (alias)
- `GET /privacy` — PRIVACY.md as text/plain (required for Claude directory)

## User preferences

- Contact email: info@groundlogic.ai
- Brand: GroundLogic AI
- VPAT non-web clauses: "Not Evaluated" with professional note (standard enterprise practice)
- PDF generation: Playwright HTML-to-PDF
- Scan state: PostgreSQL (not in-memory)
- BYOK: always (users always supply their own key)

## Gotchas

- MCP tools use `server.tool(name, description, schema, annotations, callback)` — 5-arg form. The 3-arg `(name, annotations, callback)` form causes a TS overload error.
- zod import must be from `"zod"` not `"zod/v4"` — the workspace catalog pins zod@^3.x.
- Playwright `$$eval` callbacks run in browser context — use `(el as { href: string }).href` not `(el as HTMLAnchorElement).href` (no DOM lib in tsconfig).
- Cleanup query must use `lt(scansTable.expiresAt, new Date())` not status-based filter.
- The `/mcp` and `/privacy` paths must be in the artifact.toml `paths` array to be routed by the proxy.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
