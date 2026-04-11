import { describe, expect, it } from "vitest";
import { repairSection } from "../../src/core/repair";
import { validateSectionCode } from "../../src/core/sectionValidator";
import {
  applyStructuralRepairHeuristics,
  extractCodeFromPrompt,
  normalizeRepairLiquid,
  parseSchemaObject,
  readRepairTestFixture,
  toValidationIssues,
} from "./repairTestUtils";

/*
Fixture behavior review matrix:
- valid-minimal-section: should preserve and remain valid (must preserve)
- missing-schema-block: should improve structure, ideally with schema tags (must improve)
- broken-schema-json: should improve schema validity (must improve)
- unclosed-liquid-if: should close if blocks (must improve)
- unclosed-liquid-for: should close for blocks (must improve)
- global-js-pattern: should reduce risky global JS patterns (should improve)
- non-encapsulated-css: observe preservation/improvement without destructive loss (should preserve)
- mixed-broken-section: should improve while preserving key business content (must improve)
*/

function scriptedFixtureReviewRepair(code: string): string {
  let next = applyStructuralRepairHeuristics(code);

  if (/document\.querySelector\(/.test(next)) {
    next = next.replace(/document\.querySelector\(/g, "root.querySelector(");

    if (!/const root = document\.currentScript\?\.closest/.test(next)) {
      next = next.replace(
        /<script>/i,
        [
          "<script>",
          "const root = document.currentScript?.closest('.section-{{ section.id }}');",
          "if (!root) return;",
        ].join("\n"),
      );
    }
  }

  return next;
}

async function runFixtureReviewRepair(inputCode: string) {
  const beforeValidation = validateSectionCode(inputCode);
  const beforeErrors = beforeValidation.errors.length;

  const result = await repairSection(
    inputCode,
    toValidationIssues(beforeValidation.errors),
    { maxRetries: 2, mode: "non-strict", sectionType: "fixture-review" },
    {
      validateCandidateFn: async (candidateCode) => {
        const validation = validateSectionCode(candidateCode);
        return toValidationIssues(validation.errors);
      },
      generateCorrectionFn: async (prompt) => {
        const previousCode = extractCodeFromPrompt(prompt);
        return `\`\`\`liquid\n${scriptedFixtureReviewRepair(previousCode)}\n\`\`\``;
      },
      shopifyRules: "Follow Shopify section constraints.",
    },
  );

  const repairedCode = result.finalCode ?? "";
  const afterValidation = repairedCode
    ? validateSectionCode(repairedCode)
    : { isValid: false, errors: result.lastIssues.map((i) => i.message) };

  return {
    result,
    beforeErrors,
    afterErrors: afterValidation.errors.length,
    repairedCode,
  };
}

describe("repair fixture review", () => {
  describe("Groupe 1 — sécurité sur code valide", () => {
    it("repair is safe on already valid section", async () => {
      const code = await readRepairTestFixture("valid-minimal-section.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.result.success).toBe(true);
      expect(run.repairedCode.length).toBeGreaterThan(0);
      expect(normalizeRepairLiquid(run.repairedCode)).toBe(
        normalizeRepairLiquid(code),
      );
    });
  });

  describe("Groupe 2 — amélioration minimale sur code cassé", () => {
    it("improves missing schema fixture and keeps business text", async () => {
      const code = await readRepairTestFixture("missing-schema-block.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode).toContain("{% schema %}");
      expect(run.repairedCode).toContain("{% endschema %}");
      expect(run.repairedCode).toContain("Missing schema fixture");
      expect(run.repairedCode.length).toBeGreaterThan(0);
    });

    it("improves broken schema json fixture", async () => {
      const code = await readRepairTestFixture("broken-schema-json.liquid");
      const run = await runFixtureReviewRepair(code);
      const schema = parseSchemaObject(run.repairedCode);

      expect(run.repairedCode.length).toBeGreaterThan(0);
      expect(schema).not.toBeNull();
      expect(schema).toHaveProperty("name");
      expect(schema).toHaveProperty("settings");
      expect(schema).toHaveProperty("presets");
    });

    it("closes unclosed liquid if", async () => {
      const code = await readRepairTestFixture("unclosed-liquid-if.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode).toContain("{% endif %}");
      expect(run.repairedCode).toContain("show_title");
      expect(run.repairedCode.length).toBeGreaterThan(0);
    });

    it("closes unclosed liquid for", async () => {
      const code = await readRepairTestFixture("unclosed-liquid-for.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode).toContain("{% endfor %}");
      expect(run.repairedCode).toContain("section.blocks");
      expect(run.repairedCode.length).toBeGreaterThan(0);
    });

    it("improves global js pattern without deleting core content", async () => {
      const code = await readRepairTestFixture("global-js-pattern.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode).toContain(
        "const root = document.currentScript?.closest",
      );
      expect(run.repairedCode).toContain("root.querySelector(");
      expect(run.repairedCode).toContain('<button class="cta">Click</button>');
      expect(run.repairedCode.length).toBeGreaterThan(0);
    });

    it("handles non-encapsulated css fixture while preserving key markup", async () => {
      const code = await readRepairTestFixture("non-encapsulated-css.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode).toContain('<h2 class="title">Title</h2>');
      expect(run.repairedCode).toContain('<a class="button" href="#">Buy</a>');
      expect(run.repairedCode.length).toBeGreaterThan(0);
    });

    it("improves mixed broken fixture without dropping key variables", async () => {
      const code = await readRepairTestFixture("mixed-broken-section.liquid");
      const run = await runFixtureReviewRepair(code);

      expect(run.repairedCode.length).toBeGreaterThan(0);
      expect(run.repairedCode).toContain("section.settings");
      expect(run.repairedCode).toContain("section.blocks");
      expect(run.repairedCode).toContain("{% schema %}");
      expect(run.repairedCode).toContain("{% endif %}");
      expect(run.repairedCode).toContain("{% endfor %}");
      expect(run.afterErrors).toBeLessThanOrEqual(run.beforeErrors);
    });
  });

  describe("Groupe 3 — validation post-repair", () => {
    it("demonstrates measurable improvement for selected broken fixtures", async () => {
      const fixtures = [
        "missing-schema-block.liquid",
        "broken-schema-json.liquid",
        "mixed-broken-section.liquid",
      ];

      for (const fixture of fixtures) {
        const code = await readRepairTestFixture(fixture);
        const run = await runFixtureReviewRepair(code);
        expect(run.afterErrors).toBeLessThanOrEqual(run.beforeErrors);
      }
    });
  });

  describe("Groupe 4 — non-régression / non-destruction", () => {
    it("preserves business invariants without destructive loss", async () => {
      const cases = [
        {
          fixture: "missing-schema-block.liquid",
          requiredContent: [
            "section.id",
            "section.settings",
            "Missing schema fixture",
          ],
        },
        {
          fixture: "unclosed-liquid-if.liquid",
          requiredContent: ["section.settings", "show_title", "title"],
        },
        {
          fixture: "mixed-broken-section.liquid",
          requiredContent: [
            "section.id",
            "section.settings",
            "section.blocks",
            "block.settings.text",
          ],
        },
      ];

      for (const testCase of cases) {
        const code = await readRepairTestFixture(testCase.fixture);
        const run = await runFixtureReviewRepair(code);

        expect(run.repairedCode.length).toBeGreaterThan(0);
        expect(run.repairedCode.length).toBeGreaterThan(
          Math.floor(code.length * 0.4),
        );
        expect(run.repairedCode).not.toContain("undefined");
        expect(run.repairedCode).not.toContain(
          "{% schema %}\n{}\n{% endschema %}",
        );

        for (const content of testCase.requiredContent) {
          expect(run.repairedCode).toContain(content);
        }
      }
    });
  });

  describe("Groupe 5 — idempotence de base", () => {
    it("repair is idempotent after normalization on two representative fixtures", async () => {
      const fixtures = [
        "missing-schema-block.liquid",
        "unclosed-liquid-if.liquid",
      ];

      for (const fixture of fixtures) {
        const code = await readRepairTestFixture(fixture);
        const first = await runFixtureReviewRepair(code);
        const second = await runFixtureReviewRepair(first.repairedCode);

        expect(normalizeRepairLiquid(second.repairedCode)).toBe(
          normalizeRepairLiquid(first.repairedCode),
        );
      }
    });
  });
});
