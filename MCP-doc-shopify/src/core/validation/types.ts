export type AnalysisState = "present" | "absent" | "unknown" | "invalid";

export type AnalysisConfidence = "high" | "medium" | "low";

export interface AnalyzedField<T> {
  readonly state: AnalysisState;
  readonly value?: T;
  readonly confidence: AnalysisConfidence;
  readonly note?: string;
}

export function analyzedField<T>(input: {
  state: AnalysisState;
  value?: T;
  confidence?: AnalysisConfidence;
  note?: string;
}): AnalyzedField<T> {
  return {
    state: input.state,
    value: input.value,
    confidence: input.confidence ?? "medium",
    note: input.note,
  };
}
