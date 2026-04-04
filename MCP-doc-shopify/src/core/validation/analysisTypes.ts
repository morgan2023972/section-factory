import type { ValidationReasonCode } from "../rules/types.js";
import type { AnalyzedField } from "./types.js";

export interface AnalysisIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly severity: "info" | "warning" | "error";
}

export interface AnalysisLimitation {
  readonly code: string;
  readonly message: string;
  readonly impact: "low" | "medium" | "high";
}

export interface DocumentationHintCandidate {
  readonly topic: string;
  readonly sourceUrls: readonly string[];
  readonly confidence: "low" | "medium" | "high";
}

export interface SchemaAnalysis {
  readonly exists: AnalyzedField<boolean>;
  readonly validity: AnalyzedField<boolean>;
  readonly errors: readonly ValidationReasonCode[];
}

export interface SectionStructureAnalysis {
  readonly settingsCount: AnalyzedField<number>;
  readonly blocksCount: AnalyzedField<number>;
  readonly presetsCount: AnalyzedField<number>;
  readonly structuralWarnings: readonly ValidationReasonCode[];
}

export interface AnalysisResult {
  readonly generatedAt: string;
  readonly sourceId: string;
  readonly schema: SchemaAnalysis;
  readonly sectionStructure: SectionStructureAnalysis;
  readonly issues: readonly AnalysisIssue[];
  readonly limitations: readonly AnalysisLimitation[];
  readonly documentationHintCandidates: readonly DocumentationHintCandidate[];
}
