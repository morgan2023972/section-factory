import { describe, it, expect } from "vitest";
import { resolveSectionType } from "../../src/cli/sectionTypeMapping";

describe("section type mapping", () => {
  it("maps features alias to product-grid", () => {
    expect(resolveSectionType("features")).toBe("product-grid");
  });

  it("keeps known type unchanged when no alias is defined", () => {
    expect(resolveSectionType("hero")).toBe("hero");
  });

  it("keeps unknown type unchanged", () => {
    expect(resolveSectionType("unknown-type")).toBe("unknown-type");
  });
});
