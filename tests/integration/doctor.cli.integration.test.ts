import { describe, expect, it, vi } from "vitest";
import { runDoctorCli, type DoctorCliRuntimeDeps } from "../../src/cli/doctor";

function createDeps(
  overrides: Partial<DoctorCliRuntimeDeps> = {},
): DoctorCliRuntimeDeps {
  return {
    cwdFn: vi.fn(() => "C:/repo/section-factory"),
    getNodeVersionFn: vi.fn(() => "v22.11.0"),
    getEnvFn: vi.fn((name: string) =>
      name === "OPENAI_API_KEY" ? "sk-live" : undefined,
    ),
    pathExistsFn: vi.fn(async (_path: string) => true),
    checkModelAccessFn: vi.fn(async (_apiKey: string, model: string) => ({
      ok: true,
      message: `Model ${model} reachable`,
    })),
    nowIsoFn: vi.fn(() => "2026-03-24T12:00:00.000Z"),
    log: vi.fn(),
    error: vi.fn(),
    ...overrides,
  };
}

describe("CLI integration - doctor", () => {
  it("returns 0 on a healthy environment", async () => {
    const deps = createDeps();

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      expect.stringMatching(/Doctor report/),
    );
  });

  it("returns 1 when model access fails", async () => {
    const deps = createDeps({
      checkModelAccessFn: vi.fn(async () => ({
        ok: false,
        message: "401 Unauthorized",
      })),
    });

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Model probe failed/),
    );
  });

  it("returns 1 when output directories are missing", async () => {
    const deps = createDeps({
      pathExistsFn: vi.fn(
        async (targetPath: string) => !targetPath.includes("output"),
      ),
    });

    const exitCode = await runDoctorCli([], deps);

    expect(exitCode).toBe(1);
  });

  it("returns JSON output when format=json is requested", async () => {
    const deps = createDeps();

    const exitCode = await runDoctorCli(["--format", "json"], deps);

    expect(exitCode).toBe(0);
    const output = (deps.log as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    const parsed = JSON.parse(output) as { summary: { total: number } };
    expect(parsed.summary.total).toBeGreaterThan(0);
  });
});
