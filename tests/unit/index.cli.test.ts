import { afterEach, describe, expect, it, vi } from "vitest";
import { startFactory } from "../../src/index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("index CLI", () => {
  it("lists available design profiles with summaries", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--list-profiles"]);

    const loggedMessages = logSpy.mock.calls.map((call) => call[0]);

    expect(loggedMessages).toContain("Available design profiles:\n");
    expect(loggedMessages).toContain("- minimal (default)");
    expect(loggedMessages).toContain("- tech");
    expect(
      loggedMessages.some((message) =>
        message.includes("Overall feel: calm, clean, premium minimalism"),
      ),
    ).toBe(true);
  });

  it("lists sections with enriched columns", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--list-sections"]);

    const loggedMessages = logSpy.mock.calls.map((call) => call[0]);

    expect(loggedMessages).toContain("Available sections:\n");
    expect(loggedMessages.some((message) => message.includes("type"))).toBe(
      true,
    );
    expect(loggedMessages.some((message) => message.includes("alias"))).toBe(
      true,
    );
    expect(
      loggedMessages.some((message) => message.includes("design-system")),
    ).toBe(true);
    expect(
      loggedMessages.some((message) => message.includes("product-grid")),
    ).toBe(true);
    expect(loggedMessages.some((message) => message.includes("features"))).toBe(
      true,
    );
  });

  it("keeps list-types command available with deprecation warning", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--list-types"]);

    const loggedMessages = logSpy.mock.calls.map((call) => call[0]);

    expect(loggedMessages).toContain("Available sections:\n");
    expect(loggedMessages.some((message) => message.includes("hero"))).toBe(
      true,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'Deprecation warning: "--list-types" will be removed in 2 releases. Use "--list-sections" instead.',
    );
  });

  it("shows explicit error for removed list-section alias", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--list-section"]);

    expect(errorSpy).toHaveBeenCalledWith(
      'Unsupported option: "--list-section" was removed. Use "--list-sections" instead.',
    );
    expect(logSpy).not.toHaveBeenCalledWith("Section Factory started");
  });

  it("prints effective AST policy snapshot", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--show-ast-policy"]);

    const loggedMessages = logSpy.mock.calls.map((call) => call[0]);
    expect(loggedMessages.length).toBeGreaterThan(0);

    const payload = JSON.parse(String(loggedMessages[0])) as {
      source: string;
      configPath: string;
      loadedFromEnv: boolean;
      envVar: string;
      ruleCount: number;
      policies: Record<string, unknown>;
    };

    expect(payload.source).toBe("ast-policy-runtime");
    expect(payload.envVar).toBe("SECTION_FACTORY_AST_RULE_CONFIG");
    expect(payload.ruleCount).toBeGreaterThan(0);
    expect(typeof payload.configPath).toBe("string");
    expect(typeof payload.policies).toBe("object");
  });
});
