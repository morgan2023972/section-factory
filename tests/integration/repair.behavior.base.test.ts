import { describe, expect, it, vi } from "vitest";
import {
  runGenerationPipeline,
  type CliRuntimeDeps,
} from "../../src/cli/generateSection";
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

function validateBehavioral(code: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const hasSchemaStart = /{%\s*schema\s*%}/i.test(code);
  const hasSchemaEnd = /{%\s*endschema\s*%}/i.test(code);
  if (!hasSchemaStart || !hasSchemaEnd) {
    errors.push("Schema block is missing or incomplete.");
  }

  const ifOpen = (code.match(/{%\s*if\b/gi) || []).length;
  const ifClose = (code.match(/{%\s*endif\s*%}/gi) || []).length;
  if (ifOpen !== ifClose) {
    errors.push("Unbalanced if/endif tags.");
  }

  const forOpen = (code.match(/{%\s*for\b/gi) || []).length;
  const forClose = (code.match(/{%\s*endfor\s*%}/gi) || []).length;
  if (forOpen !== forClose) {
    errors.push("Unbalanced for/endfor tags.");
  }

  const schemaMatch = code.match(
    /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i,
  );
  if (schemaMatch?.[1]) {
    try {
      JSON.parse(schemaMatch[1]);
    } catch {
      errors.push("Schema JSON is invalid.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function scriptedBaselineRepair(code: string): string {
  return applyStructuralRepairHeuristics(code);
}

async function runBehaviorBaselineRepair(inputCode: string) {
  const before = validateBehavioral(inputCode);

  const result = await repairSection(
    inputCode,
    toValidationIssues(before.errors),
    { maxRetries: 2, mode: "strict", sectionType: "behavior-base" },
    {
      validateCandidateFn: async (candidateCode) => {
        const validation = validateBehavioral(candidateCode);
        return toValidationIssues(validation.errors);
      },
      generateCorrectionFn: async (prompt) => {
        const previousCode = extractCodeFromPrompt(prompt);
        return `\`\`\`liquid\n${scriptedBaselineRepair(previousCode)}\n\`\`\``;
      },
      shopifyRules: "Follow Shopify section constraints.",
    },
  );

  const finalCode = result.finalCode ?? "";
  const after = finalCode
    ? validateBehavioral(finalCode)
    : {
        isValid: false,
        errors: result.lastIssues.map((issue) => issue.message),
      };

  return {
    before,
    after,
    finalCode,
    result,
  };
}

function createPipelineDeps(): CliRuntimeDeps {
  return {
    generateSectionFn: vi.fn(async () => "<section>ok</section>"),
    writeSectionToDiskFn: vi.fn(async () => "output/sections/hero.liquid"),
    validateSectionCodeFn: vi.fn(() => ({ isValid: true, errors: [] })),
    repairSectionFn: vi.fn(async () => ({
      success: true,
      finalCode: "unused",
      report: {
        initialIssueCount: 1,
        finalIssueCount: 0,
        improved: true,
        attemptCount: 1,
        totalDuration: 10,
        exitReason: "success" as const,
        bestCandidateSelected: true,
        hadRuntimeErrors: false,
      },
      attempts: [],
      lastIssues: [],
    })),
    log: vi.fn(),
    error: vi.fn(),
  };
}

describe("repair behavioral baseline", () => {
  describe("Groupe 1 — Safety", () => {
    it("repair ne modifie pas section valide", async () => {
      const code = await readRepairTestFixture("valid-minimal-section.liquid");
      const result = await repairSection(
        code,
        [],
        { maxRetries: 2, mode: "non-strict", sectionType: "behavior-base" },
        {
          validateCandidateFn: async (candidateCode) => {
            const validation = validateSectionCode(candidateCode);
            return toValidationIssues(validation.errors);
          },
          generateCorrectionFn: async (prompt) => {
            const previousCode = extractCodeFromPrompt(prompt);
            return `\`\`\`liquid\n${scriptedBaselineRepair(previousCode)}\n\`\`\``;
          },
          shopifyRules: "Follow Shopify section constraints.",
        },
      );

      expect(result.success).toBe(true);
      expect(normalizeRepairLiquid(result.finalCode ?? "")).toBe(
        normalizeRepairLiquid(code),
      );
    });

    it("pipeline n'appelle pas repair si valide", async () => {
      const deps = createPipelineDeps();

      const result = await runGenerationPipeline(
        {
          sectionType: "hero",
          designSystem: { enabled: false },
          maxRetries: 2,
          validationMode: "non-strict",
        },
        deps,
      );

      expect(result.pipelineStatus).toBe("generated_valid");
      expect(result.repairAttempted).toBe(false);
      expect(deps.repairSectionFn).not.toHaveBeenCalled();
    });
  });

  describe("Groupe 2 — amélioration minimale", () => {
    it("corrige le défaut principal des fixtures cassées sans sur-contraindre", async () => {
      const cases = [
        {
          fixture: "missing-schema-block.liquid",
          assertMainFix: (finalCode: string) => {
            expect(finalCode).toContain("{% schema %}");
            expect(finalCode).toContain("{% endschema %}");
          },
        },
        {
          fixture: "broken-schema-json.liquid",
          assertMainFix: (finalCode: string) => {
            const schema = parseSchemaObject(finalCode);
            expect(schema).not.toBeNull();
            expect(schema).toHaveProperty("name");
            expect(schema).toHaveProperty("settings");
            expect(schema).toHaveProperty("presets");
          },
        },
        {
          fixture: "unclosed-liquid-if.liquid",
          assertMainFix: (finalCode: string) => {
            expect(finalCode).toContain("{% endif %}");
            expect(finalCode).toContain("section.settings");
          },
        },
        {
          fixture: "mixed-broken-section.liquid",
          assertMainFix: (finalCode: string) => {
            expect(finalCode).toContain("{% schema %}");
            expect(finalCode).toContain("{% endif %}");
            expect(finalCode).toContain("{% endfor %}");
          },
        },
      ];

      for (const testCase of cases) {
        const code = await readRepairTestFixture(testCase.fixture);
        const run = await runBehaviorBaselineRepair(code);

        expect(run.finalCode).not.toBe("");
        expect(run.finalCode.length).toBeGreaterThan(0);
        testCase.assertMainFix(run.finalCode);
      }
    });
  });

  describe("Groupe 3 — Validation avant/après", () => {
    it("améliore la validation sur des fixtures cassées", async () => {
      const fixtures = [
        "missing-schema-block.liquid",
        "broken-schema-json.liquid",
        "unclosed-liquid-if.liquid",
        "mixed-broken-section.liquid",
      ];
      let measurableImprovementCount = 0;

      for (const fixture of fixtures) {
        const code = await readRepairTestFixture(fixture);
        const run = await runBehaviorBaselineRepair(code);

        expect(run.before.isValid).toBe(false);
        expect(Array.isArray(run.before.errors)).toBe(true);
        expect(Array.isArray(run.after.errors)).toBe(true);

        if (
          run.result.report.improved ||
          run.after.isValid ||
          run.after.errors.length < run.before.errors.length
        ) {
          measurableImprovementCount += 1;
        }
      }

      expect(measurableImprovementCount).toBeGreaterThan(0);
    });
  });

  describe("Groupe 4 — non-destruction", () => {
    it("conserve les invariants métier après repair", async () => {
      const cases = [
        {
          fixture: "valid-minimal-section.liquid",
          requiredContent: ["section.id", "section.settings", "Title"],
        },
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
        const run = await runBehaviorBaselineRepair(code);

        expect(run.finalCode.length).toBeGreaterThan(0);
        expect(run.finalCode.length).toBeGreaterThan(
          Math.floor(code.length * 0.4),
        );
        expect(run.finalCode).not.toContain("undefined");

        for (const content of testCase.requiredContent) {
          expect(run.finalCode).toContain(content);
        }
      }
    });
  });
});
