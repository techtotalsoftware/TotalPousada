import { beforeEach, describe, expect, it } from "vitest";
import { authConfig, createSessionToken, verifySessionToken } from "../auth";
import type { SessionPayload } from "../auth";

const basePayload: Omit<SessionPayload, "exp"> = {
  userId: 1,
  tenantId: 10,
  plan: "Basic" as SessionPayload["plan"],
  tenantName: "Pousada Teste",
  role: "admin" as SessionPayload["role"],
  permissions: [],
  active: true,
};

describe("session token", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("round-trips a valid payload", async () => {
    const token = await createSessionToken(basePayload);
    const verified = await verifySessionToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(basePayload.userId);
    expect(verified?.tenantId).toBe(basePayload.tenantId);
    expect(verified?.role).toBe(basePayload.role);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(basePayload);

    process.env.JWT_SECRET = "different-secret";
    const verified = await verifySessionToken(token);

    expect(verified).toBeNull();
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const token = await createSessionToken(basePayload);
    const [header, body, signature] = token.split(".");

    const tamperedBody = Buffer.from(
      JSON.stringify({ ...basePayload, role: "owner", exp: 9999999999 }),
      "utf-8",
    ).toString("base64url");

    const tampered = `${header}.${tamperedBody}.${signature}`;
    const verified = await verifySessionToken(tampered);

    expect(verified).toBeNull();
  });

  it("rejects an expired token", async () => {
    const originalTtl = authConfig.tokenTtlSeconds;
    authConfig.tokenTtlSeconds = -10;

    try {
      const token = await createSessionToken(basePayload);
      const verified = await verifySessionToken(token);
      expect(verified).toBeNull();
    } finally {
      authConfig.tokenTtlSeconds = originalTtl;
    }
  });

  it("rejects a malformed token", async () => {
    expect(await verifySessionToken("not-a-valid-token")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
});
