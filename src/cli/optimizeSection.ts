import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as path from "path";
import {
  optimizeSection,
  type OptimizationOptions,
  type OptimizationResult,
} from "../core/sectionOptimizer";

dotenv.config();

export type OptimizeOutputFormat = "text" | "json";

export interface OptimizeCliOptions {
  filePath: string;
  write: boolean;
  outputPath?: string;
  format: OptimizeOutputFormat;
  optimizer: OptimizationOptions;
}

export interface OptimizeCliRuntimeDeps {
  readFileFn: (filePath: string) => Promise<string>;
  writeFileFn: (filePath: string, content: string) => Promise<void>;
  optimizeSectionFn: (
    sectionCode: string,
    options?: OptimizationOptions,
  ) => OptimizationResult;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_DEPS: OptimizeCliRuntimeDeps = {
  readFileFn: (filePath) => fs.readFile(filePath, "utf8"),
  writeFileFn: (filePath, content) => fs.writeFile(filePath, content, "utf8"),
  optimizeSectionFn: optimizeSection,
  log: console.log,
  error: console.error,
};

function usageText(): string {
  return [
    "Usage:",
    "  npm run optimize -- <file-path> [options]",
    "",
    "Options:",
    "  --cleanup                Enable cleanup optimization",
    "  --patterns               Enable reusability pattern suggestions",
    "  --minify                 Enable conservative minification",
    "  --safety                 Enable cross-theme safety audit",
    "  --size-threshold <num>   Minimum size gain (%) for size success",
    "  --size-threshold=<num>   Minimum size gain (%) (inline form)",
    "  --write                  Write optimized result to disk",
    "  --output <path>          Output file path when --write is used",
    "  --output=<path>          Output file path (inline form)",
    "  --format <text|json>     Output format (default: text)",
    "  --format=<text|json>     Output format (inline form)",
    "  --help                   Show this help",
  ].join("\n");
}

export function parseOptimizeCliOptions(argv: string[]): OptimizeCliOptions {
  const args = [...argv];
  let filePath: string | undefined;
  let write = false;
  let outputPath: string | undefined;
  let format: OptimizeOutputFormat = "text";
  const optimizer: OptimizationOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help") {
      throw new Error(usageText());
    }

    if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
      continue;
    }

    if (arg === "--cleanup") {
      optimizer.cleanup = true;
      continue;
    }

    if (arg === "--patterns") {
      optimizer.patterns = true;
      continue;
    }

    if (arg === "--minify") {
      optimizer.minify = true;
      continue;
    }

    if (arg === "--safety") {
      optimizer.crossThemeSafety = true;
      continue;
    }

    if (arg === "--write") {
      write = true;
      continue;
    }

    if (arg === "--size-threshold") {
      const value = Number(args[i + 1]);
      i += 1;
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `Invalid size threshold "${args[i]}". Expected a non-negative number.`,
        );
      }
      optimizer.sizeGainThresholdPercent = Number(value.toFixed(2));
      continue;
    }

    if (arg.startsWith("--size-threshold=")) {
      const rawValue = arg.split("=")[1];
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `Invalid size threshold "${rawValue}". Expected a non-negative number.`,
        );
      }
      optimizer.sizeGainThresholdPercent = Number(value.toFixed(2));
      continue;
    }

    if (arg === "--output") {
      outputPath = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--output=")) {
      outputPath = arg.split("=")[1];
      continue;
    }

    if (arg === "--format") {
      const formatValue = args[i + 1];
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
      const formatValue = arg.split("=")[1];
      if (formatValue === "text" || formatValue === "json") {
        format = formatValue;
        continue;
      }
      throw new Error(
        `Invalid format \"${formatValue}\". Allowed formats: text, json`,
      );
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!filePath) {
    throw new Error(`Missing file path.\n\n${usageText()}`);
  }

  const hasExplicitOptimizerFlag = Object.keys(optimizer).length > 0;
  if (!hasExplicitOptimizerFlag) {
    optimizer.cleanup = true;
    optimizer.patterns = true;
    optimizer.minify = true;
    optimizer.crossThemeSafety = true;
  }

  return {
    filePath,
    write,
    outputPath,
    format,
    optimizer,
  };
}

function printTextReport(
  result: OptimizationResult,
  options: OptimizeCliOptions,
  deps: Pick<OptimizeCliRuntimeDeps, "log" | "error">,
): void {
  deps.log(`Optimization report for: ${options.filePath}`);
  deps.log(
    `Size: ${result.originalSize} -> ${result.optimizedSize} bytes (${result.sizeDeltaPercent}%)`,
  );
  deps.log(`Changes: ${result.optimizations.length}`);
  deps.log(`Suggestions: ${result.suggestions.length}`);
  deps.log(`Safety issues: ${result.safetyIssues.length}`);
  deps.log("Success criteria:");
  deps.log(
    `- Size: ${result.successCriteria.size.passed ? "PASS" : "FAIL"} (gain ${result.successCriteria.size.gainPercent}% / threshold ${result.successCriteria.size.thresholdPercent}%)`,
  );
  deps.log(
    `- Safety: ${result.successCriteria.safety.passed ? "PASS" : "FAIL"} (risky patterns ${result.successCriteria.safety.riskyPatternsBefore} -> ${result.successCriteria.safety.riskyPatternsAfter})`,
  );
  deps.log(
    `- Structure: ${result.successCriteria.structure.passed ? "PASS" : "FAIL"} (conformity rules applied: ${result.successCriteria.structure.conformityRulesApplied})`,
  );

  if (result.optimizations.length > 0) {
    deps.log("Optimization changes:");
    for (const [index, change] of result.optimizations.entries()) {
      deps.log(
        `${index + 1}. [${change.type}] ${change.location} - ${change.description}`,
      );
    }
  }

  if (result.suggestions.length > 0) {
    deps.log("Suggestions:");
    for (const [index, suggestion] of result.suggestions.entries()) {
      deps.log(`${index + 1}. [${suggestion.type}] ${suggestion.message}`);
    }
  }

  if (result.safetyIssues.length > 0) {
    deps.error("Safety issues:");
    for (const [index, issue] of result.safetyIssues.entries()) {
      deps.error(
        `${index + 1}. [${issue.severity}] ${issue.category} @ ${issue.location} - ${issue.description}`,
      );
      if (issue.fix) {
        deps.error(`   fix: ${issue.fix}`);
      }
    }
  }
}

function resolveOutputPath(options: OptimizeCliOptions): string {
  if (options.outputPath) {
    return options.outputPath;
  }

  const parsed = path.parse(options.filePath);
  return path.join(
    parsed.dir,
    `${parsed.name}.optimized${parsed.ext || ".liquid"}`,
  );
}

export async function runOptimizeCli(
  argv: string[],
  deps: OptimizeCliRuntimeDeps = DEFAULT_DEPS,
): Promise<number> {
  let options: OptimizeCliOptions;
  try {
    options = parseOptimizeCliOptions(argv);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI parsing error";
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

  const result = deps.optimizeSectionFn(sectionCode, options.optimizer);

  if (options.write) {
    const outputPath = resolveOutputPath(options);
    try {
      await deps.writeFileFn(outputPath, result.optimizedCode);
      deps.log(`Optimized file written to: ${outputPath}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown file write error";
      deps.error(`Cannot write file \"${outputPath}\": ${message}`);
      return 2;
    }
  }

  if (options.format === "json") {
    deps.log(
      JSON.stringify(
        {
          reportVersion: 1,
          engine: "section-optimizer-mvp",
          mode: options.write ? "write" : "report-only",
          filePath: options.filePath,
          outputPath: options.write ? resolveOutputPath(options) : null,
          ...result,
        },
        null,
        2,
      ),
    );
  } else {
    printTextReport(result, options, deps);
  }

  const hasHighSafetyIssue = result.safetyIssues.some(
    (issue) => issue.severity === "high",
  );
  return hasHighSafetyIssue ? 1 : 0;
}

if (require.main === module) {
  runOptimizeCli(process.argv.slice(2)).then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Optimize command failed: ${message}`);
      process.exit(2);
    },
  );
}
