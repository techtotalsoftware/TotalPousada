import { describe, expect, it } from "vitest";
import {
  getRoomLimit,
  hasPlanAccess,
  isValidPlan,
  normalizeTenantPlan,
  TenantPlan,
} from "../plan-enum";

describe("normalizeTenantPlan", () => {
  it("normalizes known aliases regardless of case", () => {
    expect(normalizeTenantPlan("BASIC")).toBe(TenantPlan.BASIC);
    expect(normalizeTenantPlan("starter")).toBe(TenantPlan.BASIC);
    expect(normalizeTenantPlan("Pro")).toBe(TenantPlan.PREMIUM);
    expect(normalizeTenantPlan("premium")).toBe(TenantPlan.PREMIUM);
    expect(normalizeTenantPlan(" Enterprise ")).toBe(TenantPlan.ENTERPRISE);
  });

  it("returns null for unknown or empty input", () => {
    expect(normalizeTenantPlan("gold")).toBeNull();
    expect(normalizeTenantPlan(undefined)).toBeNull();
    expect(normalizeTenantPlan(null)).toBeNull();
    expect(normalizeTenantPlan("")).toBeNull();
  });
});

describe("hasPlanAccess", () => {
  it("grants access when the current plan is at or above the required level", () => {
    expect(hasPlanAccess(TenantPlan.ENTERPRISE, TenantPlan.BASIC)).toBe(true);
    expect(hasPlanAccess(TenantPlan.PREMIUM, TenantPlan.PREMIUM)).toBe(true);
  });

  it("denies access when the current plan is below the required level", () => {
    expect(hasPlanAccess(TenantPlan.BASIC, TenantPlan.PREMIUM)).toBe(false);
  });
});

describe("isValidPlan", () => {
  it("accepts valid plan strings", () => {
    expect(isValidPlan("Basic")).toBe(true);
  });

  it("rejects invalid input", () => {
    expect(isValidPlan("not-a-plan")).toBe(false);
    expect(isValidPlan(undefined)).toBe(false);
  });
});

describe("getRoomLimit", () => {
  it("returns a finite limit for Basic and Premium", () => {
    expect(getRoomLimit(TenantPlan.BASIC)).toBeGreaterThan(0);
    expect(getRoomLimit(TenantPlan.PREMIUM)).toBeGreaterThan(
      getRoomLimit(TenantPlan.BASIC)!,
    );
  });

  it("returns null (unlimited) for Enterprise", () => {
    expect(getRoomLimit(TenantPlan.ENTERPRISE)).toBeNull();
  });
});
