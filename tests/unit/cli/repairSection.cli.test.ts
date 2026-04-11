import { describe, expect, it, vi } from "vitest";
import {
  parseRepairCliOptions,
  runRepairCli,
  type RepairCliRuntimeDeps,
} from "../../../src/cli/repairSection";

function createDeps(
  overrides: Partial<RepairCliRuntimeDeps> = {},
): RepairCliRuntimeDeps {
  return {
    readFileFn: vi.fn(
      async () => "<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}",
    ),
    writeFileFn: vi.fn(async () => undefined),
    validateSectionCodeFn: vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    })),
    repairSectionFn: vi.fn(async () => ({
      success: true,
      finalCode: "<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}",
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
    generateCorrectionFn: vi.fn(async () => ""),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("repair CLI options", () => {
  it("prints help as normal flow via runtime", async () => {
    const deps = createDeps();
    const exitCode = await runRepairCli(["--help"], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalled();
    expect(deps.error).not.toHaveBeenCalled();
  });

  it("parses required file path and defaults", () => {
    const options = parseRepairCliOptions(["output/sections/hero.liquid"]);
    expect(options.filePath).toBe("output/sections/hero.liquid");
    expect(options.format).toBe("text");
    expect(options.maxRetries).toBe(2);
  });

  it("throws when output is provided without write", () => {
    expect(() =>
      parseRepairCliOptions([
        "output/sections/hero.liquid",
        "--output",
        "x.liquid",
      ]),
    ).toThrow(/requires --write/);
  });

  it("throws when output value is missing", () => {
    expect(() =>
      parseRepairCliOptions([
        "output/sections/hero.liquid",
        "--write",
        "--output",
      ]),
    ).toThrow(/Missing value for --output/);
  });

  it("throws when format value is missing", () => {
    expect(() =>
      parseRepairCliOptions(["output/sections/hero.liquid", "--format"]),
    ).toThrow(/Missing value for --format/);
  });

  it("throws when max-retries value is missing", () => {
    expect(() =>
      parseRepairCliOptions(["output/sections/hero.liquid", "--max-retries"]),
    ).toThrow(/Missing value for --max-retries/);
  });

  it("throws when a value flag is followed by another flag", () => {
    expect(() =>
      parseRepairCliOptions([
        "output/sections/hero.liquid",
        "--write",
        "--output",
        "--format=json",
      ]),
    ).toThrow(/Missing value for --output/);
  });
});

describe("repair CLI runtime", () => {
  it("returns 0 on successful repair", async () => {
    const deps = createDeps();
    const exitCode = await runRepairCli(["output/sections/hero.liquid"], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith("Initial validation: FAIL");
    expect(deps.log).toHaveBeenCalledWith("Repair attempted: yes");
    expect(deps.log).toHaveBeenCalledWith("Final result used: yes");
    expect(deps.log).toHaveBeenCalledWith("Improvement detected: yes");
  });

  it("returns 2 on parse error", async () => {
    const deps = createDeps();
    const exitCode = await runRepairCli(["--output", "x.liquid"], deps);

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalled();
  });

  it("writes only on success when --write is enabled", async () => {
    const deps = createDeps();
    const exitCode = await runRepairCli(
      [
        "output/sections/hero.liquid",
        "--write",
        "--output",
        "output/sections/hero.repaired.liquid",
      ],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.writeFileFn).toHaveBeenCalled();
  });

  it("does not write when repair failed", async () => {
    const deps = createDeps({
      repairSectionFn: vi.fn(async () => ({
        success: false,
        finalCode: "candidate",
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
            message: "still invalid",
            severity: "error" as const,
          },
        ],
      })),
    });

    const exitCode = await runRepairCli(
      ["output/sections/hero.liquid", "--write"],
      deps,
    );

    expect(exitCode).toBe(1);
    expect(deps.writeFileFn).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith("Repair attempted: yes");
    expect(deps.log).toHaveBeenCalledWith("Final result used: no");
    expect(deps.log).toHaveBeenCalledWith("Status: FAILED");
    expect(deps.error).not.toHaveBeenCalled();
  });

  it("reports no repair attempt when initial validation is already ok", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: true,
        errors: [],
      })),
    });

    const exitCode = await runRepairCli(["output/sections/hero.liquid"], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith("Initial validation: OK");
    expect(deps.log).toHaveBeenCalledWith("Repair attempted: no");
    expect(deps.log).toHaveBeenCalledWith("Final result used: no");
    expect(deps.log).toHaveBeenCalledWith("Improvement detected: no");
  });

  it("uses stdout for functional failure report and stderr only for system errors", async () => {
    const deps = createDeps({
      repairSectionFn: vi.fn(async () => ({
        success: false,
        finalCode: null,
        report: {
          initialIssueCount: 1,
          finalIssueCount: 1,
          improved: false,
          attemptCount: 1,
          totalDuration: 5,
          exitReason: "max_retries_exceeded" as const,
          bestCandidateSelected: false,
          hadRuntimeErrors: false,
        },
        attempts: [],
        lastIssues: [],
      })),
    });

    const exitCode = await runRepairCli(["output/sections/hero.liquid"], deps);

    expect(exitCode).toBe(1);
    expect(deps.log).toHaveBeenCalled();
    expect(deps.error).not.toHaveBeenCalled();
  });
});
