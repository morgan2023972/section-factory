import { describe, expect, it } from "vitest";
import { buildRepairPrompt } from "../../../src/core/repair/buildRepairPrompt";

describe("buildRepairPrompt", () => {
  it("includes section context and blocking issues", () => {
    const prompt = buildRepairPrompt({
      sectionType: "hero",
      previousCode: "<div>bad</div>",
      blockingIssues: [{ path: "schema", message: "Schema JSON is invalid." }],
      shopifyRules: "No global CSS.",
      attemptNumber: 1,
      maxRetries: 2,
    });

    expect(prompt).toContain("Section type: hero");
    expect(prompt).toContain("Attempt: 1/2");
    expect(prompt).toContain("Schema JSON is invalid.");
    expect(prompt).toContain("No global CSS.");
    expect(prompt).toContain("<div>bad</div>");
  });
});
