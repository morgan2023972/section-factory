import { describe, expect, it, vi } from "vitest";
import {
  runGenerationPipeline,
  type CliRuntimeDeps,
} from "../../../src/cli/generateSection";

function validationResult(errors: string[] = []) {
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function createDeps(overrides: Partial<CliRuntimeDeps> = {}): CliRuntimeDeps {
  return {
    generateSectionFn: vi.fn(async () => "initial-code"),
    writeSectionToDiskFn: vi.fn(async () => "output/sections/hero.liquid"),
    validateSectionCodeFn: vi.fn(() => validationResult()),
    repairSectionFn: vi.fn(async () => ({
      success: true,
      finalCode: "repaired-code",
      report: {
        initialIssueCount: 1,
        finalIssueCount: 0,
        improved: true,
        attemptCount: 1,
        totalDuration: 10,
        exitReason: "success" as const,
        bestCandidateSelected: true,
        hadRuntimeErrors: false,
      },
      attempts: [],
      lastIssues: [],
    })),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

const BASE_OPTIONS = {
  sectionType: "hero" as const,
  designSystem: { enabled: false },
  maxRetries: 2,
  validationMode: "non-strict" as const,
};

describe("runGenerationPipeline decision logic", () => {
  it("génération valide -> repair non appelé", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => validationResult([])),
    });

    const result = await runGenerationPipeline(BASE_OPTIONS, deps);

    expect(result.pipelineStatus).toBe("generated_valid");
    expect(result.repairAttempted).toBe(false);
    expect(result.usedRepairedOutput).toBe(false);
    expect(result.postRepairValidation).toBeNull();
    expect(result.repairError).toBeUndefined();
    expect(deps.repairSectionFn).not.toHaveBeenCalled();
    expect(result.finalCode).toBe("initial-code");
  });

  it("invalide -> repair rend valide -> accepté", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi
        .fn()
        .mockReturnValueOnce(validationResult(["Schema JSON is invalid."]))
        .mockReturnValueOnce(validationResult([])),
      repairSectionFn: vi.fn(async () => ({
        success: true,
        finalCode: "repaired-valid",
        report: {
          initialIssueCount: 1,
          finalIssueCount: 0,
          improved: true,
          attemptCount: 1,
          totalDuration: 10,
          exitReason: "success" as const,
          bestCandidateSelected: true,
          hadRuntimeErrors: false,
        },
        attempts: [],
        lastIssues: [],
      })),
    });

    const result = await runGenerationPipeline(BASE_OPTIONS, deps);

    expect(result.pipelineStatus).toBe("generated_invalid_repaired_valid");
    expect(result.repairAttempted).toBe(true);
    expect(result.usedRepairedOutput).toBe(true);
    expect(result.repairSucceeded).toBe(true);
    expect(result.finalCode).toBe("repaired-valid");
    expect(result.repairError).toBeUndefined();
  });

  it("invalide -> repair améliore -> accepté", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi
        .fn()
        .mockReturnValueOnce(
          validationResult(["Schema JSON is invalid.", "Missing schema tags."]),
        )
        .mockReturnValueOnce(validationResult(["Schema JSON is invalid."])),
      repairSectionFn: vi.fn(async () => ({
        success: false,
        finalCode: "repaired-improved",
        report: {
          initialIssueCount: 2,
          finalIssueCount: 1,
          improved: true,
          attemptCount: 2,
          totalDuration: 20,
          exitReason: "max_retries_exceeded" as const,
          bestCandidateSelected: true,
          hadRuntimeErrors: false,
        },
        attempts: [],
        lastIssues: [
          {
            path: "section",
            message: "Schema JSON is invalid.",
            severity: "error" as const,
          },
        ],
      })),
    });

    const result = await runGenerationPipeline(BASE_OPTIONS, deps);

    expect(result.pipelineStatus).toBe("generated_invalid_repaired_improved");
    expect(result.repairAttempted).toBe(true);
    expect(result.usedRepairedOutput).toBe(true);
    expect(result.repairSucceeded).toBe(true);
    expect(result.finalCode).toBe("repaired-improved");
    expect(result.repairError).toBeUndefined();
    expect(result.postRepairValidation?.issueCount).toBe(1);
  });

  it("invalide -> repair inutile -> rejeté", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() =>
        validationResult(["Schema JSON is invalid."]),
      ),
      repairSectionFn: vi.fn(async () => ({
        success: false,
        finalCode: "still-invalid",
        report: {
          initialIssueCount: 1,
          finalIssueCount: 1,
          improved: false,
          attemptCount: 2,
          totalDuration: 20,
          exitReason: "max_retries_exceeded" as const,
          bestCandidateSelected: true,
          hadRuntimeErrors: false,
        },
        attempts: [],
        lastIssues: [
          {
            path: "section",
            message: "Schema JSON is invalid.",
            severity: "error" as const,
          },
        ],
      })),
    });

    const result = await runGenerationPipeline(BASE_OPTIONS, deps);

    expect(result.pipelineStatus).toBe(
      "generated_invalid_repair_no_improvement",
    );
    expect(result.repairAttempted).toBe(true);
    expect(result.usedRepairedOutput).toBe(false);
    expect(result.repairSucceeded).toBe(false);
    expect(result.finalCode).toBe("initial-code");
    expect(result.repairError).toBe(
      "Repair did not provide measurable improvement.",
    );
  });

  it("invalide -> repair erreur -> fallback original", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() =>
        validationResult(["Schema JSON is invalid."]),
      ),
      repairSectionFn: vi.fn(async () => {
        throw new Error("repair boom");
      }),
    });

    const result = await runGenerationPipeline(BASE_OPTIONS, deps);

    expect(result.pipelineStatus).toBe("generated_invalid_repair_failed");
    expect(result.repairAttempted).toBe(true);
    expect(result.usedRepairedOutput).toBe(false);
    expect(result.repairSucceeded).toBe(false);
    expect(result.finalCode).toBe("initial-code");
    expect(result.postRepairValidation).toBeNull();
    expect(result.repairError).toBe("Repair failed: repair boom");
  });
});
