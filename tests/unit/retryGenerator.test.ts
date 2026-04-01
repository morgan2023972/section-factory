import { describe, expect, it, vi } from "vitest";
import {
  buildRetryPrompt,
  retryGenerateSection,
  type RetryGenerateSectionParams,
  type ValidationIssue,
} from "../../src/generator/retryGenerator";

function createBaseParams(
  overrides: Partial<RetryGenerateSectionParams> = {},
): RetryGenerateSectionParams {
  return {
    sectionType: "hero",
    originalCode: "<div>invalid</div>",
    issues: [{ path: "section", message: "Schema JSON is invalid." }],
    shopifyRules: "Always include schema.",
    maxRetries: 2,
    generateCorrection: vi.fn(async () => "corrected-code"),
    validateCandidate: vi.fn(() => []),
    ...overrides,
  };
}

describe("retryGenerator", () => {
  it("buildRetryPrompt includes section type, attempt counter and rules", () => {
    const prompt = buildRetryPrompt({
      sectionType: "hero",
      previousCode: "<div>broken</div>",
      issues: [
        { path: "schema", message: "missing presets" },
        { path: "css", message: "global selector", severity: "warning" },
      ],
      shopifyRules: "No global CSS",
      attemptNumber: 1,
      maxRetries: 3,
    });

    expect(prompt).toContain("Section type: hero");
    expect(prompt).toContain("Retry attempt: 1/3");
    expect(prompt).toContain("Shopify and project rules:");
    expect(prompt).toContain("No global CSS");
    expect(prompt).toContain("Previous invalid code to correct:");
    expect(prompt).toContain("<div>broken</div>");
  });

  it("buildRetryPrompt injects fallback issue when issues are empty", () => {
    const prompt = buildRetryPrompt({
      sectionType: "hero",
      previousCode: "<div>broken</div>",
      issues: [],
      shopifyRules: "Rules",
      attemptNumber: 1,
      maxRetries: 2,
    });

    expect(prompt).toContain(
      "Validation failed, but no detailed issues were provided.",
    );
  });

  it("retryGenerateSection returns success on first valid correction", async () => {
    const params = createBaseParams({
      generateCorrection: vi.fn(async () => "valid-code"),
      validateCandidate: vi.fn(() => []),
    });

    const result = await retryGenerateSection(params);

    expect(result.success).toBe(true);
    expect(result.finalCode).toBe("valid-code");
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]?.success).toBe(true);
    expect(result.lastIssues).toHaveLength(0);
  });

  it("retryGenerateSection retries after invalid candidate then succeeds", async () => {
    const generateCorrection = vi
      .fn()
      .mockResolvedValueOnce("candidate-1")
      .mockResolvedValueOnce("candidate-2");

    const validateCandidate = vi
      .fn<(code: string) => ValidationIssue[]>()
      .mockReturnValueOnce([{ path: "schema", message: "invalid" }])
      .mockReturnValueOnce([]);

    const result = await retryGenerateSection(
      createBaseParams({ generateCorrection, validateCandidate }),
    );

    expect(result.success).toBe(true);
    expect(result.finalCode).toBe("candidate-2");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.success).toBe(false);
    expect(result.attempts[1]?.success).toBe(true);
  });

  it("retryGenerateSection records empty AI response and continues", async () => {
    const generateCorrection = vi
      .fn()
      .mockResolvedValueOnce("   ")
      .mockResolvedValueOnce("valid");

    const validateCandidate = vi
      .fn<(code: string) => ValidationIssue[]>()
      .mockReturnValueOnce([]);

    const result = await retryGenerateSection(
      createBaseParams({
        maxRetries: 2,
        generateCorrection,
        validateCandidate,
      }),
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.outputCode).toBeNull();
    expect(result.attempts[0]?.errorMessage).toBe(
      "AI returned an empty response.",
    );
    expect(result.finalCode).toBe("valid");
  });

  it("retryGenerateSection captures generateCorrection exception per attempt", async () => {
    const generateCorrection = vi.fn(async () => {
      throw new Error("timeout");
    });
    const validateCandidate = vi.fn<(code: string) => ValidationIssue[]>();

    const result = await retryGenerateSection(
      createBaseParams({
        maxRetries: 3,
        generateCorrection,
        validateCandidate,
      }),
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toHaveLength(3);
    expect(validateCandidate).not.toHaveBeenCalled();
    for (const attempt of result.attempts) {
      expect(attempt.errorMessage).toBe("timeout");
      expect(attempt.success).toBe(false);
    }
  });

  it("retryGenerateSection normalizes malformed issues from validator", async () => {
    const result = await retryGenerateSection(
      createBaseParams({
        maxRetries: 1,
        generateCorrection: vi.fn(async () => "candidate"),
        validateCandidate: vi.fn<(code: string) => ValidationIssue[]>(() => [
          { path: "", message: "", severity: "error" as const },
        ]),
      }),
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]?.issues[0]).toEqual({
      path: "issue[0]",
      message: "Unknown validation issue",
      severity: "error",
    });
  });

  it("retryGenerateSection accepts sync and async validateCandidate", async () => {
    const syncResult = await retryGenerateSection(
      createBaseParams({
        maxRetries: 1,
        generateCorrection: vi.fn(async () => "candidate-sync"),
        validateCandidate: vi.fn(() => []),
      }),
    );

    const asyncResult = await retryGenerateSection(
      createBaseParams({
        maxRetries: 1,
        generateCorrection: vi.fn(async () => "candidate-async"),
        validateCandidate: vi.fn(async () => []),
      }),
    );

    expect(syncResult.success).toBe(true);
    expect(syncResult.finalCode).toBe("candidate-sync");
    expect(asyncResult.success).toBe(true);
    expect(asyncResult.finalCode).toBe("candidate-async");
  });

  it("retryGenerateSection coerces invalid maxRetries to fallback 1", async () => {
    const resultWithZero = await retryGenerateSection(
      createBaseParams({
        maxRetries: 0,
        generateCorrection: vi.fn(async () => {
          throw new Error("x");
        }),
      }),
    );

    const resultWithNaN = await retryGenerateSection(
      createBaseParams({
        maxRetries: Number.NaN,
        generateCorrection: vi.fn(async () => {
          throw new Error("x");
        }),
      }),
    );

    expect(resultWithZero.attempts).toHaveLength(1);
    expect(resultWithNaN.attempts).toHaveLength(1);
  });

  it("retryGenerateSection floors non-integer maxRetries", async () => {
    const result = await retryGenerateSection(
      createBaseParams({
        maxRetries: 2.8,
        generateCorrection: vi.fn(async () => {
          throw new Error("x");
        }),
      }),
    );

    expect(result.attempts).toHaveLength(2);
  });
});
