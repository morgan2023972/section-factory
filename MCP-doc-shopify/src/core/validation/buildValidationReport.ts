import { mapInternalDiagnosticToStructured } from "./diagnosticMappers.js";
import { computeVerdict } from "./computeVerdict.js";
import type { AnalysisResult } from "./analysisTypes.js";
import type { InternalValidationDiagnostic } from "../rules/types.js";
import type {
  DocumentaryHint,
  TechnicalGuidanceItem,
} from "./guidanceTypes.js";
import type {
  ValidationMode,
  ValidationReport,
  ValidationReportSummary,
} from "./reportTypes.js";

function extractCriticalUnknownSignals(
  analysisResult: AnalysisResult,
): string[] {
  const fields: string[] = [];

  if (analysisResult.schema.exists.state === "unknown") {
    fields.push("schema.exists");
  }

  if (analysisResult.schema.validity.state === "unknown") {
    fields.push("schema.isValid");
  }

  return fields;
}

function buildSummary(input: {
  businessDiagnostics: ValidationReport["businessDiagnostics"];
  qualityDiagnostics: ValidationReport["qualityDiagnostics"];
  technicalGuidance: readonly TechnicalGuidanceItem[];
  documentaryHints: readonly DocumentaryHint[];
  analysisResult: AnalysisResult;
}): ValidationReportSummary {
  const warningCount =
    input.businessDiagnostics.filter((diag) => diag.severity === "warning")
      .length +
    input.qualityDiagnostics.filter((diag) => diag.severity === "warning")
      .length;

  return {
    businessCount: input.businessDiagnostics.length,
    qualityCount: input.qualityDiagnostics.length,
    technicalGuidanceCount: input.technicalGuidance.length,
    documentaryHintCount: input.documentaryHints.length,
    issueCount: input.analysisResult.issues.length,
    limitationCount: input.analysisResult.limitations.length,
    blockingBusinessCount: input.businessDiagnostics.filter(
      (diag) => diag.blocking,
    ).length,
    warningCount,
  };
}

export function buildValidationReport(input: {
  generatedAt?: string;
  analysisResult: AnalysisResult;
  diagnostics: readonly InternalValidationDiagnostic[];
  technicalGuidance: readonly TechnicalGuidanceItem[];
  documentaryHints: readonly DocumentaryHint[];
  modeResolution?: {
    requestedMode: ValidationMode;
    effectiveMode: ValidationMode;
    forcedByConfig: boolean;
  };
}): ValidationReport {
  const structured = input.diagnostics
    .map(mapInternalDiagnosticToStructured)
    .filter((diag) => Boolean(diag));

  const businessDiagnostics = structured.filter(
    (diag) => diag?.category === "business",
  ) as ValidationReport["businessDiagnostics"];

  const qualityDiagnostics = structured.filter(
    (diag) => diag?.category === "quality",
  ) as ValidationReport["qualityDiagnostics"];

  const verdictResult = computeVerdict({
    diagnostics: [...businessDiagnostics, ...qualityDiagnostics],
    analysisLimitations: input.analysisResult.limitations,
    criticalUnknownSignals: extractCriticalUnknownSignals(input.analysisResult),
  });

  const modeResolution = input.modeResolution ?? {
    requestedMode: "full",
    effectiveMode: "full",
    forcedByConfig: false,
  };

  const blockingBusinessCount = businessDiagnostics.filter(
    (diag) => diag.blocking,
  ).length;
  const downgradedDiagnosticsCount =
    modeResolution.effectiveMode === "report-only" &&
    verdictResult.verdict === "fail"
      ? blockingBusinessCount
      : 0;

  const finalVerdict =
    modeResolution.effectiveMode === "report-only" &&
    verdictResult.verdict === "fail"
      ? "pass_with_warnings"
      : verdictResult.verdict;

  const summary = buildSummary({
    businessDiagnostics,
    qualityDiagnostics,
    technicalGuidance: input.technicalGuidance,
    documentaryHints: input.documentaryHints,
    analysisResult: input.analysisResult,
  });

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    requestedMode: modeResolution.requestedMode,
    effectiveMode: modeResolution.effectiveMode,
    forcedByConfig: modeResolution.forcedByConfig,
    downgradedDiagnosticsCount,
    verdict: finalVerdict,
    inconclusiveSignals: verdictResult.inconclusiveSignals,
    businessDiagnostics,
    qualityDiagnostics,
    technicalGuidance: [...input.technicalGuidance],
    documentaryHints: [...input.documentaryHints],
    analysisIssues: [...input.analysisResult.issues],
    analysisLimitations: [...input.analysisResult.limitations],
    summary,
  };
}
