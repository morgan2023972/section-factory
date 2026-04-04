import type { GuideResource } from "../catalog/types.js";
import type {
  ValidationReasonCode,
  ValidationRuleInput,
} from "../core/rules/index.js";
import {
  buildValidationRuleInputFromAnalysis,
  mapCountToAnalyzedField,
  mapOptionalBoolean,
  mapSchemaValidity,
  resolveBooleanCompatibility,
  resolveCountCompatibility,
} from "../core/validation/index.js";
import type { AnalysisResult } from "../core/validation/analysisTypes.js";
import type { ValidationSignalsInput } from "./types.js";

const KNOWN_REASON_CODES: readonly ValidationReasonCode[] = [
  "missing_schema",
  "invalid_schema_json",
  "missing_blocks",
  "missing_presets",
  "missing_settings",
  "blocks_without_settings",
  "duplicate_ids",
];

function isReasonCode(value: string): value is ValidationReasonCode {
  return KNOWN_REASON_CODES.includes(value as ValidationReasonCode);
}

function sanitizeReasonCodes(
  codes: readonly string[] | undefined,
): ValidationReasonCode[] {
  if (!codes) {
    return [];
  }

  const unique = new Set<ValidationReasonCode>();
  for (const code of codes) {
    if (isReasonCode(code)) {
      unique.add(code);
    }
  }

  return [...unique];
}

export function buildValidationRuleInput(input: {
  guides: readonly GuideResource[];
  validationSignals?: ValidationSignalsInput;
  analysisResult?: AnalysisResult;
}): ValidationRuleInput {
  if (input.analysisResult) {
    return buildValidationRuleInputFromAnalysis({
      trustedGuideUris: input.guides.map((guide) => guide.uri),
      analysisResult: input.analysisResult,
    });
  }

  // Deterministic and reliable facts only from internal validation signals.
  const settingsCountAnalyzed = mapCountToAnalyzedField(
    input.validationSignals?.settings?.count ??
      input.validationSignals?.settingsCount,
  );
  const blocksCountAnalyzed = mapCountToAnalyzedField(
    input.validationSignals?.blocks?.count ??
      input.validationSignals?.blocksCount,
  );
  const presetsCountAnalyzed = mapCountToAnalyzedField(
    input.validationSignals?.presets?.count ??
      input.validationSignals?.presetsCount,
  );
  const settingsCount = resolveCountCompatibility(settingsCountAnalyzed, 0);
  const blocksCount = resolveCountCompatibility(blocksCountAnalyzed, 0);
  const presetsCount = resolveCountCompatibility(presetsCountAnalyzed, 0);

  const schemaExistsAnalyzed = mapOptionalBoolean(
    input.validationSignals?.schema?.exists ??
      input.validationSignals?.hasSchema,
  );
  const schemaExists = resolveBooleanCompatibility(schemaExistsAnalyzed, false);
  const providedSchemaErrors = sanitizeReasonCodes(
    input.validationSignals?.schema?.errors,
  );
  const legacySchemaError =
    input.validationSignals?.schemaJsonValid === false
      ? (["invalid_schema_json"] as const)
      : [];
  const schemaErrors = sanitizeReasonCodes([
    ...providedSchemaErrors,
    ...legacySchemaError,
  ]);
  const schemaValidityAnalyzed = mapSchemaValidity({
    schemaExists: schemaExistsAnalyzed,
    explicitIsValid: input.validationSignals?.schema?.isValid,
    legacyIsValid: input.validationSignals?.schemaJsonValid,
    hasKnownErrors: schemaErrors.length > 0,
  });
  const schemaIsValid = schemaExists
    ? resolveBooleanCompatibility(schemaValidityAnalyzed, true)
    : false;

  const structuralWarnings = sanitizeReasonCodes(
    input.validationSignals?.structuralWarningCodes,
  );

  return {
    trustedGuideUris: input.guides.map((guide) => guide.uri),
    facts: {
      schema: {
        exists: schemaExists,
        isValid: schemaIsValid,
        errors: schemaErrors,
        analysis: {
          existsState: schemaExistsAnalyzed.state,
          validityState: schemaValidityAnalyzed.state,
        },
      },
      presets: {
        count: presetsCount,
        exists: presetsCount > 0,
        state: presetsCountAnalyzed.state,
      },
      settings: {
        count: settingsCount,
        exists: settingsCount > 0,
        state: settingsCountAnalyzed.state,
      },
      blocks: {
        count: blocksCount,
        exists: blocksCount > 0,
        state: blocksCountAnalyzed.state,
      },
      structuralWarnings,
    },
  };
}
