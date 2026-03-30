export type OptimizationChangeType =
  | "cleanup"
  | "minification"
  | "pattern-suggestion"
  | "safety-audit"
  | "rollback";

export interface OptimizationChange {
  type: OptimizationChangeType;
  location: string;
  description: string;
  before: string;
  after: string;
}

export interface OptimizationSuggestion {
  type: "reusability" | "lightness" | "safety" | "cleanliness";
  message: string;
}

export interface SafetyIssue {
  severity: "low" | "medium" | "high";
  category:
    | "global-selector"
    | "hardcoded-colors"
    | "fixed-width"
    | "global-js"
    | "compatibility";
  location: string;
  description: string;
  fix?: string;
}

export interface OptimizationOptions {
  cleanup?: boolean;
  patterns?: boolean;
  minify?: boolean;
  crossThemeSafety?: boolean;
  sizeGainThresholdPercent?: number;
}

export interface OptimizationSuccessCriteria {
  size: {
    enabled: boolean;
    thresholdPercent: number;
    gainPercent: number;
    passed: boolean;
    criterion: string;
  };
  safety: {
    enabled: boolean;
    riskyPatternsBefore: number;
    riskyPatternsAfter: number;
    passed: boolean;
    criterion: string;
  };
  structure: {
    enabled: boolean;
    conformityRulesApplied: number;
    passed: boolean;
    criterion: string;
  };
}

export interface OptimizationResult {
  optimizedCode: string;
  originalSize: number;
  optimizedSize: number;
  sizeDelta: number;
  sizeDeltaPercent: number;
  didRollback: boolean;
  optimizations: OptimizationChange[];
  suggestions: OptimizationSuggestion[];
  safetyIssues: SafetyIssue[];
  successCriteria: OptimizationSuccessCriteria;
}
