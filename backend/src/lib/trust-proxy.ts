/**
 * Parses `env.TRUST_PROXY` into whatever shape Fastify's own `trustProxy`
 * constructor option wants. Kept as a pure function (rather than inline in
 * `app.ts`) so the parsing rules are unit-testable on their own — see
 * `tests/unit/trust-proxy.test.ts`.
 *
 * Deliberately doesn't accept a bare hop count (e.g. "1" for "exactly one
 * reverse proxy in front of this") — that was the obvious design here, but
 * Fastify 5.12.1 patched a CVE (GHSA-3m5p-2c4r-xxw2, one of the advisories
 * `fastify`'s own bump in this same change fixes) that makes a numeric
 * `trustProxy` trust *nothing*, on purpose: a hop count alone can't
 * validate the immediate peer, so a direct, non-proxied client could just
 * send enough fake `X-Forwarded-*` hops to spoof its way to "trusted"
 * anyway. The safe equivalent is naming the proxy's address explicitly —
 * `proxy-addr` (what this resolves to) then only trusts `X-Forwarded-*`
 * when the request's *immediate* peer is one of those addresses.
 *
 * Accepts:
 * - unset/empty → `false` (Fastify's own default — trust nothing)
 * - "true" → trust every hop (only correct if the network genuinely makes
 *   it impossible for anything but the real proxy to reach this process
 *   directly — e.g. a PaaS's internal network)
 * - anything else → split on commas into a list of trusted proxy
 *   IPs/CIDRs (the specific host's load balancer address) — the option to
 *   reach for once a host is picked
 */
export function resolveTrustProxy(
  value: string | undefined,
): boolean | string[] {
  if (!value) return false;
  if (value === "true") return true;

  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
