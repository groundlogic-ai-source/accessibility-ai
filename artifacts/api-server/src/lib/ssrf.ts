import { promises as dns } from "node:dns";
import { isIP } from "node:net";

// ---------------------------------------------------------------------------
// Private IP detection
// ---------------------------------------------------------------------------

function ipv4ToUint32(ip: string): number {
  return ip
    .split(".")
    .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

interface Cidr4 {
  base: number;
  mask: number;
}

// All private, loopback, link-local, and reserved IPv4 ranges.
const PRIVATE_CIDR4: Cidr4[] = (
  [
    ["127.0.0.0", 8],    // loopback
    ["10.0.0.0", 8],     // RFC 1918
    ["172.16.0.0", 12],  // RFC 1918
    ["192.168.0.0", 16], // RFC 1918
    ["169.254.0.0", 16], // link-local (APIPA)
    ["100.64.0.0", 10],  // CGNAT / shared address space
    ["0.0.0.0", 8],      // "this" network
    ["198.18.0.0", 15],  // RFC 2544 benchmarking
    ["192.0.0.0", 24],   // IETF protocol assignments
    ["192.0.2.0", 24],   // TEST-NET-1 (documentation)
    ["198.51.100.0", 24],// TEST-NET-2 (documentation)
    ["203.0.113.0", 24], // TEST-NET-3 (documentation)
    ["240.0.0.0", 4],    // reserved (future use / broadcast)
  ] as const
).map(([addr, prefix]) => {
  // None of the CIDRs above are /32, so no special-case needed.
  const mask = (~(0xffffffff >>> (prefix as number))) >>> 0;
  const base = ipv4ToUint32(addr) & mask;
  return { base, mask };
});

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToUint32(ip);
  return PRIVATE_CIDR4.some(({ base, mask }) => (n & mask) === base);
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    addr === "::1" ||           // loopback
    addr === "::" ||            // unspecified
    addr.startsWith("fc") ||   // unique local (fc00::/7)
    addr.startsWith("fd") ||   // unique local (fc00::/7)
    addr.startsWith("fe80") || // link-local (fe80::/10)
    addr.startsWith("::ffff:") // IPv4-mapped (may carry private v4 addr)
  );
}

/** Returns true if the IP address (v4 or v6) is private, loopback, or link-local. */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Resolve the hostname of `rawUrl` via DNS and reject if it points to a
 * private/loopback/link-local address. Throws an Error with a safe message
 * on any violation; callers should surface this directly to the requester.
 *
 * This is the upfront pre-flight check — call it before launching Playwright.
 * The in-flight Playwright `page.route()` intercept (see scanner.ts) covers
 * the redirect-chain bypass case (public URL → 301 → private IP).
 */
export async function validateUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Only http and https URLs are accepted (got "${parsed.protocol}"). file://, ftp://, and other schemes are not permitted.`
    );
  }

  const { hostname } = parsed;

  // Reject bare localhost / all-zeros before DNS resolution.
  if (hostname === "localhost" || hostname === "0.0.0.0") {
    throw new Error("SSRF protection: the target hostname is a reserved address.");
  }

  // If the caller supplied a raw IP address, skip DNS and check directly.
  if (isIP(hostname) !== 0) {
    if (isPrivateIp(hostname)) {
      throw new Error(
        "SSRF protection: the target IP address is in a private, loopback, or link-local range. Only public URLs may be scanned."
      );
    }
    return;
  }

  // For hostnames, resolve to an IP and check.
  let address: string;
  try {
    ({ address } = await dns.lookup(hostname, { verbatim: false }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`DNS resolution failed for "${hostname}": ${msg}`);
  }

  if (isPrivateIp(address)) {
    throw new Error(
      `SSRF protection: "${hostname}" resolves to a private/loopback/link-local address. Only public URLs may be scanned.`
    );
  }
}

/**
 * Async check for a single URL string — used by the Playwright page.route()
 * intercept to block redirect-chain bypasses.
 *
 * Returns true if the URL should be blocked.
 */
export async function isBlockedUrl(rawUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;

    const { hostname } = parsed;
    if (hostname === "localhost" || hostname === "0.0.0.0") return true;

    if (isIP(hostname) !== 0) return isPrivateIp(hostname);

    const { address } = await dns.lookup(hostname, { verbatim: false });
    return isPrivateIp(address);
  } catch {
    // Unparseable URL or DNS failure — block by default.
    return true;
  }
}
