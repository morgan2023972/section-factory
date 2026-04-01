import { beforeEach, describe, expect, it, vi } from "vitest";

const { createResponseMock, openAiConstructorMock } = vi.hoisted(() => {
  const create = vi.fn();
  const ctor = vi.fn();

  return {
    createResponseMock: create,
    openAiConstructorMock: ctor,
  };
});

vi.mock("openai", () => ({
  default: class OpenAIMock {
    responses = {
      create: createResponseMock,
    };

    constructor(...args: unknown[]) {
      openAiConstructorMock(...args);
    }
  },
}));

import { generateSection } from "../../src/core/sectionGenerator";

describe("sectionGenerator", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_API_KEY;
  });

  it("throws when prompt is empty", async () => {
    await expect(generateSection("")).rejects.toThrow(
      "Prompt is required to generate a section.",
    );
    await expect(generateSection("   ")).rejects.toThrow(
      "Prompt is required to generate a section.",
    );
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    await expect(generateSection("create hero")).rejects.toThrow(
      "Missing OPENAI_API_KEY environment variable.",
    );
    expect(openAiConstructorMock).not.toHaveBeenCalled();
  });

  it("uses default model gpt-4.1-mini when OPENAI_MODEL is undefined", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockResolvedValueOnce({ output_text: "<div>ok</div>" });

    await generateSection("build section");

    expect(createResponseMock).toHaveBeenCalledWith({
      model: "gpt-4.1-mini",
      input: "build section",
    });
  });

  it("uses OPENAI_MODEL from environment when provided", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_MODEL = "gpt-4.1";
    createResponseMock.mockResolvedValueOnce({ output_text: "<div>ok</div>" });

    await generateSection("build section");

    expect(createResponseMock).toHaveBeenCalledWith({
      model: "gpt-4.1",
      input: "build section",
    });
  });

  it("returns trimmed output_text", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockResolvedValueOnce({ output_text: "  code  " });

    const result = await generateSection("build section");

    expect(result).toBe("code");
  });

  it("throws wrapped error when OpenAI returns empty output", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockResolvedValueOnce({ output_text: "   " });

    await expect(generateSection("build section")).rejects.toThrow(
      "Failed to generate section: OpenAI returned an empty response.",
    );
  });

  it("throws wrapped error when OpenAI response has no output_text", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockResolvedValueOnce({});

    await expect(generateSection("build section")).rejects.toThrow(
      "Failed to generate section: OpenAI returned an empty response.",
    );
  });

  it("wraps provider Error with Failed to generate section prefix", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockRejectedValueOnce(new Error("quota exceeded"));

    await expect(generateSection("build section")).rejects.toThrow(
      "Failed to generate section: quota exceeded",
    );
  });

  it("wraps unknown provider failure with generic message", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    createResponseMock.mockRejectedValueOnce("boom" as never);

    await expect(generateSection("build section")).rejects.toThrow(
      "Failed to generate section: Unknown OpenAI error",
    );
  });
});
