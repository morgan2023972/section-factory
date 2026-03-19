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
