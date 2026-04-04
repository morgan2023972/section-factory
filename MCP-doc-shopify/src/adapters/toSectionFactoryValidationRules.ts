import { readLocalDocsIndex } from "../catalog/localDocsIndex.js";
import { shopifyDocsProvider } from "../catalog/provider.js";
import type { GuideResource } from "../catalog/types.js";
import {
  evaluateBusinessRules,
  evaluateQualityRules,
  type InternalValidationDiagnostic,
  type ValidationReasonCode,
} from "../core/rules/index.js";
import {
  buildAnalysisResult,
  buildDocumentaryHints,
  buildTechnicalGuidance,
  buildValidationReport,
  mapInternalDiagnosticToStructured,
  type ValidationReport,
  type DocumentaryHint,
  type StructuredValidationDiagnostic,
  type AnalysisResult,
  type TechnicalGuidanceItem,
} from "../core/validation/index.js";
import type { NormalizedDocFile } from "../pipeline/types.js";
import { buildValidationRuleInput } from "./buildValidationRuleInput.js";
import type {
  SectionFactoryValidationReportPayload,
  BuildSectionFactoryValidationRulesInput,
  SectionFactoryValidationRule,
  SectionFactoryValidationRulesPayload,
} from "./types.js";
import { resolveEffectiveValidationMode } from "./resolveEffectiveValidationMode.js";

function uniqueRules(
  rules: SectionFactoryValidationRule[],
): SectionFactoryValidationRule[] {
  const byId = new Map<string, SectionFactoryValidationRule>();
  for (const rule of rules) {
    if (!byId.has(rule.id)) {
      byId.set(rule.id, rule);
    }
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

const REASON_RECOMMENDATIONS: Readonly<Record<ValidationReasonCode, string>> = {
  missing_schema:
    "Add a {% schema %} ... {% endschema %} block to the section file.",
  invalid_schema_json:
    "Fix schema JSON syntax and ensure objects/arrays are valid and well-closed.",
  missing_blocks:
    "Define at least one block definition in schema when the section requires repeatable content.",
  missing_presets:
    "Declare at least one preset to make the section discoverable in the theme editor.",
  missing_settings:
    "Add at least one section-level setting with explicit id and label.",
  blocks_without_settings:
    "Align blocks and settings so merchants can configure section and block content coherently.",
  duplicate_ids:
    "Rename duplicated schema ids so each setting/block id is unique.",
};

function recommendationFromReasons(
  reasons: readonly ValidationReasonCode[] | undefined,
): string | null {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  const mapped = reasons
    .map((reason) => REASON_RECOMMENDATIONS[reason])
    .filter((value, index, values) => values.indexOf(value) === index);

  if (mapped.length === 0) {
    return null;
  }

  return mapped.join(" ");
}

function toValidationRule(
  diagnostic: InternalValidationDiagnostic,
): SectionFactoryValidationRule {
  const structured = mapInternalDiagnosticToStructured(diagnostic);
  if (structured) {
    return toValidationRuleFromStructured(structured);
  }

  const targetedRecommendation = recommendationFromReasons(diagnostic.reasons);

  return {
    id: diagnostic.id,
    title: diagnostic.title,
    severity: diagnostic.severity,
    rationale: `[${diagnostic.origin}] ${diagnostic.message}`,
    recommendation: targetedRecommendation ?? diagnostic.recommendation,
    sourceUrls: diagnostic.sourceUrls,
  };
}

function toValidationRuleFromStructured(
  diagnostic: StructuredValidationDiagnostic,
): SectionFactoryValidationRule {
  const targetedRecommendation = recommendationFromReasons(diagnostic.reasons);

  return {
    id: diagnostic.id,
    title: diagnostic.title,
    severity: diagnostic.severity,
    // Keep legacy origin wording for backward-compatible payloads.
    rationale: `[${diagnostic.legacyOrigin}] ${diagnostic.message}`,
    recommendation: targetedRecommendation ?? diagnostic.recommendation,
    sourceUrls: [...diagnostic.sourceUrls],
  };
}

function technicalGuidanceToLegacyRule(
  guidance: TechnicalGuidanceItem,
): SectionFactoryValidationRule {
  return {
    id: guidance.id,
    title: guidance.title,
    severity: guidance.id === "liquid-pattern-sanity" ? "info" : "warning",
    rationale: `[technical] ${guidance.message}`,
    recommendation: guidance.recommendation,
    sourceUrls: [...guidance.sourceUrls],
  };
}

function documentaryHintToDiagnostic(
  hint: DocumentaryHint,
): InternalValidationDiagnostic {
  return {
    id: hint.id,
    origin: "documentary",
    severity: hint.id === "liquid-reference-hint" ? "info" : "warning",
    blocking: false,
    title:
      hint.id === "schema-hints"
        ? "Schema documentary hints are available"
        : hint.id === "liquid-reference-hint"
          ? "Liquid documentary hints are available"
          : `Documentary hint candidate: ${hint.topic}`,
    message: hint.message,
    recommendation: hint.recommendation,
    sourceUrls: [...hint.sourceUrls],
    confidence: hint.confidence,
  };
}

function collectCoreRuleDiagnostics(
  input: ReturnType<typeof buildValidationRuleInput>,
): InternalValidationDiagnostic[] {
  return [...evaluateBusinessRules(input), ...evaluateQualityRules(input)];
}

function collectTechnicalDiagnostics(
  guides: readonly GuideResource[],
  structuralWarnings: readonly ValidationReasonCode[],
): InternalValidationDiagnostic[] {
  const sourceUrls = guides.map((guide) => guide.uri);

  const structuralDiagnostics: InternalValidationDiagnostic[] =
    structuralWarnings.map((warning, index) => ({
      id: `structural-warning-${index + 1}`,
      origin: "technical",
      severity: "warning",
      blocking: false,
      title: "Structural warning",
      message: toReasonMessage(warning),
      recommendation:
        "Resolve the structural warning in upstream validation before generation.",
      sourceUrls,
      reasons: [warning],
    }));

  return structuralDiagnostics.map((diagnostic) => ({
    ...diagnostic,
    sourceUrls:
      diagnostic.sourceUrls.length > 0 ? diagnostic.sourceUrls : sourceUrls,
  }));
}

function collectDocumentaryHintDiagnostics(
  hints: readonly DocumentaryHint[],
): InternalValidationDiagnostic[] {
  return hints.map(documentaryHintToDiagnostic);
}

function toReasonMessage(reason: ValidationReasonCode): string {
  switch (reason) {
    case "missing_schema":
      return "Schema block is missing.";
    case "invalid_schema_json":
      return "Schema JSON is invalid.";
    case "missing_blocks":
      return "Blocks are missing from schema when expected.";
    case "missing_presets":
      return "Presets are missing from schema.";
    case "missing_settings":
      return "Settings are missing from schema.";
    case "blocks_without_settings":
      return "Schema defines blocks without section settings.";
    case "duplicate_ids":
      return "Schema contains duplicate ids.";
  }
}

function legacyRulesFromReport(input: {
  report: ValidationReport;
  technicalDiagnostics?: readonly InternalValidationDiagnostic[];
}): SectionFactoryValidationRule[] {
  const report = input.report;
  const fromStructured = [
    ...report.businessDiagnostics,
    ...report.qualityDiagnostics,
  ].map(toValidationRuleFromStructured);

  const fromTechnicalDiagnostics = (input.technicalDiagnostics ?? []).map(
    toValidationRule,
  );

  const fromTechnicalGuidance = report.technicalGuidance.map(
    technicalGuidanceToLegacyRule,
  );

  const fromDocumentaryHints = report.documentaryHints.map((hint) =>
    toValidationRule(documentaryHintToDiagnostic(hint)),
  );

  return uniqueRules([
    ...fromStructured,
    ...fromTechnicalDiagnostics,
    ...fromTechnicalGuidance,
    ...fromDocumentaryHints,
  ]);
}

export function buildValidationRulesFromGuides(
  guides: readonly GuideResource[],
): SectionFactoryValidationRule[] {
  const coreInput = buildValidationRuleInput({ guides });
  const analysisResult = buildAnalysisResult({ guides, documents: [] });
  const technicalGuidance = buildTechnicalGuidance({ guides, analysisResult });
  const diagnostics = [
    ...collectCoreRuleDiagnostics(coreInput),
    ...collectTechnicalDiagnostics(guides, coreInput.facts.structuralWarnings),
  ];
  const report = buildValidationReport({
    analysisResult,
    diagnostics,
    technicalGuidance,
    documentaryHints: [],
  });

  return legacyRulesFromReport({
    report,
    technicalDiagnostics: diagnostics.filter(
      (diag) => diag.origin === "technical",
    ),
  });
}

export function buildValidationRulesFromDocs(
  docs: readonly NormalizedDocFile[],
): SectionFactoryValidationRule[] {
  const documentaryHints = buildDocumentaryHints({ docs });
  const analysisResult = buildAnalysisResult({ guides: [], documents: docs });
  const report = buildValidationReport({
    analysisResult,
    diagnostics: collectDocumentaryHintDiagnostics(documentaryHints),
    technicalGuidance: [],
    documentaryHints,
  });

  return legacyRulesFromReport({ report });
}

/**
 * @deprecated Transitional compatibility facade.
 * Prefer `buildSectionFactoryValidationReport(...)` and consume `ValidationReport` directly.
 */
export function buildSectionFactoryValidationRules(
  input: BuildSectionFactoryValidationRulesInput = {},
): SectionFactoryValidationRulesPayload {
  const artifacts = buildValidationReportArtifacts(input);

  if (artifacts.modeResolution.effectiveMode === "report-only") {
    return {
      rules: [],
      fallbackUsed: artifacts.fallbackUsed,
      report: artifacts.report,
    };
  }

  const rules = legacyRulesFromReport({
    report: artifacts.report,
    technicalDiagnostics: artifacts.technicalDiagnostics,
  });

  return {
    rules,
    fallbackUsed: artifacts.fallbackUsed,
    criticalVerdictBlocked: artifacts.report.verdict === "fail",
    report: artifacts.report,
  };
}

function buildValidationReportArtifacts(
  input: BuildSectionFactoryValidationRulesInput = {},
): {
  report: ValidationReport;
  fallbackUsed: boolean;
  technicalDiagnostics: readonly InternalValidationDiagnostic[];
  modeResolution: {
    requestedMode: "full" | "report-only";
    effectiveMode: "full" | "report-only";
    forcedByConfig: boolean;
  };
} {
  const guides = input.guides ?? shopifyDocsProvider.listGuideResources();
  const docs = input.documents ?? readLocalDocsIndex().documents;
  const analysisResult =
    input.analysisResult ??
    buildAnalysisResult({
      guides,
      validationSignals: input.validationSignals,
      documents: docs,
    });
  const technicalGuidance = buildTechnicalGuidance({
    guides,
    analysisResult,
  });
  const documentaryHints = buildDocumentaryHints({ docs, analysisResult });

  const coreInput = buildValidationRuleInput({
    guides,
    validationSignals: input.validationSignals,
    analysisResult,
  });

  const coreDiagnostics = collectCoreRuleDiagnostics(coreInput);
  const technicalDiagnostics = collectTechnicalDiagnostics(
    guides,
    coreInput.facts.structuralWarnings,
  );
  const documentaryDiagnostics =
    collectDocumentaryHintDiagnostics(documentaryHints);

  const modeResolution = resolveEffectiveValidationMode({
    requestedMode: input.legacyPayloadMode,
  });

  const report = buildValidationReport({
    analysisResult,
    diagnostics: [
      ...coreDiagnostics,
      ...technicalDiagnostics,
      ...documentaryDiagnostics,
    ],
    technicalGuidance,
    documentaryHints,
    modeResolution,
  });

  return {
    report,
    fallbackUsed: guides.length === 0 || docs.length === 0,
    technicalDiagnostics,
    modeResolution,
  };
}

export function buildSectionFactoryValidationReport(
  input: BuildSectionFactoryValidationRulesInput = {},
): SectionFactoryValidationReportPayload {
  const artifacts = buildValidationReportArtifacts(input);
  return {
    report: artifacts.report,
    fallbackUsed: artifacts.fallbackUsed,
  };
}
