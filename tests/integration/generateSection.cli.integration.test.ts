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

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(1);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation failed. Starting retry correction (max 2 attempts).",
    );
    expect(deps.error).toHaveBeenCalledWith(
      "Validation failed after retry attempts:",
    );
    expect(deps.error).toHaveBeenCalledWith(
      "- section: Schema JSON is invalid.",
    );
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
    expect(deps.log).toHaveBeenCalledWith(
      "Validation failed. Starting retry correction (max 2 attempts).",
    );
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("retries and succeeds after an initial validation failure", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi
      .fn()
      .mockResolvedValueOnce("initial-invalid-code")
      .mockResolvedValueOnce("corrected-valid-code");
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

    const exitCode = await runCli(["hero"], deps);

    expect(exitCode).toBe(0);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(2);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation failed. Starting retry correction (max 2 attempts).",
    );
    expect(deps.log).toHaveBeenCalledWith("Retry correction succeeded.");
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "corrected-valid-code",
    );
  });

  it("passes --max-retries value to retry flow and succeeds on last allowed attempt", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi
      .fn()
      .mockResolvedValueOnce("initial-invalid")
      .mockResolvedValueOnce("retry-invalid")
      .mockResolvedValueOnce("retry-valid");
    deps.validateSectionCodeFn = vi
      .fn()
      .mockReturnValueOnce({
        isValid: false,
        errors: ["Schema JSON is invalid."],
      })
      .mockReturnValueOnce({
        isValid: false,
        errors: ["Schema JSON is invalid."],
      })
      .mockReturnValueOnce({
        isValid: true,
        errors: [],
      });

    const exitCode = await runCli(["hero", "--max-retries", "2"], deps);

    expect(exitCode).toBe(0);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(3);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation failed. Starting retry correction (max 2 attempts).",
    );
    expect(deps.writeSectionToDiskFn).toHaveBeenCalledWith(
      "hero",
      "retry-valid",
    );
  });

  it("fails when retries are exhausted and prints final blocking issues", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi
      .fn()
      .mockResolvedValueOnce("initial-invalid")
      .mockResolvedValueOnce("retry-invalid-1")
      .mockResolvedValueOnce("retry-invalid-2");
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    }));

    const exitCode = await runCli(["hero", "--max-retries", "2"], deps);

    expect(exitCode).toBe(1);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(3);
    expect(deps.error).toHaveBeenCalledWith(
      "Validation failed after retry attempts:",
    );
    expect(deps.error).toHaveBeenCalledWith(
      "- section: Schema JSON is invalid.",
    );
    expect(deps.writeSectionToDiskFn).not.toHaveBeenCalled();
  });

  it("treats --max-retries 0 as no retry and fails immediately", async () => {
    const deps = createDeps();
    deps.generateSectionFn = vi.fn().mockResolvedValueOnce("invalid-code");
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Schema JSON is invalid."],
    }));

    const exitCode = await runCli(["hero", "--max-retries", "0"], deps);

    expect(exitCode).toBe(1);
    expect(deps.generateSectionFn).toHaveBeenCalledTimes(1);
    expect(deps.error).toHaveBeenCalledWith("Validation failed:");
    expect(deps.error).toHaveBeenCalledWith("- Schema JSON is invalid.");
    expect(deps.log).not.toHaveBeenCalledWith(
      "Validation failed. Starting retry correction (max 0 attempts).",
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
