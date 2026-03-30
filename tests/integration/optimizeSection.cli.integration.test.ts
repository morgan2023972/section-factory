import { describe, expect, it, vi } from "vitest";
import {
  runOptimizeCli,
  type OptimizeCliRuntimeDeps,
} from "../../src/cli/optimizeSection";

function createDeps(code: string): OptimizeCliRuntimeDeps {
  return {
    readFileFn: vi.fn(async () => code),
    writeFileFn: vi.fn(async () => {}),
    optimizeSectionFn: vi.fn((sectionCode: string) => ({
      optimizedCode: sectionCode,
      originalSize: sectionCode.length,
      optimizedSize: sectionCode.length,
      sizeDelta: 0,
      sizeDeltaPercent: 0,
      didRollback: false,
      optimizations: [],
      suggestions: [],
      safetyIssues: [],
      successCriteria: {
        size: {
          enabled: true,
          thresholdPercent: 5,
          gainPercent: 0,
          passed: false,
          criterion: "size",
        },
        safety: {
          enabled: true,
          riskyPatternsBefore: 0,
          riskyPatternsAfter: 0,
          passed: true,
          criterion: "safety",
        },
        structure: {
          enabled: true,
          conformityRulesApplied: 0,
          passed: false,
          criterion: "structure",
        },
      },
    })),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("CLI integration - optimizeSection", () => {
  it("returns 0 for valid report-only flow", async () => {
    const deps = createDeps('<div class="section-{{ section.id }}"></div>');

    const exitCode = await runOptimizeCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.readFileFn).toHaveBeenCalledWith("output/sections/hero.liquid");
  });

  it("returns 2 on invalid arguments", async () => {
    const deps = createDeps("<div></div>");

    const exitCode = await runOptimizeCli([], deps);

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Missing file path/),
    );
  });

  it("returns 2 when file cannot be read", async () => {
    const deps = createDeps("<div></div>");
    deps.readFileFn = vi.fn(async () => {
      throw new Error("ENOENT");
    });

    const exitCode = await runOptimizeCli(
      ["output/sections/missing.liquid"],
      deps,
    );

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Cannot read file/),
    );
  });
});
