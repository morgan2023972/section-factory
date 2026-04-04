import type { AnalysisResult } from "./analysisTypes.js";
import {
  resolveBooleanCompatibility,
  resolveCountCompatibility,
} from "./stateMappers.js";
import type { StabilizedValidationRuleInput } from "./validationRuleInputTypes.js";

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function buildValidationRuleInputFromAnalysis(input: {
  trustedGuideUris: readonly string[];
  analysisResult: AnalysisResult;
}): StabilizedValidationRuleInput {
  const settingsCount = resolveCountCompatibility(
    input.analysisResult.sectionStructure.settingsCount,
    0,
  );
  const blocksCount = resolveCountCompatibility(
    input.analysisResult.sectionStructure.blocksCount,
    0,
  );
  const presetsCount = resolveCountCompatibility(
    input.analysisResult.sectionStructure.presetsCount,
    0,
  );

  const schemaExists = resolveBooleanCompatibility(
    input.analysisResult.schema.exists,
    false,
  );
  const schemaIsValid = schemaExists
    ? resolveBooleanCompatibility(input.analysisResult.schema.validity, true)
    : false;

  return {
    trustedGuideUris: uniqueStrings(input.trustedGuideUris),
    facts: {
      schema: {
        exists: schemaExists,
        isValid: schemaIsValid,
        errors: [...input.analysisResult.schema.errors],
        analysis: {
          existsState: input.analysisResult.schema.exists.state,
          validityState: input.analysisResult.schema.validity.state,
        },
      },
      settings: {
        count: settingsCount,
        exists: settingsCount > 0,
        state: input.analysisResult.sectionStructure.settingsCount.state,
      },
      blocks: {
        count: blocksCount,
        exists: blocksCount > 0,
        state: input.analysisResult.sectionStructure.blocksCount.state,
      },
      presets: {
        count: presetsCount,
        exists: presetsCount > 0,
        state: input.analysisResult.sectionStructure.presetsCount.state,
      },
      structuralWarnings: [
        ...new Set(input.analysisResult.sectionStructure.structuralWarnings),
      ],
    },
  };
}
