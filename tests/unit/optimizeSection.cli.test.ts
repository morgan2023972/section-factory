import { describe, expect, it, vi } from "vitest";
import {
  parseOptimizeCliOptions,
  runOptimizeCli,
  type OptimizeCliRuntimeDeps,
} from "../../src/cli/optimizeSection";

function createDeps(
  overrides: Partial<OptimizeCliRuntimeDeps> = {},
): OptimizeCliRuntimeDeps {
  return {
    readFileFn: vi.fn(async () => "<div></div>"),
    writeFileFn: vi.fn(async () => {}),
    optimizeSectionFn: vi.fn(() => ({
      optimizedCode: "<div></div>",
      originalSize: 10,
      optimizedSize: 8,
      sizeDelta: -2,
      sizeDeltaPercent: -20,
      didRollback: false,
      optimizations: [],
      suggestions: [],
      safetyIssues: [],
      successCriteria: {
        size: {
          enabled: true,
          thresholdPercent: 5,
          gainPercent: 20,
          passed: true,
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
          conformityRulesApplied: 2,
          passed: true,
          criterion: "structure",
        },
      },
    })),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("optimize CLI options", () => {
  it("parses defaults with all optimizer stages enabled", () => {
    const options = parseOptimizeCliOptions(["output/sections/hero.liquid"]);

    expect(options.filePath).toBe("output/sections/hero.liquid");
    expect(options.write).toBe(false);
    expect(options.format).toBe("text");
    expect(options.optimizer.cleanup).toBe(true);
    expect(options.optimizer.minify).toBe(true);
    expect(options.optimizer.patterns).toBe(true);
    expect(options.optimizer.crossThemeSafety).toBe(true);
  });

  it("parses explicit write and output options", () => {
    const options = parseOptimizeCliOptions([
      "output/sections/hero.liquid",
      "--write",
      "--output",
      "output/sections/hero.optimized.liquid",
      "--format=json",
      "--cleanup",
    ]);

    expect(options.write).toBe(true);
    expect(options.outputPath).toBe("output/sections/hero.optimized.liquid");
    expect(options.format).toBe("json");
    expect(options.optimizer.cleanup).toBe(true);
  });

  it("parses size threshold option", () => {
    const options = parseOptimizeCliOptions([
      "output/sections/hero.liquid",
      "--size-threshold=12.5",
    ]);

    expect(options.optimizer.sizeGainThresholdPercent).toBe(12.5);
  });
});

describe("optimize CLI runtime", () => {
  it("returns 0 for report-only optimization with no high safety issue", async () => {
    const deps = createDeps();

    const exitCode = await runOptimizeCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.readFileFn).toHaveBeenCalled();
    expect(deps.writeFileFn).not.toHaveBeenCalled();
  });

  it("returns 1 when optimizer reports high severity safety issue", async () => {
    const deps = createDeps({
      optimizeSectionFn: vi.fn(() => ({
        optimizedCode: "<div></div>",
        originalSize: 10,
        optimizedSize: 10,
        sizeDelta: 0,
        sizeDeltaPercent: 0,
        didRollback: false,
        optimizations: [],
        suggestions: [],
        safetyIssues: [
          {
            severity: "high",
            category: "global-selector",
            location: "style",
            description: "risk",
            fix: "scope",
          },
        ],
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
            riskyPatternsBefore: 1,
            riskyPatternsAfter: 1,
            passed: false,
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
    });

    const exitCode = await runOptimizeCli(
      ["output/sections/hero.liquid"],
      deps,
    );
    expect(exitCode).toBe(1);
  });

  it("writes optimized output when --write is enabled", async () => {
    const deps = createDeps();

    const exitCode = await runOptimizeCli(
      [
        "output/sections/hero.liquid",
        "--write",
        "--output",
        "output/sections/hero.optimized.liquid",
      ],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.writeFileFn).toHaveBeenCalledWith(
      "output/sections/hero.optimized.liquid",
      "<div></div>",
    );
  });
});
