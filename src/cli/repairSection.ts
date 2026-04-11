import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as path from "path";
import { generateSection } from "../core/sectionGenerator";
import {
  validateSectionCode,
  type SectionValidationResult,
  type SectionValidationDiagnostic,
} from "../core/sectionValidator";
import {
  repairSection,
  type RepairOptions,
  type RepairResult,
  type RepairRuntimeDeps,
  type ValidationIssue,
} from "../core/repair";
import { shopifyRules } from "../prompts/shopifyRules";

dotenv.config();

export type RepairOutputFormat = "text" | "json";

export interface RepairCliOptions {
  filePath: string;
  write: boolean;
  outputPath?: string;
  format: RepairOutputFormat;
  maxRetries: number;
}

export interface RepairCliRuntimeDeps {
  readFileFn: (filePath: string) => Promise<string>;
  writeFileFn: (filePath: string, content: string) => Promise<void>;
  validateSectionCodeFn: (sectionCode: string) => SectionValidationResult;
  repairSectionFn: typeof repairSection;
  generateCorrectionFn: RepairRuntimeDeps["generateCorrectionFn"];
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_DEPS: RepairCliRuntimeDeps = {
  readFileFn: (filePath) => fs.readFile(filePath, "utf8"),
  writeFileFn: (filePath, content) => fs.writeFile(filePath, content, "utf8"),
  validateSectionCodeFn: validateSectionCode,
  repairSectionFn: repairSection,
  generateCorrectionFn: generateSection,
  log: console.log,
  error: console.error,
};

const DEFAULT_MAX_RETRIES = 2;

function usageText(): string {
  return [
    "Usage:",
    "  npm run repair -- <file-path> [options]",
    "",
    "Options:",
    "  --write                Write repaired code to file",
    "  --output <path>        Output file path (requires --write)",
    "  --output=<path>        Output file path (inline form)",
    "  --format <text|json>   Output format (default: text)",
    "  --format=<text|json>   Output format (inline form)",
    `  --max-retries <n>      Max repair attempts (default: ${DEFAULT_MAX_RETRIES})`,
    "  --max-retries=<n>      Max repair attempts (inline form)",
    "  --help                 Show this help",
  ].join("\n");
}

function readRequiredFlagValue(
  args: string[],
  index: number,
  flag: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.\n\n${usageText()}`);
  }

  return value;
}

function parseInlineFlagValue(arg: string, flag: string): string {
  const value = arg.slice(flag.length + 1);
  if (!value) {
    throw new Error(`Missing value for ${flag}.\n\n${usageText()}`);
  }

  return value;
}

export function parseRepairCliOptions(argv: string[]): RepairCliOptions {
  const args = [...argv];
  let filePath: string | undefined;
  let write = false;
  let outputPath: string | undefined;
  let format: RepairOutputFormat = "text";
  let maxRetries = DEFAULT_MAX_RETRIES;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
      continue;
    }

    if (arg === "--write") {
      write = true;
      continue;
    }

    if (arg === "--output") {
      outputPath = readRequiredFlagValue(args, i, "--output");
      i += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      outputPath = parseInlineFlagValue(arg, "--output");
      continue;
    }

    if (arg === "--format") {
      const formatValue = readRequiredFlagValue(args, i, "--format");
      i += 1;
      if (formatValue === "text" || formatValue === "json") {
        format = formatValue;
        continue;
      }
      throw new Error(
        `Invalid format \"${formatValue}\". Allowed formats: text, json`,
      );
    }

    if (arg.startsWith("--format=")) {
      const formatValue = parseInlineFlagValue(arg, "--format");
      if (formatValue === "text" || formatValue === "json") {
        format = formatValue;
        continue;
      }
      throw new Error(
        `Invalid format \"${formatValue}\". Allowed formats: text, json`,
      );
    }

    if (arg === "--max-retries") {
      const maxRetriesInput = readRequiredFlagValue(args, i, "--max-retries");
      const maxRetriesValue = Number(maxRetriesInput);
      i += 1;
      if (!Number.isInteger(maxRetriesValue) || maxRetriesValue < 1) {
        throw new Error(
          `Invalid max retries "${maxRetriesInput}". Expected an integer >= 1.`,
        );
      }
      maxRetries = maxRetriesValue;
      continue;
    }

    if (arg.startsWith("--max-retries=")) {
      const rawValue = parseInlineFlagValue(arg, "--max-retries");
      const maxRetriesValue = Number(rawValue);
      if (!Number.isInteger(maxRetriesValue) || maxRetriesValue < 1) {
        throw new Error(
          `Invalid max retries \"${rawValue}\". Expected an integer >= 1.`,
        );
      }
      maxRetries = maxRetriesValue;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!filePath) {
    throw new Error(`Missing file path.\n\n${usageText()}`);
  }

  if (!write && outputPath) {
    throw new Error("--output requires --write.");
  }

  return {
    filePath,
    write,
    outputPath,
    format,
    maxRetries,
  };
}

function mapDiagnosticToIssue(
  diagnostic: SectionValidationDiagnostic,
): ValidationIssue {
  return {
    path: diagnostic.path || "section",
    message: diagnostic.message,
    severity: diagnostic.severity,
  };
}

function mapValidationResultToIssues(
  validation: SectionValidationResult,
): ValidationIssue[] {
  const diagnosticIssues = (validation.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.severity === "error")
    .map(mapDiagnosticToIssue);

  if (diagnosticIssues.length > 0) {
    return diagnosticIssues;
  }

  return validation.errors.map((message) => ({
    path: "section",
    message,
    severity: "error" as const,
  }));
}

function resolveOutputPath(options: RepairCliOptions): string {
  if (options.outputPath) {
    return options.outputPath;
  }

  const parsed = path.parse(options.filePath);
  return path.join(
    parsed.dir,
    `${parsed.name}.repaired${parsed.ext || ".liquid"}`,
  );
}

function buildRepairObservabilitySummary(
  initialValidation: SectionValidationResult,
  result: RepairResult,
): {
  initialValidationStatus: "OK" | "FAIL";
  repairAttempted: boolean;
  finalResultUsed: boolean;
  improvementDetected: boolean;
} {
  const initialValidationStatus = initialValidation.isValid ? "OK" : "FAIL";
  const repairAttempted = result.report.attemptCount > 0;
  const finalResultUsed =
    repairAttempted && result.success && typeof result.finalCode === "string";

  return {
    initialValidationStatus,
    repairAttempted,
    finalResultUsed,
    improvementDetected: result.report.improved,
  };
}

function createNoRepairNeededResult(sectionCode: string): RepairResult {
  return {
    success: true,
    finalCode: sectionCode,
    report: {
      initialIssueCount: 0,
      finalIssueCount: 0,
      improved: false,
      attemptCount: 0,
      totalDuration: 0,
      exitReason: "success",
      bestCandidateSelected: false,
      hadRuntimeErrors: false,
    },
    attempts: [],
    lastIssues: [],
  };
}

function printTextReport(
  options: RepairCliOptions,
  initialValidation: SectionValidationResult,
  result: RepairResult,
  deps: Pick<RepairCliRuntimeDeps, "log" | "error">,
): void {
  const summary = buildRepairObservabilitySummary(initialValidation, result);

  deps.log(`Repair report for: ${options.filePath}`);
  deps.log(`Initial validation: ${summary.initialValidationStatus}`);
  deps.log(`Repair attempted: ${summary.repairAttempted ? "yes" : "no"}`);
  deps.log(`Final result used: ${summary.finalResultUsed ? "yes" : "no"}`);
  deps.log(
    `Improvement detected: ${summary.improvementDetected ? "yes" : "no"}`,
  );
  deps.log(`Status: ${result.success ? "SUCCESS" : "FAILED"}`);
  deps.log(
    `Issues: ${result.report.initialIssueCount} -> ${result.report.finalIssueCount}`,
  );
  deps.log(`Improved: ${result.report.improved ? "yes" : "no"}`);
  deps.log(`Attempts: ${result.report.attemptCount}`);
  deps.log(`Duration: ${result.report.totalDuration}ms`);
  deps.log(`Exit reason: ${result.report.exitReason}`);
  deps.log(
    `Runtime errors during attempts: ${result.report.hadRuntimeErrors ? "yes" : "no"}`,
  );

  if (result.lastIssues.length > 0) {
    deps.log("Remaining blocking issues:");
    for (const issue of result.lastIssues) {
      deps.log(`- ${issue.path}: ${issue.message}`);
    }
  }
}

export async function runRepairCli(
  argv: string[],
  deps: RepairCliRuntimeDeps = DEFAULT_DEPS,
): Promise<number> {
  if (argv.includes("--help")) {
    deps.log(usageText());
    return 0;
  }

  let options: RepairCliOptions;
  try {
    options = parseRepairCliOptions(argv);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI error";
    deps.error(message);
    return 2;
  }

  let sectionCode: string;
  try {
    sectionCode = await deps.readFileFn(options.filePath);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown file read error";
    deps.error(`Cannot read file \"${options.filePath}\": ${message}`);
    return 2;
  }

  const initialValidation = deps.validateSectionCodeFn(sectionCode);
  const initialIssues = mapValidationResultToIssues(initialValidation);
  const repairOptions: RepairOptions = {
    maxRetries: options.maxRetries,
    mode: "non-strict",
    sectionType: "custom",
  };
  const repairDeps: RepairRuntimeDeps = {
    validateCandidateFn: (candidateCode) => {
      const validation = deps.validateSectionCodeFn(candidateCode);
      return mapValidationResultToIssues(validation);
    },
    generateCorrectionFn: deps.generateCorrectionFn,
    shopifyRules,
    log: deps.log,
    error: deps.error,
  };

  const result =
    initialIssues.length === 0
      ? createNoRepairNeededResult(sectionCode)
      : await deps.repairSectionFn(
          sectionCode,
          initialIssues,
          repairOptions,
          repairDeps,
        );

  if (options.write && result.success && result.finalCode) {
    const outputPath = resolveOutputPath(options);
    try {
      await deps.writeFileFn(outputPath, result.finalCode);
      deps.log(`Repaired file written to: ${outputPath}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown file write error";
      deps.error(`Cannot write file \"${outputPath}\": ${message}`);
      return 2;
    }
  }

  if (options.format === "json") {
    const observability = buildRepairObservabilitySummary(
      initialValidation,
      result,
    );
    deps.log(
      JSON.stringify(
        {
          reportVersion: 1,
          engine: "repair-v1",
          filePath: options.filePath,
          outputPath:
            options.write && result.success ? resolveOutputPath(options) : null,
          observability,
          ...result,
        },
        null,
        2,
      ),
    );
  } else {
    printTextReport(options, initialValidation, result, deps);
  }

  return result.success ? 0 : 1;
}

if (require.main === module) {
  runRepairCli(process.argv.slice(2)).then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Repair command failed: ${message}`);
      process.exit(2);
    },
  );
}
