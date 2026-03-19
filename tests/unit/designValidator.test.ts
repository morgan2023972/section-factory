import { describe, it, expect } from "vitest";
import {
  validateSection,
  type SectionInput,
  type ValidationIssue,
} from "../../src/core/validation/designValidator";

function makeValidSection(overrides: Partial<SectionInput> = {}): SectionInput {
  return {
    type: "hero",
    schema: {
      settings: [],
    },
    content: {},
    ...overrides,
  };
}

function expectValidIssueShape(issue: ValidationIssue): void {
  expect(issue).toMatchObject({
    path: expect.any(String),
    message: expect.any(String),
    severity: expect.stringMatching(/^(error|warning)$/),
  });
}

describe("design validator", () => {
  it("valid section in strict mode is valid", () => {
    const result = validateSection(makeValidSection(), "strict");

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.length).toBe(0);
  });

  it("section without type returns an error and is invalid", () => {
    const result = validateSection(
      makeValidSection({ type: undefined }),
      "strict",
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((issue) => issue.path === "type")).toBe(true);
  });

  it("unknown type in strict mode is an error and invalid", () => {
    const result = validateSection(
      makeValidSection({ type: "unknown-type" }),
      "strict",
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.some((issue) => issue.path === "type")).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  it("unknown type in non-strict mode is a warning without critical errors", () => {
    const result = validateSection(
      makeValidSection({ type: "unknown-type" }),
      "non-strict",
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.some((issue) => issue.path === "type")).toBe(true);
  });

  it("section without schema is an error in strict and non-strict", () => {
    const strictResult = validateSection(
      makeValidSection({ schema: undefined }),
      "strict",
    );
    const nonStrictResult = validateSection(
      makeValidSection({ schema: undefined }),
      "non-strict",
    );

    expect(strictResult.isValid).toBe(false);
    expect(nonStrictResult.isValid).toBe(false);
    expect(strictResult.errors.some((issue) => issue.path === "schema")).toBe(
      true,
    );
    expect(
      nonStrictResult.errors.some((issue) => issue.path === "schema"),
    ).toBe(true);
  });

  it("schema.settings with non-array value returns an error", () => {
    const result = validateSection(
      makeValidSection({
        schema: {
          settings: "invalid",
        },
      }),
      "strict",
    );

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((issue) => issue.path === "schema.settings"),
    ).toBe(true);
  });

  it("too many settings returns warning in non-strict and error in strict", () => {
    const tooManySettings = Array.from({ length: 21 }, (_, index) => ({
      id: `s-${index}`,
      type: "text",
    }));

    const strictResult = validateSection(
      makeValidSection({ schema: { settings: tooManySettings } }),
      "strict",
    );
    const nonStrictResult = validateSection(
      makeValidSection({ schema: { settings: tooManySettings } }),
      "non-strict",
    );

    expect(
      strictResult.errors.some((issue) => issue.path === "schema.settings"),
    ).toBe(true);
    expect(
      nonStrictResult.warnings.some(
        (issue) => issue.path === "schema.settings",
      ),
    ).toBe(true);
  });

  it("returned issues have valid shape", () => {
    const result = validateSection(
      {
        type: "unknown-type",
      },
      "non-strict",
    );

    for (const issue of result.errors) {
      expectValidIssueShape(issue);
    }

    for (const issue of result.warnings) {
      expectValidIssueShape(issue);
    }
  });
});
