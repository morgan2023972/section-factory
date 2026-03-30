import { describe, expect, it } from "vitest";
import { optimizeSection } from "../../src/core/sectionOptimizer";

function makeSectionCode(extraStyle = ""): string {
  return `
<div class="section-{{ section.id }}">
  <h2>{{ section.settings.heading }}</h2>
</div>

<style>
.section-{{ section.id }} {
  color: #111;
}
${extraStyle}
@media (max-width: 749px) {
  .section-{{ section.id }} {
    color: #111;
  }
}
</style>

<script>
(() => {
  const root = document.currentScript?.closest('.section-{{ section.id }}');
  if (!root) return;
})();
</script>

{% schema %}
{
  "name": "Test",
  "settings": [{ "type": "text", "id": "heading", "label": "Heading" }],
  "blocks": [],
  "presets": [{ "name": "Test" }]
}
{% endschema %}
`.trim();
}

describe("sectionOptimizer core", () => {
  it("returns metrics and optimized code", () => {
    const result = optimizeSection(makeSectionCode());

    expect(typeof result.optimizedCode).toBe("string");
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.optimizedSize).toBeGreaterThan(0);
    expect(Array.isArray(result.optimizations)).toBe(true);
    expect(result.successCriteria.size.enabled).toBe(true);
    expect(result.successCriteria.safety.enabled).toBe(true);
    expect(result.successCriteria.structure.enabled).toBe(true);
  });

  it("can run with all features disabled", () => {
    const input = makeSectionCode();
    const result = optimizeSection(input, {
      cleanup: false,
      minify: false,
      patterns: false,
      crossThemeSafety: false,
    });

    expect(result.optimizedCode).toBe(input);
    expect(result.optimizations).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.safetyIssues).toHaveLength(0);
    expect(result.successCriteria.size.passed).toBe(true);
    expect(result.successCriteria.safety.passed).toBe(true);
    expect(result.successCriteria.structure.passed).toBe(true);
  });

  it("reports high safety issue for global selectors", () => {
    const result = optimizeSection(makeSectionCode("body { color: red; }"), {
      cleanup: false,
      minify: false,
      patterns: false,
      crossThemeSafety: true,
    });

    expect(
      result.safetyIssues.some(
        (issue) =>
          issue.category === "global-selector" && issue.severity === "high",
      ),
    ).toBe(true);
    expect(result.successCriteria.safety.passed).toBe(false);
  });

  it("fails size success criterion when gain is below threshold", () => {
    const result = optimizeSection(makeSectionCode(), {
      sizeGainThresholdPercent: 99,
    });

    expect(result.successCriteria.size.enabled).toBe(true);
    expect(result.successCriteria.size.passed).toBe(false);
  });
});
