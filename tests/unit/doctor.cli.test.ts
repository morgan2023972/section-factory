import { describe, expect, it, vi } from "vitest";
import {
  buildDoctorReport,
  parseDoctorCliOptions,
  runDoctorCli,
  type DoctorCliRuntimeDeps,
} from "../../src/cli/doctor";

function createDeps(
  overrides: Partial<DoctorCliRuntimeDeps> = {},
): DoctorCliRuntimeDeps {
  return {
    cwdFn: vi.fn(() => "C:/repo/section-factory"),
    getNodeVersionFn: vi.fn(() => "v22.0.0"),
    getEnvFn: vi.fn((name: string) =>
      name === "OPENAI_API_KEY" ? "sk-test" : undefined,
    ),
    pathExistsFn: vi.fn(async (_path: string) => true),
    checkModelAccessFn: vi.fn(async () => ({
      ok: true,
      message: "Model reachable",
    })),
    nowIsoFn: vi.fn(() => "2026-03-24T12:00:00.000Z"),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("doctor CLI options parser", () => {
  it("uses defaults when no options are provided", () => {
    const options = parseDoctorCliOptions([]);

    expect(options.model).toBeDefined();
    expect(options.model.length).toBeGreaterThan(0);
    expect(options.format).toBe("text");
  });

  it("parses explicit model", () => {
    const options = parseDoctorCliOptions(["--model", "gpt-4.1-mini"]);

    expect(options.model).toBe("gpt-4.1-mini");
  });

  it("parses json format", () => {
    const options = parseDoctorCliOptions(["--format=json"]);

    expect(options.format).toBe("json");
  });

  it("throws on invalid format", () => {
    expect(() => parseDoctorCliOptions(["--format", "xml"])).toThrow(
      /Invalid format/,
    );
  });

  it("throws on unknown argument", () => {
    expect(() => parseDoctorCliOptions(["--unknown"])).toThrow(
      /Unknown argument/,
    );
  });
});

describe("doctor CLI runtime", () => {
  it("returns 0 when all checks pass", async () => {
    const deps = createDeps();

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalled();
  });

  it("returns 1 when OPENAI_API_KEY is missing", async () => {
    const deps = createDeps({
      getEnvFn: vi.fn(() => undefined),
    });

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalled();
  });

  it("returns 1 when Node version is incompatible", async () => {
    const deps = createDeps({
      getNodeVersionFn: vi.fn(() => "v18.0.0"),
    });

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(1);
  });

  it("returns 1 when config files are missing", async () => {
    const deps = createDeps({
      pathExistsFn: vi.fn(
        async (targetPath: string) => !targetPath.endsWith("tsconfig.json"),
      ),
    });

    const report = await buildDoctorReport(parseDoctorCliOptions([]), deps);

    expect(report.isHealthy).toBe(false);
    expect(
      report.checks.some(
        (check) =>
          check.id === "config.tsconfig.json" && check.status === "fail",
      ),
    ).toBe(true);
  });

  it("returns 2 on invalid cli arguments", async () => {
    const deps = createDeps();

    const exitCode = await runDoctorCli(["--unknown"], deps);

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Unknown argument/),
    );
  });

  it("prints JSON report when requested", async () => {
    const deps = createDeps();

    const exitCode = await runDoctorCli(["--format=json"], deps);

    expect(exitCode).toBe(0);
    const output = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(output) as Awaited<
      ReturnType<typeof buildDoctorReport>
    >;
    expect(parsed.summary.total).toBeGreaterThan(0);
    expect(parsed.model).toBeDefined();
  });
});
