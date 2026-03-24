import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import OpenAI from "openai";
import * as path from "path";

dotenv.config();

export type DoctorCheckStatus = "pass" | "fail" | "warn";
export type DoctorOutputFormat = "text" | "json";

export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorCheckStatus;
  details: string;
}

export interface DoctorReport {
  checkedAt: string;
  cwd: string;
  model: string;
  isHealthy: boolean;
  summary: {
    pass: number;
    fail: number;
    warn: number;
    total: number;
  };
  checks: DoctorCheck[];
}

export interface DoctorCliOptions {
  model: string;
  format: DoctorOutputFormat;
}

export interface DoctorCliRuntimeDeps {
  cwdFn: () => string;
  getNodeVersionFn: () => string;
  getEnvFn: (name: string) => string | undefined;
  pathExistsFn: (targetPath: string) => Promise<boolean>;
  checkModelAccessFn: (
    apiKey: string,
    model: string,
  ) => Promise<{ ok: boolean; message: string }>;
  nowIsoFn: () => string;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const DEFAULT_DOCTOR_CLI_DEPS: DoctorCliRuntimeDeps = {
  cwdFn: () => process.cwd(),
  getNodeVersionFn: () => process.version,
  getEnvFn: (name: string) => process.env[name],
  pathExistsFn: (targetPath: string) => fs.pathExists(targetPath),
  checkModelAccessFn: async (apiKey: string, model: string) => {
    try {
      const client = new OpenAI({ apiKey });
      await client.responses.create({
        model,
        input: "healthcheck",
        max_output_tokens: 16,
      });
      return {
        ok: true,
        message: `Model \"${model}\" is reachable.`,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown OpenAI error";
      return {
        ok: false,
        message,
      };
    }
  },
  nowIsoFn: () => new Date().toISOString(),
  log: console.log,
  error: console.error,
};

function usageText(): string {
  return [
    "Usage:",
    "  npm run doctor -- [options]",
    "",
    "Options:",
    `  --model <name>      Model to probe (default: ${DEFAULT_MODEL})`,
    "  --model=<name>      Model to probe (inline form)",
    "  --format <text|json> Output format (default: text)",
    "  --format=<text|json> Output format (inline form)",
    "  --help              Show this help",
  ].join("\n");
}

function parseFormatValue(
  input: string | undefined,
): DoctorOutputFormat | null {
  if (!input) {
    return null;
  }

  if (input === "text" || input === "json") {
    return input;
  }

  return null;
}

export function parseDoctorCliOptions(argv: string[]): DoctorCliOptions {
  const args = [...argv];
  let model = DEFAULT_MODEL;
  let format: DoctorOutputFormat = "text";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help") {
      throw new Error(usageText());
    }

    if (arg === "--model") {
      const modelValue = args[i + 1];
      i += 1;
      if (!modelValue || modelValue.startsWith("--")) {
        throw new Error("Missing model name after --model.");
      }
      model = modelValue;
      continue;
    }

    if (arg.startsWith("--model=")) {
      const modelValue = arg.split("=")[1];
      if (!modelValue) {
        throw new Error("Missing model name in --model option.");
      }
      model = modelValue;
      continue;
    }

    if (arg === "--format") {
      const formatValue = args[i + 1];
      i += 1;
      const parsedFormat = parseFormatValue(formatValue);
      if (parsedFormat) {
        format = parsedFormat;
        continue;
      }

      throw new Error(
        `Invalid format \"${formatValue}\". Allowed formats: text, json`,
      );
    }

    if (arg.startsWith("--format=")) {
      const formatValue = arg.split("=")[1];
      const parsedFormat = parseFormatValue(formatValue);
      if (parsedFormat) {
        format = parsedFormat;
        continue;
      }

      throw new Error(
        `Invalid format \"${formatValue}\". Allowed formats: text, json`,
      );
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    model,
    format,
  };
}

function parseNodeMajorVersion(version: string): number | null {
  const match = /^v(\d+)/.exec(version.trim());
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  if (!Number.isInteger(major)) {
    return null;
  }

  return major;
}

function summarizeChecks(checks: DoctorCheck[]): DoctorReport["summary"] {
  const pass = checks.filter((check) => check.status === "pass").length;
  const fail = checks.filter((check) => check.status === "fail").length;
  const warn = checks.filter((check) => check.status === "warn").length;

  return {
    pass,
    fail,
    warn,
    total: checks.length,
  };
}

function formatCheckStatus(status: DoctorCheckStatus): string {
  if (status === "pass") {
    return "PASS";
  }

  if (status === "fail") {
    return "FAIL";
  }

  return "WARN";
}

function printReport(
  report: DoctorReport,
  deps: Pick<DoctorCliRuntimeDeps, "log" | "error">,
): void {
  const print = report.summary.fail > 0 ? deps.error : deps.log;

  print(`Doctor report (${report.checkedAt})`);
  print(`Working directory: ${report.cwd}`);
  print(`Model probe: ${report.model}`);
  print("");

  for (const check of report.checks) {
    print(`[${formatCheckStatus(check.status)}] ${check.id} - ${check.label}`);
    print(`  ${check.details}`);
  }

  print("");
  print(
    `Summary: ${report.summary.pass} pass, ${report.summary.fail} fail, ${report.summary.warn} warn, ${report.summary.total} total.`,
  );
}

async function evaluateChecks(
  options: DoctorCliOptions,
  deps: DoctorCliRuntimeDeps,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const cwd = deps.cwdFn();

  const apiKey = deps.getEnvFn("OPENAI_API_KEY");
  if (!apiKey || !apiKey.trim()) {
    checks.push({
      id: "env.openai_api_key",
      label: "OPENAI_API_KEY presence",
      status: "fail",
      details: "OPENAI_API_KEY is missing.",
    });
    checks.push({
      id: "openai.model_access",
      label: "OpenAI model access",
      status: "fail",
      details: "Model access check skipped because OPENAI_API_KEY is missing.",
    });
  } else {
    checks.push({
      id: "env.openai_api_key",
      label: "OPENAI_API_KEY presence",
      status: "pass",
      details: "OPENAI_API_KEY is configured.",
    });

    const modelAccess = await deps.checkModelAccessFn(apiKey, options.model);
    checks.push({
      id: "openai.model_access",
      label: "OpenAI model access",
      status: modelAccess.ok ? "pass" : "fail",
      details: modelAccess.ok
        ? `Model \"${options.model}\" is reachable.`
        : `Model probe failed: ${modelAccess.message}`,
    });
  }

  const nodeVersion = deps.getNodeVersionFn();
  const nodeMajor = parseNodeMajorVersion(nodeVersion);
  if (nodeMajor === null) {
    checks.push({
      id: "runtime.node_version",
      label: "Node.js version",
      status: "warn",
      details: `Unable to parse Node.js version string \"${nodeVersion}\".`,
    });
  } else if (nodeMajor >= 20) {
    checks.push({
      id: "runtime.node_version",
      label: "Node.js version",
      status: "pass",
      details: `Node.js ${nodeVersion} is compatible (>= 20).`,
    });
  } else {
    checks.push({
      id: "runtime.node_version",
      label: "Node.js version",
      status: "fail",
      details: `Node.js ${nodeVersion} is not compatible. Required: >= 20.`,
    });
  }

  const outputPath = path.join(cwd, "output");
  const outputExists = await deps.pathExistsFn(outputPath);
  checks.push({
    id: "fs.output_dir",
    label: "output directory",
    status: outputExists ? "pass" : "fail",
    details: outputExists
      ? "output directory exists."
      : "output directory is missing.",
  });

  const outputSectionsPath = path.join(cwd, "output", "sections");
  const outputSectionsExists = await deps.pathExistsFn(outputSectionsPath);
  checks.push({
    id: "fs.output_sections_dir",
    label: "output/sections directory",
    status: outputSectionsExists ? "pass" : "fail",
    details: outputSectionsExists
      ? "output/sections directory exists."
      : "output/sections directory is missing.",
  });

  const expectedConfigFiles = [
    "package.json",
    "tsconfig.json",
    "README.md",
    path.join(".github", "workflows", "ci.yml"),
  ];

  for (const relativePath of expectedConfigFiles) {
    const absolutePath = path.join(cwd, relativePath);
    const exists = await deps.pathExistsFn(absolutePath);
    checks.push({
      id: `config.${relativePath.replace(/[\\/]/g, "_")}`,
      label: `Expected config file: ${relativePath}`,
      status: exists ? "pass" : "fail",
      details: exists
        ? `${relativePath} is present.`
        : `${relativePath} is missing.`,
    });
  }

  return checks;
}

export async function buildDoctorReport(
  options: DoctorCliOptions,
  deps: DoctorCliRuntimeDeps = DEFAULT_DOCTOR_CLI_DEPS,
): Promise<DoctorReport> {
  const checks = await evaluateChecks(options, deps);
  const summary = summarizeChecks(checks);

  return {
    checkedAt: deps.nowIsoFn(),
    cwd: deps.cwdFn(),
    model: options.model,
    isHealthy: summary.fail === 0,
    summary,
    checks,
  };
}

export async function runDoctorCli(
  argv: string[],
  deps: DoctorCliRuntimeDeps = DEFAULT_DOCTOR_CLI_DEPS,
): Promise<number> {
  let options: DoctorCliOptions;

  try {
    options = parseDoctorCliOptions(argv);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI parsing error";
    deps.error(message);
    return 2;
  }

  const report = await buildDoctorReport(options, deps);

  if (options.format === "json") {
    deps.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report, deps);
  }

  return report.isHealthy ? 0 : 1;
}

if (require.main === module) {
  runDoctorCli(process.argv.slice(2)).then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Doctor command failed: ${message}`);
      process.exit(2);
    },
  );
}
