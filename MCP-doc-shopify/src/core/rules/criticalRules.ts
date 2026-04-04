import type {
  CoreRuleDefinition,
  InternalValidationDiagnostic,
  ValidationRuleInput,
} from "./types.js";
import { evaluateBusinessRules, listBusinessRules } from "./businessRules.js";
import { evaluateQualityRules, listQualityRules } from "./qualityRules.js";

const CORE_RULES: readonly CoreRuleDefinition[] = [
  ...listBusinessRules(),
  ...listQualityRules(),
];

export function listCoreRules(): readonly CoreRuleDefinition[] {
  return CORE_RULES;
}

export function evaluateCoreRules(
  input: ValidationRuleInput,
): InternalValidationDiagnostic[] {
  return [...evaluateBusinessRules(input), ...evaluateQualityRules(input)];
}
