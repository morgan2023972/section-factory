import type { ValidationIssue as RetryValidationIssue } from "../../generator/retryGenerator";

export type ValidationIssue = RetryValidationIssue;

export type RepairMode = "strict" | "non-strict";

export interface RepairOptions {
  maxRetries?: number;
  mode?: RepairMode;
  sectionType?: string;
}

export interface RepairRuntimeDeps {
  validateCandidateFn: (
    code: string,
  ) => ValidationIssue[] | Promise<ValidationIssue[]>;
  generateCorrectionFn: (prompt: string) => Promise<string>;
  shopifyRules: string;
  log?: (msg: string) => void;
  error?: (msg: string) => void;
}

export interface FixApplied {
  type: string;
  description: string;
}

export interface RepairAttempt {
  attemptNumber: number;
  inputCode: string;
  outputCode: string | null;
  extracted: boolean;
  extractionStrategy?: string;
  fixesApplied: FixApplied[];
  issuesAfterRepair: ValidationIssue[];
  success: boolean;
  errorMessage: string | null;
  durationMs?: number;
}

export type RepairExitReason =
  | "success"
  | "max_retries_exceeded"
  | "runtime_error";

export interface RepairResult {
  success: boolean;
  finalCode: string | null;
  report: {
    initialIssueCount: number;
    finalIssueCount: number;
    improved: boolean;
    attemptCount: number;
    totalDuration: number;
    exitReason: RepairExitReason;
    bestCandidateSelected: boolean;
    hadRuntimeErrors: boolean;
  };
  attempts: RepairAttempt[];
  // If finalCode is null, this contains the best known unresolved blocking issues.
  lastIssues: ValidationIssue[];
}

export interface ExtractedCodeResult {
  extracted: boolean;
  code: string | null;
  metadata: {
    strategy:
      | "fenced-liquid"
      | "fenced-generic"
      | "raw-strong-markers"
      | "none";
  };
}

export interface LocalFixResult {
  code: string;
  fixed: boolean;
  fixesApplied: FixApplied[];
}
