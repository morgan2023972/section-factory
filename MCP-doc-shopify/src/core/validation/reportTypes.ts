import type { AnalysisIssue, AnalysisLimitation } from "./analysisTypes.js";
import type { StructuredValidationDiagnostic } from "./diagnosticsTypes.js";
import type {
  DocumentaryHint,
  TechnicalGuidanceItem,
} from "./guidanceTypes.js";

export type ValidationVerdict =
  | "pass"
  | "pass_with_warnings"
  | "fail"
  | "inconclusive";

export type ValidationMode = "full" | "report-only";

export interface InconclusiveSignal {
  readonly code: string;
  readonly message: string;
}

export interface ValidationReportSummary {
  readonly businessCount: number;
  readonly qualityCount: number;
  readonly technicalGuidanceCount: number;
  readonly documentaryHintCount: number;
  readonly issueCount: number;
  readonly limitationCount: number;
  readonly blockingBusinessCount: number;
  readonly warningCount: number;
}

export interface ValidationReport {
  readonly generatedAt: string;
  readonly requestedMode: ValidationMode;
  readonly effectiveMode: ValidationMode;
  readonly forcedByConfig: boolean;
  readonly downgradedDiagnosticsCount: number;
  readonly verdict: ValidationVerdict;
  readonly inconclusiveSignals: readonly InconclusiveSignal[];
  readonly businessDiagnostics: readonly Extract<
    StructuredValidationDiagnostic,
    { category: "business" }
  >[];
  readonly qualityDiagnostics: readonly Extract<
    StructuredValidationDiagnostic,
    { category: "quality" }
  >[];
  readonly technicalGuidance: readonly TechnicalGuidanceItem[];
  readonly documentaryHints: readonly DocumentaryHint[];
  readonly analysisIssues: readonly AnalysisIssue[];
  readonly analysisLimitations: readonly AnalysisLimitation[];
  readonly summary: ValidationReportSummary;
}
