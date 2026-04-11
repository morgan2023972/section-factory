import { applyLocalFixes } from "./applyLocalFixes";
import { buildRepairPrompt } from "./buildRepairPrompt";
import { extractRepairedCode } from "./extractRepairedCode";
import type {
  RepairAttempt,
  RepairMode,
  RepairOptions,
  RepairResult,
  RepairRuntimeDeps,
  ValidationIssue,
} from "./types";

const NON_BLOCKING_MESSAGE_PREFIXES = [
  "Mobile UX issue:",
  "Section is too complex:",
];

function normalizeIssue(
  issue: ValidationIssue,
  index: number,
): ValidationIssue {
  return {
    path: issue?.path?.trim() || `issue[${index}]`,
    message: issue?.message?.trim() || "Unknown validation issue",
    ...(issue?.severity ? { severity: issue.severity } : {}),
  };
}

function normalizeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue, index) => normalizeIssue(issue, index));
}

function toSafeRetryCount(input: number | undefined, fallback: number): number {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback;
  }

  const normalized = Math.floor(input);
  if (normalized < 1) {
    return fallback;
  }

  return normalized;
}

function isExplicitStrictException(issue: ValidationIssue): boolean {
  const message = issue.message || "";
  return NON_BLOCKING_MESSAGE_PREFIXES.some((prefix) =>
    message.startsWith(prefix),
  );
}

export function isBlockingIssue(
  issue: ValidationIssue,
  mode: RepairMode,
): boolean {
  if (mode === "strict") {
    if (issue.severity === "warning") {
      return false;
    }

    if (issue.severity === "error") {
      return !isExplicitStrictException(issue);
    }

    return !isExplicitStrictException(issue);
  }

  if (issue.severity === "warning") {
    return false;
  }

  const message = issue.message || "";
  return !NON_BLOCKING_MESSAGE_PREFIXES.some((prefix) =>
    message.startsWith(prefix),
  );
}

export function filterBlockingIssues(
  issues: ValidationIssue[],
  mode: RepairMode,
): ValidationIssue[] {
  return issues.filter((issue) => isBlockingIssue(issue, mode));
}

function compareCandidates(
  current: {
    code: string;
    blockingIssues: ValidationIssue[];
    extracted: boolean;
    attemptNumber: number;
  },
  best: {
    code: string;
    blockingIssues: ValidationIssue[];
    extracted: boolean;
    attemptNumber: number;
  } | null,
): boolean {
  if (!best) {
    return true;
  }

  if (current.blockingIssues.length !== best.blockingIssues.length) {
    return current.blockingIssues.length < best.blockingIssues.length;
  }

  if (current.extracted !== best.extracted) {
    return current.extracted;
  }

  return current.attemptNumber >= best.attemptNumber;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown runtime error";
}

/*
Current repair behavior:
- Corrects well: missing/incomplete schema wrappers, trivial formatting cleanup,
  and simple unbalanced Liquid control-flow when the candidate stays close to
  the original section structure.
- Corrects partially: invalid schema JSON and multi-issue sections by selecting
  the best candidate seen so far, even when full validity is not reached.
- Current limits: does not guarantee semantic correctness, business intent
  preservation, or CSS/JS scoping fixes on its own; these still depend on the
  validator signal and on the generated candidate quality.
*/
export async function repairSection(
  sectionCode: string,
  issues: ValidationIssue[],
  options: RepairOptions = {},
  deps: RepairRuntimeDeps,
): Promise<RepairResult> {
  const startedAt = Date.now();
  const mode: RepairMode = options.mode ?? "non-strict";
  const maxRetries = toSafeRetryCount(options.maxRetries, 2);
  const sectionType = options.sectionType?.trim() || "custom";

  const attempts: RepairAttempt[] = [];
  let runtimeErrorCount = 0;

  const normalizedInitialIssues = normalizeIssues(issues);
  const initialBlocking = filterBlockingIssues(normalizedInitialIssues, mode);

  let currentCode = sectionCode || "";
  let currentBlockingIssues = initialBlocking;
  let bestKnownUnresolved = initialBlocking;

  let bestCandidate: {
    code: string;
    blockingIssues: ValidationIssue[];
    extracted: boolean;
    attemptNumber: number;
  } | null = null;

  if (currentBlockingIssues.length === 0) {
    return {
      success: true,
      finalCode: currentCode,
      report: {
        initialIssueCount: 0,
        finalIssueCount: 0,
        improved: false,
        attemptCount: 0,
        totalDuration: Date.now() - startedAt,
        exitReason: "success",
        bestCandidateSelected: false,
        hadRuntimeErrors: false,
      },
      attempts,
      lastIssues: [],
    };
  }

  for (let attemptNumber = 1; attemptNumber <= maxRetries; attemptNumber += 1) {
    const attemptStart = Date.now();
    const prompt = buildRepairPrompt({
      sectionType,
      previousCode: currentCode,
      blockingIssues: currentBlockingIssues,
      shopifyRules: deps.shopifyRules,
      attemptNumber,
      maxRetries,
    });

    try {
      const rawResponse = await deps.generateCorrectionFn(prompt);
      const extraction = extractRepairedCode(rawResponse);

      if (!extraction.extracted || !extraction.code) {
        attempts.push({
          attemptNumber,
          inputCode: currentCode,
          outputCode: rawResponse || null,
          extracted: false,
          extractionStrategy: extraction.metadata.strategy,
          fixesApplied: [],
          issuesAfterRepair: currentBlockingIssues,
          success: false,
          errorMessage:
            "Failed to extract valid section code from model output.",
          durationMs: Date.now() - attemptStart,
        });
        continue;
      }

      const localFix = applyLocalFixes(extraction.code);
      const candidateCode = localFix.code;
      const candidateIssues = normalizeIssues(
        await Promise.resolve(deps.validateCandidateFn(candidateCode)),
      );
      const candidateBlocking = filterBlockingIssues(candidateIssues, mode);
      const candidateSuccess = candidateBlocking.length === 0;

      attempts.push({
        attemptNumber,
        inputCode: currentCode,
        outputCode: rawResponse || null,
        extracted: true,
        extractionStrategy: extraction.metadata.strategy,
        fixesApplied: localFix.fixesApplied,
        issuesAfterRepair: candidateBlocking,
        success: candidateSuccess,
        errorMessage: null,
        durationMs: Date.now() - attemptStart,
      });

      const candidate = {
        code: candidateCode,
        blockingIssues: candidateBlocking,
        extracted: true,
        attemptNumber,
      };

      if (compareCandidates(candidate, bestCandidate)) {
        bestCandidate = candidate;
      }

      if (candidateBlocking.length < bestKnownUnresolved.length) {
        bestKnownUnresolved = candidateBlocking;
      }

      if (candidateSuccess) {
        return {
          success: true,
          finalCode: candidateCode,
          report: {
            initialIssueCount: initialBlocking.length,
            finalIssueCount: 0,
            improved: initialBlocking.length > 0,
            attemptCount: attempts.length,
            totalDuration: Date.now() - startedAt,
            exitReason: "success",
            bestCandidateSelected: bestCandidate !== null,
            hadRuntimeErrors: runtimeErrorCount > 0,
          },
          attempts,
          lastIssues: [],
        };
      }

      currentCode = candidateCode;
      currentBlockingIssues = candidateBlocking;
    } catch (error: unknown) {
      runtimeErrorCount += 1;
      attempts.push({
        attemptNumber,
        inputCode: currentCode,
        outputCode: null,
        extracted: false,
        extractionStrategy: "none",
        fixesApplied: [],
        issuesAfterRepair: currentBlockingIssues,
        success: false,
        errorMessage: toMessage(error),
        durationMs: Date.now() - attemptStart,
      });
    }
  }

  const finalCode = bestCandidate?.code ?? null;
  const lastIssues = finalCode
    ? bestCandidate?.blockingIssues || currentBlockingIssues
    : bestKnownUnresolved;

  return {
    success: false,
    finalCode,
    report: {
      initialIssueCount: initialBlocking.length,
      finalIssueCount: lastIssues.length,
      improved: initialBlocking.length > lastIssues.length,
      attemptCount: attempts.length,
      totalDuration: Date.now() - startedAt,
      exitReason:
        runtimeErrorCount > 0 && !bestCandidate
          ? "runtime_error"
          : "max_retries_exceeded",
      bestCandidateSelected: bestCandidate !== null,
      hadRuntimeErrors: runtimeErrorCount > 0,
    },
    attempts,
    lastIssues,
  };
}
