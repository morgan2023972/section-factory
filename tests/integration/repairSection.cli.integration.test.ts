import { describe, expect, it, vi } from "vitest";
import {
  runRepairCli,
  type RepairCliRuntimeDeps,
} from "../../src/cli/repairSection";

function createDeps(): RepairCliRuntimeDeps {
  return {
    readFileFn: vi.fn(async () => "bad code"),
    writeFileFn: vi.fn(async () => undefined),
    validateSectionCodeFn: vi
      .fn()
      .mockReturnValueOnce({ errors: ["Schema JSON is invalid."] })
      .mockReturnValue({ errors: [] }),
    repairSectionFn: vi.fn(async () => ({
      success: true,
      finalCode: "<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}",
      report: {
        initialIssueCount: 1,
        finalIssueCount: 0,
        improved: true,
        attemptCount: 1,
        totalDuration: 12,
        exitReason: "success" as const,
        bestCandidateSelected: true,
        hadRuntimeErrors: false,
      },
      attempts: [],
      lastIssues: [],
    })),
    generateCorrectionFn: vi.fn(async () => "ignored"),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("CLI integration - repairSection", () => {
  it("repairs and writes output when requested", async () => {
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
    expect(deps.repairSectionFn).toHaveBeenCalled();
    expect(deps.writeFileFn).toHaveBeenCalledWith(
      "output/sections/hero.repaired.liquid",
      "<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}",
    );
  });
});
