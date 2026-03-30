import { validateSectionCode } from "../sectionValidator";
import { applyCleanup } from "./cleanup";
import { applyMinification } from "./minifier";
import { collectPatternSuggestions } from "./patterns";
import { auditCrossThemeSafety } from "./safetyAudit";
import {
  type OptimizationChange,
  type OptimizationOptions,
  type OptimizationResult,
  type OptimizationSuggestion,
} from "./types";

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  cleanup: true,
  patterns: true,
  minify: true,
  crossThemeSafety: true,
  sizeGainThresholdPercent: 5,
};

function toPercentDelta(originalSize: number, optimizedSize: number): number {
  if (originalSize <= 0) {
    return 0;
  }

  return Number(
    (((optimizedSize - originalSize) / originalSize) * 100).toFixed(2),
  );
}

function countRiskyPatterns(
  issues: ReturnType<typeof auditCrossThemeSafety>,
): number {
  return issues.filter((issue) => issue.severity !== "low").length;
}

function hasValidationRegression(
  originalCode: string,
  candidateCode: string,
): boolean {
  const originalValidation = validateSectionCode(originalCode);
  if (!originalValidation.isValid) {
    return false;
  }

  const candidateValidation = validateSectionCode(candidateCode);
  return !candidateValidation.isValid;
}

export function optimizeSection(
  sectionCode: string,
  options?: OptimizationOptions,
): OptimizationResult {
  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...(options ?? {}),
  };

  const originalSize = Buffer.byteLength(sectionCode, "utf8");
  const optimizations: OptimizationChange[] = [];
  const suggestions: OptimizationSuggestion[] = [];
  const baselineSafetyIssues = resolvedOptions.crossThemeSafety
    ? auditCrossThemeSafety(sectionCode)
    : [];
  let candidateCode = sectionCode;

  if (resolvedOptions.cleanup) {
    const cleanupResult = applyCleanup(candidateCode);
    candidateCode = cleanupResult.code;
    optimizations.push(...cleanupResult.changes);
    if (cleanupResult.changes.length > 0) {
      suggestions.push({
        type: "cleanliness",
        message: "Cleanup applied to improve readability and consistency.",
      });
    }
  }

  if (resolvedOptions.minify) {
    const minificationResult = applyMinification(candidateCode);
    candidateCode = minificationResult.code;
    optimizations.push(...minificationResult.changes);
    if (minificationResult.changes.length > 0) {
      suggestions.push({
        type: "lightness",
        message: "Minification applied to reduce output size.",
      });
    }
  }

  if (hasValidationRegression(sectionCode, candidateCode)) {
    optimizations.push({
      type: "rollback",
      location: "section",
      description:
        "Optimization rollback triggered because transformed code failed validation.",
      before: "optimized code",
      after: "original code",
    });
    suggestions.push({
      type: "safety",
      message:
        "Optimization was rolled back due to validation regression. Review risky transformations.",
    });
    candidateCode = sectionCode;
  }

  if (resolvedOptions.patterns) {
    suggestions.push(...collectPatternSuggestions(candidateCode));
  }

  const safetyIssues = resolvedOptions.crossThemeSafety
    ? auditCrossThemeSafety(candidateCode)
    : [];

  if (safetyIssues.length > 0) {
    suggestions.push({
      type: "safety",
      message:
        "Cross-theme safety issues detected. Review safetyIssues for detailed recommendations.",
    });
  }

  const optimizedSize = Buffer.byteLength(candidateCode, "utf8");
  const sizeDeltaPercent = toPercentDelta(originalSize, optimizedSize);
  const sizeGainPercent = Number(Math.max(0, -sizeDeltaPercent).toFixed(2));
  const didRollback =
    candidateCode === sectionCode &&
    optimizations.some((change) => change.type === "rollback");
  const structureChangesApplied = didRollback
    ? 0
    : optimizations.filter(
        (change) => change.type === "cleanup" || change.type === "minification",
      ).length;

  const sizeCriterionEnabled =
    resolvedOptions.cleanup || resolvedOptions.minify;
  const riskyPatternsBefore = countRiskyPatterns(baselineSafetyIssues);
  const riskyPatternsAfter = countRiskyPatterns(safetyIssues);

  return {
    optimizedCode: candidateCode,
    originalSize,
    optimizedSize,
    sizeDelta: optimizedSize - originalSize,
    sizeDeltaPercent,
    didRollback,
    optimizations,
    suggestions,
    safetyIssues,
    successCriteria: {
      size: {
        enabled: sizeCriterionEnabled,
        thresholdPercent: resolvedOptions.sizeGainThresholdPercent,
        gainPercent: sizeGainPercent,
        passed: !sizeCriterionEnabled
          ? true
          : sizeGainPercent >= resolvedOptions.sizeGainThresholdPercent,
        criterion:
          "Optimisation taille reussie si gain >= seuil de compression/cleanup.",
      },
      safety: {
        enabled: resolvedOptions.crossThemeSafety,
        riskyPatternsBefore,
        riskyPatternsAfter,
        passed: !resolvedOptions.crossThemeSafety
          ? true
          : riskyPatternsBefore === 0
            ? riskyPatternsAfter === 0
            : riskyPatternsAfter < riskyPatternsBefore,
        criterion:
          "Optimisation securite reussie si un pattern risque est supprime.",
      },
      structure: {
        enabled: resolvedOptions.cleanup || resolvedOptions.minify,
        conformityRulesApplied: structureChangesApplied,
        passed:
          !(resolvedOptions.cleanup || resolvedOptions.minify) ||
          structureChangesApplied > 0,
        criterion:
          "Optimisation structure reussie si au moins une regle de conformite est appliquee.",
      },
    },
  };
}

export type {
  OptimizationChange,
  OptimizationOptions,
  OptimizationResult,
} from "./types";
