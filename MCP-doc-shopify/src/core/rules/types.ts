export type CoreRuleSource = "core-rule";

export type DiagnosticOrigin = "core-rule" | "technical" | "documentary";

export type DiagnosticSeverity = "info" | "warning" | "error";

export type DocumentaryConfidence = "low" | "medium" | "high";

export type AnalysisState = "present" | "absent" | "unknown" | "invalid";

// Closed set of internal reason codes used by business validation.
export type ValidationReasonCode =
  | "missing_schema"
  | "invalid_schema_json"
  | "missing_blocks"
  | "missing_presets"
  | "missing_settings"
  | "blocks_without_settings"
  | "duplicate_ids";

export interface ValidationSchemaFacts {
  readonly exists: boolean;
  readonly isValid: boolean;
  readonly errors: readonly ValidationReasonCode[];
  readonly analysis?: {
    readonly existsState: AnalysisState;
    readonly validityState: AnalysisState;
  };
}

export interface ValidationCollectionFacts {
  readonly exists: boolean;
  readonly count: number;
  readonly state?: AnalysisState;
}

export interface ValidationStructuralFacts {
  // All fields must be derived from internal and reliable analysis only.
  readonly schema: ValidationSchemaFacts;
  readonly presets: ValidationCollectionFacts;
  readonly settings: ValidationCollectionFacts;
  readonly blocks: ValidationCollectionFacts;
  readonly structuralWarnings: readonly ValidationReasonCode[];
}

export interface ValidationRuleInput {
  // Trusted source metadata from curated guides only.
  readonly trustedGuideUris: readonly string[];
  // Internal facts only; documentary hints are explicitly excluded.
  // Excluded fields: ruleCandidates, schemaHints, documentSummary.
  readonly facts: ValidationStructuralFacts;
}

export interface InternalValidationDiagnostic {
  id: string;
  origin: DiagnosticOrigin;
  severity: DiagnosticSeverity;
  blocking: boolean;
  title: string;
  message: string;
  recommendation: string;
  sourceUrls: string[];
  reasons?: readonly ValidationReasonCode[];
  // Confidence is reserved for documentary hints only.
  confidence?: DocumentaryConfidence;
}

export interface CoreRuleDefinition {
  id: string;
  description: string;
  severity: "warning" | "error";
  source: CoreRuleSource;
  evaluate: (input: ValidationRuleInput) => InternalValidationDiagnostic | null;
}
