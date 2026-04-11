import { describe, it, expect, vi } from "vitest";
import { runCli, type CliRuntimeDeps } from "../../src/cli/generateSection";

function createDeps(): CliRuntimeDeps {
  return {
    generateSectionFn: vi.fn(async (_prompt: string) => "mock-section-code"),
    writeSectionToDiskFn: vi.fn(
      async (_sectionType: string, _sectionCode: string) =>
        "output/sections/mock.liquid",
    ),
    validateSectionCodeFn: vi.fn(() => ({
      isValid: true,
      errors: [] as string[],
    })),
    repairSectionFn: vi.fn(async () => ({
      success: false,
      finalCode: null,
      report: {
        initialIssueCount: 1,
        finalIssueCount: 1,
        improved: false,
        attemptCount: 1,
        totalDuration: 10,
        exitReason: "max_retries_exceeded" as const,
        bestCandidateSelected: false,
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
    log: vi.fn<(message: string) => void>(),
    error: vi.fn<(message: string) => void>(),
  };
}

describe("CLI integration - generateSection", () => {
  it("resolves alias features to product-grid", async () => {
    const deps = createDeps();

    const exitCode = await runCli(["features"], deps);

    expect(exitCode).toBe(0);
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "product-grid",
      "mock-section-code",
    );
    expect(deps.log).toHaveBeenCalledWith(
      "Validation passed on first attempt. Repair not executed.",
    );
  });

  it("uses hero by default when no section type is provided", async () => {
    const deps = createDeps();

    const exitCode = await runCli([], deps);

    expect(exitCode).toBe(0);
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "mock-section-code",
    );
  });

  it("enables design system when profile is provided", async () => {
    const deps = createDeps();

    const exitCode = await runCli(["hero", "--profile", "luxury"], deps);

    expect(exitCode).toBe(0);
    expect(deps.validateSectionCodeFn).toHaveBeenCalledWith(
      "mock-section-code",
      {
        designSystemEnabled: true,
      },
    );
    expect(deps.log).toHaveBeenCalledWith(
      "Design system enabled with profile: luxury",
    );
  });

  it("returns exit code 1 when validator fails", async () => {
    const deps = createDeps();
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    }));
    deps.repairSectionFn = vi.fn(async () => ({
      success: false,
      finalCode: null,
      report: {
        initialIssueCount: 1,
        finalIssueCount: 1,
        improved: false,
        attemptCount: 2,
        totalDuration: 10,
        exitReason: "runtime_error" as const,
        bestCandidateSelected: false,
        hadRuntimeErrors: true,
      },
      attempts: [],
      lastIssues: [
        {
          path: "section",
          message: "Schema JSON is invalid.",
          severity: "error" as const,
        },
      ],
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(1);
    expect(deps.repairSectionFn).toHaveBeenCalledTimes(1);
    expect(deps.error).toHaveBeenCalledWith("Repair produced no usable code.");
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("accepts non-blocking validation issues in non-strict mode", async () => {
    const deps = createDeps();
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: [
        "Global JS access is not allowed: scope JS to the section element.",
        "Mobile UX issue: missing responsive @media rules.",
        "Global CSS selectors are not allowed: body",
      ],
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      "[Validation warning] Global JS access is not allowed: scope JS to the section element.",
    );
    expect(deps.log).toHaveBeenCalledWith(
      "[Validation warning] Mobile UX issue: missing responsive @media rules.",
    );
    expect(deps.log).toHaveBeenCalledWith(
      "[Validation warning] Global CSS selectors are not allowed: body",
    );
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "mock-section-code",
    );
  });

  it("keeps strict mode blocking for the same issues", async () => {
    const deps = createDeps();
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: [
        "Global JS access is not allowed: scope JS to the section element.",
        "Mobile UX issue: missing responsive @media rules.",
      ],
    }));

    const exitCode = await runCli(["hero", "--strict"], deps);

    expect(exitCode).toBe(1);
    expect(deps.repairSectionFn).toHaveBeenCalled();
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("uses repaired output when generation is invalid and repair becomes valid", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi.fn().mockResolvedValue("initial-invalid-code");
    deps.validateSectionCodeFn = vi
      .fn()
      .mockReturnValueOnce({
        isValid: false,
        errors: ["Schema JSON is invalid."],
      })
      .mockReturnValueOnce({
        isValid: true,
        errors: [],
      });
    deps.repairSectionFn = vi.fn(async () => ({
      success: true,
      finalCode: "corrected-valid-code",
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
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(0);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith(
      "Repair accepted: code is now valid (issues 1 -> 0).",
    );
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "corrected-valid-code",
    );
  });

  it("uses repaired output when repair improves issue count without becoming valid", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi.fn().mockResolvedValue("initial-invalid");
    deps.validateSectionCodeFn = vi
      .fn()
      .mockReturnValueOnce({
        isValid: false,
        errors: ["Schema JSON is invalid.", "Missing Shopify schema tags."],
      })
      .mockReturnValueOnce({
        isValid: false,
        errors: ["Schema JSON is invalid."],
      });
    deps.repairSectionFn = vi.fn(async () => ({
      success: false,
      finalCode: "retry-improved",
      report: {
        initialIssueCount: 2,
        finalIssueCount: 1,
        improved: true,
        attemptCount: 2,
        totalDuration: 10,
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
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      "Repair accepted: measurable improvement (issues 2 -> 1).",
    );
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "retry-improved",
    );
  });

  it("keeps initial output when repair has no measurable improvement", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi.fn().mockResolvedValue("initial-invalid");
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    }));
    deps.repairSectionFn = vi.fn(async () => ({
      success: false,
      finalCode: "still-invalid",
      report: {
        initialIssueCount: 1,
        finalIssueCount: 1,
        improved: false,
        attemptCount: 2,
        totalDuration: 10,
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
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(
      "Validation failed: no measurable improvement after repair.",
    );
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("captures repair throw and keeps initial output", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi.fn().mockResolvedValueOnce("invalid-code");
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    }));
    deps.repairSectionFn = vi.fn(async () => {
      throw new Error("repair boom");
    });

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(1);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(1);
    expect(deps.error).toHaveBeenCalledWith("Repair failed: repair boom");
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("does not run repair when already valid", async () => {
    const deps = createDeps();
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: true,
      errors: [],
    }));

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(0);
    expect(deps.repairSectionFn).not.toHaveBeenCalled();
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "mock-section-code",
    );
  });

  it("throws for unsupported section type", async () => {
    const deps = createDeps();

    await expect(runCli(["unknown-type"], deps)).rejects.toThrow(
      /Unsupported section type/,
    );
  });

  it("throws for invalid profile", async () => {
    const deps = createDeps();

    await expect(
      runCli(["hero", "--profile", "invalid"], deps),
    ).rejects.toThrow(/Invalid design profile/);
  });
});
