import type {
  CoreRuleDefinition,
  InternalValidationDiagnostic,
  ValidationReasonCode,
  ValidationRuleInput,
} from "./types.js";

function hasReason(
  reasons: readonly ValidationReasonCode[],
  reason: ValidationReasonCode,
): boolean {
  return reasons.includes(reason);
}

const BUSINESS_RULES: readonly CoreRuleDefinition[] = [
  {
    id: "schema-required",
    description: "Section schema is required.",
    severity: "error",
    source: "core-rule",
    evaluate: (
      input: ValidationRuleInput,
    ): InternalValidationDiagnostic | null => {
      if (input.facts.schema.exists && input.facts.schema.isValid) {
        return null;
      }

      const reasons: ValidationReasonCode[] = [];
      if (!input.facts.schema.exists) {
        reasons.push("missing_schema");
      }
      if (input.facts.schema.exists && !input.facts.schema.isValid) {
        reasons.push(...input.facts.schema.errors);
        if (reasons.length === 0) {
          reasons.push("invalid_schema_json");
        }
      }

      const hasMissingBlocks = hasReason(reasons, "missing_blocks");

      return {
        id: "schema-required",
        origin: "core-rule",
        severity: "error",
        blocking: true,
        title: "Section schema is required",
        message: !input.facts.schema.exists
          ? "Critical rule failed: section schema block is missing."
          : hasMissingBlocks
            ? "Critical rule failed: schema is invalid and missing required blocks definition."
            : "Critical rule failed: schema block exists but its JSON is invalid.",
        recommendation:
          "Ensure {% schema %} ... {% endschema %} exists and contains valid JSON.",
        sourceUrls: [...input.trustedGuideUris],
        reasons,
      };
    },
  },
];

export function listBusinessRules(): readonly CoreRuleDefinition[] {
  return BUSINESS_RULES;
}

export function evaluateBusinessRules(
  input: ValidationRuleInput,
): InternalValidationDiagnostic[] {
  return BUSINESS_RULES.flatMap((rule) => {
    const diagnostic = rule.evaluate(input);
    return diagnostic ? [diagnostic] : [];
  });
}
