import { describe, expect, it, vi } from "vitest";
import { repairSection } from "../../../src/core/repair/repairSection";
import type { RepairRuntimeDeps } from "../../../src/core/repair/types";

function createDeps(
  overrides: Partial<RepairRuntimeDeps> = {},
): RepairRuntimeDeps {
  return {
    validateCandidateFn: vi.fn(() => []),
    generateCorrectionFn: vi.fn(async () => "{% schema %}{}{% endschema %}"),
    shopifyRules: "No global CSS",
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("repairSection core", () => {
  it("returns success immediately when no blocking issues", async () => {
    const deps = createDeps();

    const result = await repairSection(
      "<div>ok</div>",
      [],
      { maxRetries: 2 },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.report.attemptCount).toBe(0);
  });

  it("returns success when initial issues are non-blocking in non-strict mode", async () => {
    const deps = createDeps();

    const result = await repairSection(
      "<div>ok</div>",
      [
        {
          path: "style",
          message: "Mobile UX issue: missing responsive @media rules.",
          severity: "error" as const,
        },
      ],
      { mode: "non-strict" },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.lastIssues).toEqual([]);
  });

  it("treats non-blocking issue as blocking in strict mode unless exception exists", async () => {
    const deps = createDeps({
      validateCandidateFn: vi.fn(async () => [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ]),
    });

    const result = await repairSection(
      "bad",
      [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
      { maxRetries: 1, mode: "strict" },
      deps,
    );

    expect(result.success).toBe(false);
  });

  it("repairs after retry and returns final valid code", async () => {
    const deps = createDeps({
      generateCorrectionFn: vi
        .fn()
        .mockResolvedValueOnce("```liquid\n{% schema %}{}{% endschema %}\n```")
        .mockResolvedValueOnce(
          "```liquid\n<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}\n```",
        ) as RepairRuntimeDeps["generateCorrectionFn"],
      validateCandidateFn: vi
        .fn()
        .mockReturnValueOnce([
          {
            path: "schema",
            message: "Schema JSON is invalid.",
            severity: "error" as const,
          },
        ])
        .mockReturnValueOnce([]),
    });

    const result = await repairSection(
      "bad",
      [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
      { maxRetries: 2 },
      deps,
    );

    expect(result.success).toBe(true);
    expect(result.finalCode).toContain("{% schema %}");
  });

  it("keeps best candidate when retries are exhausted", async () => {
    const deps = createDeps({
      generateCorrectionFn: vi
        .fn()
        .mockResolvedValueOnce(
          "```liquid\n<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}\n```",
        )
        .mockResolvedValueOnce(
          "```\nhello\n```",
        ) as RepairRuntimeDeps["generateCorrectionFn"],
      validateCandidateFn: vi.fn(() => [
        {
          path: "section",
          message: "Global CSS selectors are not allowed: body",
          severity: "error" as const,
        },
      ]),
    });

    const result = await repairSection(
      "bad",
      [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
      { maxRetries: 2 },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.finalCode).not.toBeNull();
    expect(result.report.bestCandidateSelected).toBe(true);
    expect(result.lastIssues).toEqual([
      {
        path: "section",
        message: "Global CSS selectors are not allowed: body",
        severity: "error",
      },
    ]);
  });

  it("supports async validateCandidateFn", async () => {
    const deps = createDeps({
      generateCorrectionFn: vi
        .fn()
        .mockResolvedValueOnce(
          "```liquid\n<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}\n```",
        ) as RepairRuntimeDeps["generateCorrectionFn"],
      validateCandidateFn: vi
        .fn()
        .mockResolvedValueOnce([]) as RepairRuntimeDeps["validateCandidateFn"],
    });

    const result = await repairSection(
      "bad",
      [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
      { maxRetries: 1 },
      deps,
    );

    expect(result.success).toBe(true);
  });

  it("surfaces runtime error observability in report", async () => {
    const deps = createDeps({
      generateCorrectionFn: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("network"),
        ) as RepairRuntimeDeps["generateCorrectionFn"],
    });

    const result = await repairSection(
      "bad",
      [
        {
          path: "schema",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
      { maxRetries: 1 },
      deps,
    );

    expect(result.success).toBe(false);
    expect(result.report.hadRuntimeErrors).toBe(true);
    expect(result.report.exitReason).toBe("runtime_error");
  });
});
