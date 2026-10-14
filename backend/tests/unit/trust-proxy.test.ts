import { describe, expect, it } from "vitest";
import { resolveTrustProxy } from "../../src/lib/trust-proxy.ts";

describe("resolveTrustProxy", () => {
  it("defaults to false (trust nothing) when unset", () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy("")).toBe(false);
  });

  it('trusts every hop on "true"', () => {
    expect(resolveTrustProxy("true")).toBe(true);
  });

  it("splits a comma-separated list of proxy addresses", () => {
    expect(resolveTrustProxy("10.0.0.1, 10.0.0.2")).toEqual([
      "10.0.0.1",
      "10.0.0.2",
    ]);
  });

  it("wraps a single address in an array", () => {
    expect(resolveTrustProxy("10.0.0.1")).toEqual(["10.0.0.1"]);
  });

  // Deliberately not supported — see the comment on `resolveTrustProxy`
  // for why a bare hop count ("1") can't be trusted the way it looks like
  // it should: it falls through to the comma-split branch and comes out
  // as a (useless, matches-nothing) literal address, same as any other
  // malformed value — this is itself the regression test for that.
  it("does not treat a bare number as a hop count", () => {
    expect(resolveTrustProxy("1")).toEqual(["1"]);
  });
});
