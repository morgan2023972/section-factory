import { describe, expect, it, vi } from "vitest";
import {
  runValidateCli,
  type ValidateCliRuntimeDeps,
} from "../../src/cli/validateSection";

function makeValidSectionCode(): string {
  return `
<div class="section-{{ section.id }}">
  <h2>{{ section.settings.heading }}</h2>
</div>

<style>
.section-{{ section.id }} {
  display: block;
}
@media (max-width: 749px) {
  .section-{{ section.id }} {
    display: block;
  }
}
</style>

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

function createDeps(code: string): ValidateCliRuntimeDeps {
  return {
    readFileFn: vi.fn(async () => code),
    validateSectionCodeFn: vi.fn(
      (sectionCode: string, _options?: { designSystemEnabled?: boolean }) => {
        const hasSchema = /{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/i.test(
          sectionCode,
        );
        return hasSchema
          ? { isValid: true, errors: [] }
          : {
              isValid: false,
              errors: [
                "Missing Shopify schema tags: {% schema %} ... {% endschema %}.",
              ],
            };
      },
    ),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("CLI integration - validateSection", () => {
  it("returns exit code 0 for a valid file", async () => {
    const deps = createDeps(makeValidSectionCode());

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation passed for: output/sections/hero.liquid",
    );
  });

  it("returns exit code 1 for an invalid file", async () => {
    const deps = createDeps("<div>invalid</div>");

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid"],
      deps,
    );

    expect(exitCode).toBe(1);
    expect(deps.error).toHaveBeenCalledWith(
      "Validation failed for: output/sections/hero.liquid",
    );
  });

  it("returns exit code 2 on invalid arguments", async () => {
    const deps = createDeps(makeValidSectionCode());

    const exitCode = await runValidateCli([], deps);

    expect(exitCode).toBe(2);
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringMatching(/Missing file path/),
    );
  });

  it("returns exit code 0 in non-strict mode for warning-eligible rules", async () => {
    const deps = createDeps(makeValidSectionCode());
    deps.validateSectionCodeFn = vi.fn(() => ({
      isValid: false,
      errors: ["Mobile UX issue: missing responsive @media rules."],
    }));

    const exitCode = await runValidateCli(
      ["output/sections/hero.liquid", "--mode", "non-strict"],
      deps,
    );

    expect(exitCode).toBe(0);
    expect(deps.log).toHaveBeenCalledWith(
      "Validation passed for: output/sections/hero.liquid",
    );
  });
});
