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

  it("keeps list-types command available", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    startFactory(["node", "src/index.ts", "--list-types"]);

    const loggedMessages = logSpy.mock.calls.map((call) => call[0]);

    expect(loggedMessages).toContain("Available sections:\n");
    expect(loggedMessages.some((message) => message.includes("hero"))).toBe(
      true,
    );
  });
});
