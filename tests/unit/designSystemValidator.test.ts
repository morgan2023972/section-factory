import { describe, expect, it } from "vitest";
import { validateDesignSystemCompliance } from "../../src/core/designSystemValidator";

function makeCompliantSectionCode(): string {
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

function makeWithoutStyleBlock(): string {
  return `
<div class="section-{{ section.id }}">
  <button class="btn">Only markup</button>
</div>
`.trim();
}

function makeWithoutMedia(): string {
  return `
<style>
.section-{{ section.id }} button {
  --color-primary: #111;
  transition: color 0.2s ease;
}
</style>
`.trim();
}

function makeWithoutMotion(): string {
  return `
<style>
.section-{{ section.id }} button {
  --color-primary: #111;
}
@media (max-width: 749px) {
  .section-{{ section.id }} button {
    color: var(--color-primary);
  }
}
</style>
`.trim();
}

function makeWithoutTokens(): string {
  return `
<style>
.section-{{ section.id }} button {
  transition: color 0.2s ease;
}
@media (max-width: 749px) {
  .section-{{ section.id }} button {
    color: #111;
  }
}
</style>
`.trim();
}

function makeWithoutScopedButton(): string {
  return `
<style>
.section-{{ section.id }} .title {
  --color-primary: #111;
  transition: color 0.2s ease;
}
@media (max-width: 749px) {
  .section-{{ section.id }} .title {
    color: var(--color-primary);
  }
}
</style>
`.trim();
}

function expectIssuePath(
  result: ReturnType<typeof validateDesignSystemCompliance>,
  path: string,
): void {
  expect(result.issues.some((issue) => issue.path === path)).toBe(true);
}

describe("designSystemValidator", () => {
  it("returns valid for complete compliant section code", () => {
    const result = validateDesignSystemCompliance(makeCompliantSectionCode());

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns invalid for non-string inputs without throwing", () => {
    const nonStringInputs: unknown[] = [null, undefined, 42, {}, []];

    for (const value of nonStringInputs) {
      expect(() => validateDesignSystemCompliance(value)).not.toThrow();
      const result = validateDesignSystemCompliance(value);
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expectIssuePath(result, "sectionCode");
    }
  });

  it("returns invalid when style block is missing", () => {
    const result = validateDesignSystemCompliance(makeWithoutStyleBlock());

    expect(result.isValid).toBe(false);
    expectIssuePath(result, "style");
  });

  it("returns invalid when media query is missing", () => {
    const result = validateDesignSystemCompliance(makeWithoutMedia());

    expect(result.isValid).toBe(false);
    expectIssuePath(result, "style.@media");
  });

  it("returns invalid when motion rules are missing", () => {
    const result = validateDesignSystemCompliance(makeWithoutMotion());

    expect(result.isValid).toBe(false);
    expectIssuePath(result, "style.motion");
  });

  it("returns invalid when css custom properties are missing", () => {
    const result = validateDesignSystemCompliance(makeWithoutTokens());

    expect(result.isValid).toBe(false);
    expectIssuePath(result, "style.tokens");
  });

  it("returns invalid when scoped button selector is missing", () => {
    const result = validateDesignSystemCompliance(makeWithoutScopedButton());

    expect(result.isValid).toBe(false);
    expectIssuePath(result, "style.buttonScope");
  });

  it("returns output contract with isValid issues and errors", () => {
    const result = validateDesignSystemCompliance(makeWithoutStyleBlock());

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

  it("keeps errors aligned with issue messages", () => {
    const result = validateDesignSystemCompliance(makeWithoutScopedButton());

    expect(result.errors).toEqual(result.issues.map((issue) => issue.message));
  });
});
