import { describe, expect, it, vi } from "vitest";
import {
  buildValidationReport,
  parseValidateCliOptions,
  runValidateCli,
  type ValidateCliRuntimeDeps,
} from "../../src/cli/validateSection";

function createDeps(
  overrides: Partial<ValidateCliRuntimeDeps> = {},
): ValidateCliRuntimeDeps {
  return {
    readFileFn: vi.fn(
      async () =>
        '<div class="section-{{ section.id }}"></div>\n<style>.section-{{ section.id }}{}</style>\n{% schema %}{"name":"Hero","settings":[],"blocks":[],"presets":[{"name":"Hero"}]}{% endschema %}',
    ),
    validateSectionCodeFn: vi.fn(() => ({ isValid: true, errors: [] })),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("validate CLI options parser", () => {
  it("parses file path and defaults", () => {
    const options = parseValidateCliOptions(["output/sections/hero.liquid"]);

    expect(options.filePath).toBe("output/sections/hero.liquid");
    expect(options.designSystemEnabled).toBe(false);
    expect(options.format).toBe("text");
    expect(options.mode).toBe("strict");
  });

  it("enables design system when profile is provided", () => {
    const options = parseValidateCliOptions([
      "output/sections/hero.liquid",
      "--profile",
      "luxury",
      "--format=json",
    ]);

    expect(options.profile).toBe("luxury");
    expect(options.designSystemEnabled).toBe(true);
    expect(options.format).toBe("json");
  });

  it("parses non-strict mode", () => {
    const options = parseValidateCliOptions([
      "output/sections/hero.liquid",
      "--non-strict",
    ]);

    expect(options.mode).toBe("non-strict");
  });

  it("parses explicit mode value", () => {
    const options = parseValidateCliOptions([
      "output/sections/hero.liquid",
      "--mode=non-strict",
    ]);

    expect(options.mode).toBe("non-strict");
  });

  it("throws on missing file path", () => {
    expect(() => parseValidateCliOptions([])).toThrow(/Missing file path/);
  });

  it("throws on invalid profile", () => {
    expect(() =>
      parseValidateCliOptions([
        "output/sections/hero.liquid",
        "--profile",
        "invalid",
      ]),
    ).toThrow(/Invalid design profile/);
  });

  it("throws on invalid mode", () => {
    expect(() =>
      parseValidateCliOptions([
        "output/sections/hero.liquid",
        "--mode",
        "fast",
      ]),
    ).toThrow(/Invalid mode/);
  });
});

describe("validate CLI runtime", () => {
  it("returns 0 for valid sections", async () => {
    const deps = createDeps();

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation passed for: output/sections/hero.liquid",
    );
  });

  it("returns 1 for invalid sections", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: false,
        errors: ["Schema JSON is invalid."],
      })),
    });

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(
      "Validation failed for: output/sections/hero.liquid",
    );
  });

  it("returns 2 when file cannot be read", async () => {
    const deps = createDeps({
      readFileFn: vi.fn(async () => {
        throw new Error("ENOENT");
      }),
    });

    const exitCode = await runValidateCli(
      ["output/sections/missing.liquid"],
      deps,
    );

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Cannot read file/),
    );
  });

  it("prints JSON report when requested", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: false,
        errors: ["Global CSS selectors are not allowed: body"],
      })),
    });

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid", "--format", "json"],
      deps,
    );

    expect(exitCode).toBe(1);
    const jsonOutput = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(jsonOutput) as ReturnType<
      typeof buildValidationReport
    >;
    expect(parsed.reportVersion).toBe(2);
    expect(parsed.reportSchemaVersion).toBe("1.1.0");
    expect(parsed.mode).toBe("strict");
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.diagnostics[0].ruleId).toBe("css.global_selector");
  });

  it("maps mobile missing media to a specific ruleId", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: false,
        errors: ["Mobile UX issue: missing responsive @media rules."],
      })),
    });

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid", "--format", "json"],
      deps,
    );

    expect(exitCode).toBe(1);
    const jsonOutput = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(jsonOutput) as ReturnType<
      typeof buildValidationReport
    >;
    expect(parsed.diagnostics[0].ruleId).toBe("ux.mobile_missing_media_rules");
  });

  it("maps design-system token rule to a specific ruleId", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: false,
        errors: ["Design system expects CSS tokens via custom properties."],
      })),
    });

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid", "--format", "json"],
      deps,
    );

    expect(exitCode).toBe(1);
    const jsonOutput = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(jsonOutput) as ReturnType<
      typeof buildValidationReport
    >;
    expect(parsed.diagnostics[0].ruleId).toBe("design_system.tokens_required");
  });

  it("demotes selected rules to warnings in non-strict mode", async () => {
    const deps = createDeps({
      validateSectionCodeFn: vi.fn(() => ({
        isValid: false,
        errors: ["Mobile UX issue: missing responsive @media rules."],
      })),
    });

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid", "--non-strict", "--format=json"],
      deps,
    );

    expect(exitCode).toBe(0);
    const jsonOutput = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(jsonOutput) as ReturnType<
      typeof buildValidationReport
    >;
    expect(parsed.mode).toBe("non-strict");
    expect(parsed.summary.errors).toBe(0);
    expect(parsed.summary.warnings).toBe(1);
    expect(parsed.isValid).toBe(true);
  });
});
