import { describe, it, expect } from "vitest";
import { validateSectionCode } from "../../src/core/sectionValidator";

function makeValidSectionCode(): string {
  return `
<div class="section-{{ section.id }}">
  <h2>{{ section.settings.heading }}</h2>
</div>

<style>
@media (device-max-width: 749px) {
  .section-{{ section.id }} {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

<script>
(() => {
  const root = document.currentScript?.closest('.section-{{ section.id }}');
  if (!root) {
    return;
  }
})();
</script>

{% schema %}
{
  "name": "Hero",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading" }
  ],
  "blocks": [],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}
`.trim();
}

function makeValidSectionCodeWithMediaScreen(): string {
  return `
<div class="section-{{ section.id }}">
  <button class="section-{{ section.id }}__cta">{{ section.settings.button_label }}</button>
</div>

<style>
.section-{{ section.id }} {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.section-{{ section.id }}__cta {
  background-color: #111;
  color: #fff;
  outline: none;
}

@media screen and (max-width: 749px) {
  .section-{{ section.id }} {
    grid-template-columns: 1fr;
  }
}
</style>

{% schema %}
{
  "name": "Hero",
  "settings": [
    { "type": "text", "id": "button_label", "label": "Button label" }
  ],
  "blocks": [],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}
`.trim();
}

describe("section validator", () => {
  it("returns valid for a compliant section", () => {
    const result = validateSectionCode(makeValidSectionCode());

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns invalid when section code is empty", () => {
    const result = validateSectionCode("   ");

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Section code is empty.");
  });

  it("returns invalid when schema tags are missing", () => {
    const codeWithoutSchema = makeValidSectionCode().replace(
      /{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/i,
      "",
    );
    const result = validateSectionCode(codeWithoutSchema);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("Missing Shopify schema tags"),
      ),
    ).toBe(true);
  });

  it("returns invalid when schema JSON is malformed", () => {
    const malformed = makeValidSectionCode().replace(
      /"presets": \[\{ "name": "Hero" \}\]/,
      '"presets": [{ "name": "Hero" ',
    );
    const result = validateSectionCode(malformed);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Schema JSON is invalid.");
  });

  it("returns invalid when global JS selectors are used", () => {
    const withGlobalJs = makeValidSectionCode().replace(
      "document.currentScript?.closest('.section-{{ section.id }}')",
      "document.querySelector('.foo')",
    );
    const result = validateSectionCode(withGlobalJs);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes(
          "Global JS access via document.* selectors is not allowed.",
        ),
      ),
    ).toBe(true);
  });

  it("returns invalid when CSS has global selectors", () => {
    const withGlobalCss = makeValidSectionCode().replace(
      "</style>",
      "\nbody { color: red; }\n</style>",
    );
    const result = validateSectionCode(withGlobalCss);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("Global CSS selectors are not allowed:"),
      ),
    ).toBe(true);
  });

  it("returns invalid when CSS scoping is missing", () => {
    const withoutScopedSelector = makeValidSectionCode().replace(
      /\.section-\{\{\s*section\.id\s*\}\}/g,
      ".section-static",
    );
    const result = validateSectionCode(withoutScopedSelector);

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes('CSS must be scoped with ".section-{{ section.id }}".'),
      ),
    ).toBe(true);
  });

  it("accepts @media screen and (max-width: ...) as responsive rule", () => {
    const result = validateSectionCode(makeValidSectionCodeWithMediaScreen());

    expect(
      result.errors.some((error) =>
        error.includes("Mobile UX issue: missing responsive @media rules."),
      ),
    ).toBe(false);
    expect(
      result.errors.some((error) =>
        error.includes("Global CSS selectors are not allowed:"),
      ),
    ).toBe(false);
  });

  it("reports AST advisory diagnostics without blocking validation", () => {
    const codeWithImageMissingAlt = makeValidSectionCode().replace(
      "<h2>{{ section.settings.heading }}</h2>",
      '<h2>{{ section.settings.heading }}</h2>\n  <img src="/test.jpg">',
    );

    const result = validateSectionCode(codeWithImageMissingAlt, {
      astValidationPhase: "advisory",
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.diagnostics?.length).toBeGreaterThan(0);
    expect(
      result.diagnostics?.some(
        (diagnostic) => diagnostic.ruleId === "ast.a11y.image_alt_missing",
      ),
    ).toBe(true);
  });
});
