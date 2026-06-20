---
name: MCP SDK usage patterns
description: Correct tool registration, transport wiring, and import quirks for @modelcontextprotocol/sdk v1.29
---

## Tool registration — use 5-arg form

The correct non-deprecated form for tools with both schema and annotations:

```typescript
server.tool(name, description, paramsSchema, annotations, callback)
```

Passing an annotations object as the 3rd arg (where paramsSchema goes) causes TS2769 overload error. Always put description 2nd, schema 3rd, annotations 4th.

**Why:** The SDK's overload resolution for the 3-arg `(name, paramsSchemaOrAnnotations, cb)` form cannot disambiguate plain objects between ZodRawShape and ToolAnnotations at compile time.

## Zod import

In this workspace zod is pinned to `^3.x` via the catalog. Import as `import { z } from "zod"`, never `"zod/v4"`.

**Why:** `zod/v4` is a subpath export that only exists in zod@4+. The catalog pin is `^3.25.76`.

## StreamableHTTPServerTransport wiring

```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => uuidv4(),
  onsessioninitialized: (id) => { transports.set(id, transport); }
});
const server = createMcpServer();
await server.connect(transport);
await transport.handleRequest(req, res, req.body); // POST
await transport.handleRequest(req, res);            // GET/DELETE
```

The MCP endpoint requires `Accept: application/json, text/event-stream` — clients omitting this get a "Not Acceptable" error (correct behavior).

## Playwright $$eval in Node context

`page.$$eval` callbacks run in browser context but TypeScript compiles them in Node context (no DOM lib). Use:
```typescript
.map((a) => (a as { href: string }).href)  // correct
.map((a) => (a as HTMLAnchorElement).href) // TS2304 error
```

## Routing

MCP paths (`/mcp`, `/privacy`) must be added to the artifact.toml `paths` array or the proxy won't route them to the API server.
