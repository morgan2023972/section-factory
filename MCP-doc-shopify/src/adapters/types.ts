import type { GuideResource } from "../catalog/types.js";
import type { ValidationReasonCode } from "../core/rules/types.js";
import type { AnalysisResult } from "../core/validation/analysisTypes.js";
import type { ValidationReport } from "../core/validation/reportTypes.js";
import type { NormalizedDocFile } from "../pipeline/types.js";
import type { SearchHit, SearchTopicFilter } from "../search/types.js";

export interface BuildSectionFactoryPromptContextInput {
  sectionCategory?: string;
  query?: string;
  topic?: SearchTopicFilter;
  limit?: number;
  guides?: readonly GuideResource[];
  documents?: readonly NormalizedDocFile[];
  searchResults?: readonly SearchHit[];
}

export interface SectionFactoryPromptContextPayload {
  promptContext: string;
  guideCount: number;
  documentCount: number;
  searchHitCount: number;
  fallbackUsed: boolean;
}

export type SectionFactoryValidationSeverity = "info" | "warning" | "error";

export interface SectionFactoryValidationRule {
  id: string;
  title: string;
  severity: SectionFactoryValidationSeverity;
  rationale: string;
  recommendation: string;
  sourceUrls: string[];
}

export interface ValidationSignalsInput {
  schema?: {
    exists?: boolean;
    isValid?: boolean;
    errors?: readonly ValidationReasonCode[];
  };
  presets?: {
    count?: number;
  };
  settings?: {
    count?: number;
  };
  blocks?: {
    count?: number;
  };
  structuralWarningCodes?: readonly ValidationReasonCode[];

  // Legacy optional fields kept for compatibility.
  hasSchema?: boolean;
  schemaJsonValid?: boolean;
  settingsCount?: number;
  blocksCount?: number;
  presetsCount?: number;
}

export interface BuildSectionFactoryValidationRulesInput {
  guides?: readonly GuideResource[];
  documents?: readonly NormalizedDocFile[];
  // Internal and reliable validation facts, independent from normalized docs.
  validationSignals?: ValidationSignalsInput;
  // Optional enriched analysis produced upstream (phase 2+).
  analysisResult?: AnalysisResult;
  // Transitional migration switch:
  // - "full": includes legacy rules payload.
  // - "report-only": suppresses legacy rule emission while keeping the same API shape.
  legacyPayloadMode?: "full" | "report-only";
}

export interface SectionFactoryValidationRulesPayload {
  /**
   * @deprecated Legacy compatibility payload derived from ValidationReport.
   * Prefer using `report` directly.
   */
  rules: SectionFactoryValidationRule[];
  fallbackUsed: boolean;
  /**
   * @deprecated Legacy derived flag. Prefer `report.verdict === "fail"`.
   */
  criticalVerdictBlocked?: boolean;
  // Structured canonical payload (v2).
  report?: ValidationReport;
}

export interface SectionFactoryValidationReportPayload {
  report: ValidationReport;
  fallbackUsed: boolean;
}
