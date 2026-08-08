import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const scope = `test-${Math.random()}`;
    const result = checkRateLimit("1.2.3.4", scope, { limit: 3, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const scope = `test-${Math.random()}`;
    const options = { limit: 2, windowMs: 60_000 };

    expect(checkRateLimit("5.5.5.5", scope, options).allowed).toBe(true);
    expect(checkRateLimit("5.5.5.5", scope, options).allowed).toBe(true);
    const blocked = checkRateLimit("5.5.5.5", scope, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates counters per scope for the same identifier", () => {
    const identifier = "9.9.9.9";
    const options = { limit: 1, windowMs: 60_000 };

    expect(checkRateLimit(identifier, "scope-a", options).allowed).toBe(true);
    // Mesmo IP, escopo diferente — não deve herdar o contador de scope-a.
    expect(checkRateLimit(identifier, "scope-b", options).allowed).toBe(true);
    expect(checkRateLimit(identifier, "scope-a", options).allowed).toBe(false);
  });

  it("isolates counters per identifier for the same scope", () => {
    const scope = `test-${Math.random()}`;
    const options = { limit: 1, windowMs: 60_000 };

    expect(checkRateLimit("1.1.1.1", scope, options).allowed).toBe(true);
    expect(checkRateLimit("2.2.2.2", scope, options).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("prefers x-forwarded-for, taking the first entry", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.5" },
    });
    expect(getClientIp(request)).toBe("10.0.0.5");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
