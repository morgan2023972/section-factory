import type {
  CoreRuleDefinition,
  InternalValidationDiagnostic,
  ValidationRuleInput,
} from "./types.js";

const QUALITY_RULES: readonly CoreRuleDefinition[] = [
  {
    id: "settings-coherence",
    description: "Blocks should be backed by schema settings.",
    severity: "warning",
    source: "core-rule",
    evaluate: (
      input: ValidationRuleInput,
    ): InternalValidationDiagnostic | null => {
      if (
        !input.facts.schema.exists ||
        !input.facts.blocks.exists ||
        input.facts.settings.exists
      ) {
        return null;
      }

      return {
        id: "settings-coherence",
        origin: "core-rule",
        severity: "warning",
        blocking: false,
        title: "Settings should be coherent",
        message:
          "Core quality rule warning: schema defines blocks but no section setting is available.",
        recommendation:
          "Add at least one section setting or remove unnecessary blocks.",
        sourceUrls: [...input.trustedGuideUris],
        reasons: ["blocks_without_settings", "missing_settings"],
      };
    },
  },
  {
    id: "presets-availability",
    description: "Presets should be present.",
    severity: "warning",
    source: "core-rule",
    evaluate: (
      input: ValidationRuleInput,
    ): InternalValidationDiagnostic | null => {
      if (!input.facts.schema.exists || input.facts.presets.exists) {
        return null;
      }

      return {
        id: "presets-availability",
        origin: "core-rule",
        severity: "warning",
        blocking: false,
        title: "Presets should be present",
        message:
          "Core quality rule warning: schema is present but no preset is declared.",
        recommendation:
          "Add at least one practical preset so merchants can discover the section.",
        sourceUrls: [...input.trustedGuideUris],
        reasons: ["missing_presets"],
      };
    },
  },
];

export function listQualityRules(): readonly CoreRuleDefinition[] {
  return QUALITY_RULES;
}

export function evaluateQualityRules(
  input: ValidationRuleInput,
): InternalValidationDiagnostic[] {
  return QUALITY_RULES.flatMap((rule) => {
    const diagnostic = rule.evaluate(input);
    return diagnostic ? [diagnostic] : [];
  });
}
