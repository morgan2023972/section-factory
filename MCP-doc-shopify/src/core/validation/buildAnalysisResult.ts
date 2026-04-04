import type { NormalizedDocFile } from "../../pipeline/types.js";
import type { ValidationSignalsInput } from "../../adapters/types.js";
import type { GuideResource } from "../../catalog/types.js";
import type { ValidationReasonCode } from "../rules/types.js";
import {
  mapCountToAnalyzedField,
  mapOptionalBoolean,
  mapSchemaValidity,
} from "./stateMappers.js";
import type {
  AnalysisIssue,
  AnalysisLimitation,
  AnalysisResult,
  DocumentationHintCandidate,
} from "./analysisTypes.js";

function uniqueReasonCodes(
  reasons: readonly ValidationReasonCode[],
): ValidationReasonCode[] {
  return [...new Set(reasons)];
}

function toDocumentationCandidates(
  docs: readonly NormalizedDocFile[],
): DocumentationHintCandidate[] {
  const topics = new Map<string, Set<string>>();
  for (const doc of docs) {
    if (!topics.has(doc.topic)) {
      topics.set(doc.topic, new Set<string>());
    }
    topics.get(doc.topic)?.add(doc.sourceUrl);
  }

  return [...topics.entries()].map(([topic, sourceUrls]) => ({
    topic,
    sourceUrls: [...sourceUrls],
    confidence:
      topic === "schema" || topic === "liquid-reference" ? "medium" : "low",
  }));
}

function collectIssues(input: {
  schemaExistsState: "present" | "absent" | "unknown" | "invalid";
  schemaValidityState: "present" | "absent" | "unknown" | "invalid";
  structuralWarnings: readonly ValidationReasonCode[];
}): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  if (input.schemaExistsState === "unknown") {
    issues.push({
      code: "schema_presence_unknown",
      message: "Schema presence cannot be determined from current signals.",
      field: "schema.exists",
      severity: "warning",
    });
  }

  if (input.schemaValidityState === "unknown") {
    issues.push({
      code: "schema_validity_unknown",
      message: "Schema validity cannot be determined from current signals.",
      field: "schema.isValid",
      severity: "warning",
    });
  }

  for (const warning of input.structuralWarnings) {
    issues.push({
      code: `structural_${warning}`,
      message: `Structural warning detected: ${warning}.`,
      field: "schema.structure",
      severity: "warning",
    });
  }

  return issues;
}

function collectLimitations(input: {
  schemaExistsState: "present" | "absent" | "unknown" | "invalid";
  schemaValidityState: "present" | "absent" | "unknown" | "invalid";
  settingsState: "present" | "absent" | "unknown" | "invalid";
  blocksState: "present" | "absent" | "unknown" | "invalid";
  presetsState: "present" | "absent" | "unknown" | "invalid";
}): AnalysisLimitation[] {
  const limitations: AnalysisLimitation[] = [];

  if (
    input.schemaExistsState === "unknown" ||
    input.schemaValidityState === "unknown"
  ) {
    limitations.push({
      code: "schema_analysis_incomplete",
      message:
        "Schema analysis remains incomplete due to missing explicit signals.",
      impact: "high",
    });
  }

  if (
    input.settingsState === "unknown" ||
    input.blocksState === "unknown" ||
    input.presetsState === "unknown"
  ) {
    limitations.push({
      code: "structure_counts_incomplete",
      message: "At least one structure count is unknown.",
      impact: "medium",
    });
  }

  return limitations;
}

export function buildAnalysisResult(input: {
  guides: readonly GuideResource[];
  validationSignals?: ValidationSignalsInput;
  documents?: readonly NormalizedDocFile[];
}): AnalysisResult {
  const schemaExists = mapOptionalBoolean(
    input.validationSignals?.schema?.exists ??
      input.validationSignals?.hasSchema,
  );

  const schemaErrors = [
    ...(input.validationSignals?.schema?.errors ?? []),
    ...(input.validationSignals?.schemaJsonValid === false
      ? (["invalid_schema_json"] as const)
      : []),
  ] as readonly ValidationReasonCode[];

  const normalizedSchemaErrors = uniqueReasonCodes(schemaErrors);

  const schemaValidity = mapSchemaValidity({
    schemaExists,
    explicitIsValid: input.validationSignals?.schema?.isValid,
    legacyIsValid: input.validationSignals?.schemaJsonValid,
    hasKnownErrors: normalizedSchemaErrors.length > 0,
  });

  const settingsCount = mapCountToAnalyzedField(
    input.validationSignals?.settings?.count ??
      input.validationSignals?.settingsCount,
  );
  const blocksCount = mapCountToAnalyzedField(
    input.validationSignals?.blocks?.count ??
      input.validationSignals?.blocksCount,
  );
  const presetsCount = mapCountToAnalyzedField(
    input.validationSignals?.presets?.count ??
      input.validationSignals?.presetsCount,
  );

  const structuralWarnings = uniqueReasonCodes(
    input.validationSignals?.structuralWarningCodes ?? [],
  );

  const issues = collectIssues({
    schemaExistsState: schemaExists.state,
    schemaValidityState: schemaValidity.state,
    structuralWarnings,
  });

  const limitations = collectLimitations({
    schemaExistsState: schemaExists.state,
    schemaValidityState: schemaValidity.state,
    settingsState: settingsCount.state,
    blocksState: blocksCount.state,
    presetsState: presetsCount.state,
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceId:
      input.guides.length > 0
        ? "validation-signals+guides"
        : "validation-signals",
    schema: {
      exists: schemaExists,
      validity: schemaValidity,
      errors: normalizedSchemaErrors,
    },
    sectionStructure: {
      settingsCount,
      blocksCount,
      presetsCount,
      structuralWarnings,
    },
    issues,
    limitations,
    documentationHintCandidates: toDocumentationCandidates(
      input.documents ?? [],
    ),
  };
}
