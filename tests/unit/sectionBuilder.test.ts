import * as path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs-extra";

vi.mock("fs-extra", () => ({
  ensureDir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
}));

import { writeSectionToDisk } from "../../src/core/sectionBuilder";

function expectedOutputDir(): string {
  return path.resolve(process.cwd(), "output", "sections");
}

describe("sectionBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes section to output sections using sanitized liquid filename", async () => {
    const sectionCode = "<div>Hero</div>";

    const outputPath = await writeSectionToDisk(
      "  Hero Banner 2026.liquid  ",
      sectionCode,
    );

    const expectedPath = path.join(
      expectedOutputDir(),
      "hero-banner-2026.liquid",
    );

    expect(fs.ensureDir).toHaveBeenCalledWith(expectedOutputDir());
    expect(fs.writeFile).toHaveBeenCalledWith(
      expectedPath,
      sectionCode,
      "utf8",
    );
    expect(outputPath).toBe(expectedPath);
  });

  it("writes minimal valid input and returns deterministic path", async () => {
    const sectionCode = "<div></div>";

    const firstPath = await writeSectionToDisk("hero", sectionCode);
    const secondPath = await writeSectionToDisk("hero", sectionCode);

    const expectedPath = path.join(expectedOutputDir(), "hero.liquid");

    expect(firstPath).toBe(expectedPath);
    expect(secondPath).toBe(expectedPath);
    expect(fs.writeFile).toHaveBeenNthCalledWith(
      1,
      expectedPath,
      sectionCode,
      "utf8",
    );
    expect(fs.writeFile).toHaveBeenNthCalledWith(
      2,
      expectedPath,
      sectionCode,
      "utf8",
    );
  });

  it("falls back to section liquid when normalized name is empty", async () => {
    const outputPath = await writeSectionToDisk("---", "<div>ok</div>");

    expect(outputPath).toBe(path.join(expectedOutputDir(), "section.liquid"));
  });

  it("throws when sectionCode is empty or whitespace", async () => {
    await expect(writeSectionToDisk("hero", "")).rejects.toThrow(
      "Section code is empty.",
    );
    await expect(writeSectionToDisk("hero", "   ")).rejects.toThrow(
      "Section code is empty.",
    );
    expect(fs.ensureDir).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("throws for nullish sectionCode and does not write to disk", async () => {
    await expect(
      writeSectionToDisk("hero", null as unknown as string),
    ).rejects.toThrow("Section code is empty.");
    await expect(
      writeSectionToDisk("hero", undefined as unknown as string),
    ).rejects.toThrow("Section code is empty.");

    expect(fs.ensureDir).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it("sanitizes object-like section names without leaking raw object token", async () => {
    const outputPath = await writeSectionToDisk(
      "[object Object].liquid",
      "<div>ok</div>",
    );

    expect(outputPath).toBe(
      path.join(expectedOutputDir(), "object-object.liquid"),
    );
    expect(outputPath.includes("[object Object]")).toBe(false);
  });

  it("returns absolute output path string", async () => {
    const outputPath = await writeSectionToDisk("hero", "<div>ok</div>");

    expect(typeof outputPath).toBe("string");
    expect(path.isAbsolute(outputPath)).toBe(true);
    expect(outputPath.startsWith(expectedOutputDir())).toBe(true);
  });

  it("throws for unexpected non-string sectionName at runtime", async () => {
    await expect(
      writeSectionToDisk(undefined as unknown as string, "<div>ok</div>"),
    ).rejects.toThrow();
  });
});
