import { describe, expect, it } from "vitest";
import { applyLocalFixes } from "../../../src/core/repair/applyLocalFixes";

describe("applyLocalFixes", () => {
  it("normalizes whitespace and keeps trailing newline", () => {
    const result = applyLocalFixes("line1\r\nline2\r\n");

    expect(result.code).toBe("line1\nline2\n");
    expect(result.fixed).toBe(true);
  });

  it("removes an unambiguous markdown wrapper", () => {
    const result = applyLocalFixes("```liquid\n<div>ok</div>\n```\n");

    expect(result.code).toContain("<div>ok</div>");
    expect(
      result.fixesApplied.some((f) => f.type === "cleanup.markdown-wrapper"),
    ).toBe(true);
  });

  it("adds missing endschema only when single schema opener is present", () => {
    const input = "{% schema %}\n{}\n";
    const result = applyLocalFixes(input);

    expect(result.code).toContain("{% endschema %}");
    expect(result.fixesApplied.some((f) => f.type === "schema.endschema")).toBe(
      true,
    );
  });
});
