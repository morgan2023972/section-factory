import { describe, expect, it } from "vitest";
import { extractRepairedCode } from "../../../src/core/repair/extractRepairedCode";

describe("extractRepairedCode", () => {
  it("extracts liquid fenced block first", () => {
    const response =
      "text\n```liquid\n<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}\n```";
    const extracted = extractRepairedCode(response);

    expect(extracted.extracted).toBe(true);
    expect(extracted.metadata.strategy).toBe("fenced-liquid");
    expect(extracted.code).toContain("{% schema %}");
  });

  it("extracts generic fenced block only with strong markers", () => {
    const response =
      "```\n<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}\n```";
    const extracted = extractRepairedCode(response);

    expect(extracted.extracted).toBe(true);
    expect(extracted.metadata.strategy).toBe("fenced-generic");
  });

  it("fails when generic fenced block has weak markers", () => {
    const response = "```\nhello world\n```";
    const extracted = extractRepairedCode(response);

    expect(extracted.extracted).toBe(false);
    expect(extracted.code).toBeNull();
  });

  it("allows raw response only with strong markers", () => {
    const response =
      "<div>{{ section.id }}</div>\n{% schema %}{}{% endschema %}";
    const extracted = extractRepairedCode(response);

    expect(extracted.extracted).toBe(true);
    expect(extracted.metadata.strategy).toBe("raw-strong-markers");
  });
});
