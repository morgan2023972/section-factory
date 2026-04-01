import { describe, expect, it } from "vitest";
import { validateDesignSystemCompliance } from "../../src/core/designSystemValidator";

function makeValidSectionCodeMinimal(): string {
  return `
<div class="section-{{ section.id }}">
  <button class="btn">Shop now</button>
</div>
<style>
.section-{{ section.id }} button {
  --color-primary: #111;
  transition: color 0.2s ease;
}
@media (max-width: 749px) {
  .section-{{ section.id }} button {
    font-size: 14px;
  }
}
</style>
`.trim();
}

function makeValidSectionCodeRich(): string {
  return `
<div class="section-{{ section.id }}">
  <button class="btn">Learn more</button>
</div>
<style>
.section-{{ section.id }} button {
  --color-primary: #222;
  --space-md: 12px;
  animation: pulse 1.2s ease-in-out;
}
@keyframes pulse {
  0% { opacity: 0.9; }
  100% { opacity: 1; }
}
@media (max-width: 989px) {
  .section-{{ section.id }} button {
    padding: var(--space-md);
  }
}
</style>
`.trim();
}

function expectInvalidResult(
  result: ReturnType<typeof validateDesignSystemCompliance>,
): void {
  expect(result.isValid).toBe(false);
  expect(result.issues.length).toBeGreaterThan(0);
}

describe("designSystemValidator", () => {
  it("returns valid for a minimal valid payload", () => {
    const result = validateDesignSystemCompliance(
      makeValidSectionCodeMinimal(),
    );

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for a richer valid payload", () => {
    const result = validateDesignSystemCompliance(makeValidSectionCodeRich());

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles null undefined and wrong global type without throwing", () => {
    const invalidInputs: unknown[] = [
      null,
      undefined,
      42,
      "",
      true,
      { foo: "bar" },
    ];

    for (const value of invalidInputs) {
      expect(() => validateDesignSystemCompliance(value)).not.toThrow();
      const result = validateDesignSystemCompliance(value);
      expectInvalidResult(result);
    }
  });

  it("returns invalid for empty object", () => {
    const result = validateDesignSystemCompliance({});

    expectInvalidResult(result);
  });

  it("reports at least two missing required rules", () => {
    const missingRequiredRules = `
<style>
.section-{{ section.id }} .btn {
  --color-primary: #000;
  transition: color 0.2s ease;
}
</style>
`.trim();

    const result = validateDesignSystemCompliance(missingRequiredRules);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "style.@media")).toBe(
      true,
    );
    expect(
      result.issues.some((issue) => issue.path === "style.buttonScope"),
    ).toBe(true);
  });

  it("reports at least two invalid field patterns", () => {
    const invalidPatterns = `
<style>
.section-{{ section.id }} .title {
  color: red;
}
@media (max-width: 749px) {
  .section-{{ section.id }} .title {
    color: blue;
  }
}
</style>
`.trim();

    const result = validateDesignSystemCompliance(invalidPatterns);

    expect(result.isValid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "style.motion")).toBe(
      true,
    );
    expect(result.issues.some((issue) => issue.path === "style.tokens")).toBe(
      true,
    );
  });

  it("returns consistent result and issue shape", () => {
    const result = validateDesignSystemCompliance(
      "<style>.btn { color: red; }</style>",
    );

    expect(result).toMatchObject({
      isValid: expect.any(Boolean),
      issues: expect.any(Array),
      errors: expect.any(Array),
    });
    expect(result.isValid).toBe(false);

    for (const issue of result.issues) {
      expect(issue).toMatchObject({
        path: expect.any(String),
        message: expect.any(String),
      });
    }
  });

  it("never throws on unexpected nested values", () => {
    const weirdInputs: unknown[] = [
      { nested: { value: [1, 2, { deep: true }] } },
      ["<style>", { broken: true }, 123],
    ];

    for (const value of weirdInputs) {
      expect(() => validateDesignSystemCompliance(value)).not.toThrow();
      const result = validateDesignSystemCompliance(value);
      expectInvalidResult(result);
    }
  });
});
