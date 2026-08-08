import { describe, expect, it } from "vitest";
import { generateUniqueTenantSlug, slugify } from "../tenant-slug";

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("Pousada Água Azul")).toBe("pousada-agua-azul");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Pousada  ***  do Sol!!")).toBe("pousada-do-sol");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--Pousada--")).toBe("pousada");
  });

  it("returns an empty string for input with no alphanumeric characters", () => {
    expect(slugify("***")).toBe("");
  });
});

describe("generateUniqueTenantSlug", () => {
  it("uses the base slug when it's available", async () => {
    const slug = await generateUniqueTenantSlug("Pousada Sol", async () => false);
    expect(slug).toBe("pousada-sol");
  });

  it("appends an incrementing suffix until it finds a free slug", async () => {
    const taken = new Set(["pousada-sol", "pousada-sol-2", "pousada-sol-3"]);
    const slug = await generateUniqueTenantSlug("Pousada Sol", async (candidate) =>
      taken.has(candidate),
    );
    expect(slug).toBe("pousada-sol-4");
  });

  it("falls back to 'pousada' when the name has no usable characters", async () => {
    const slug = await generateUniqueTenantSlug("***", async () => false);
    expect(slug).toBe("pousada");
  });
});
