import { describe, it, expect } from "vitest";
import {
  getEnabledSectionTypes,
  getSectionTypeIds,
  isKnownSectionType,
  getSectionTypeById,
} from "../../src/core/section-types/registry";

describe("section types registry", () => {
  it("getEnabledSectionTypes returns a non-empty array", () => {
    const enabled = getEnabledSectionTypes();

    expect(Array.isArray(enabled)).toBe(true);
    expect(enabled.length).toBeGreaterThan(0);
  });

  it("getSectionTypeIds returns expected ids", () => {
    const ids = getSectionTypeIds();

    expect(ids).toEqual(
      expect.arrayContaining([
        "hero",
        "faq",
        "testimonials",
        "product-grid",
        "rich-text",
        "image-banner",
      ]),
    );
  });

  it('isKnownSectionType("hero") returns true', () => {
    expect(isKnownSectionType("hero")).toBe(true);
  });

  it('isKnownSectionType("unknown-type") returns false', () => {
    expect(isKnownSectionType("unknown-type")).toBe(false);
  });

  it('getSectionTypeById("faq") returns a valid definition', () => {
    const faq = getSectionTypeById("faq");

    expect(faq).toBeDefined();
    expect(faq).toMatchObject({
      id: "faq",
      label: expect.any(String),
      description: expect.any(String),
      category: expect.any(String),
      supportsDesignSystem: expect.any(Boolean),
      enabled: expect.any(Boolean),
    });
  });

  it('getSectionTypeById("missing") returns undefined', () => {
    expect(getSectionTypeById("missing")).toBeUndefined();
  });

  it("returned definitions expose all required properties", () => {
    const enabled = getEnabledSectionTypes();

    for (const definition of enabled) {
      expect(definition).toHaveProperty("id");
      expect(definition).toHaveProperty("label");
      expect(definition).toHaveProperty("description");
      expect(definition).toHaveProperty("category");
      expect(definition).toHaveProperty("supportsDesignSystem");
      expect(definition).toHaveProperty("enabled");
    }
  });
});
