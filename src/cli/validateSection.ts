import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import {
  validateSectionCode,
  type SectionValidationResult,
} from "../core/sectionValidator";
import {
  DESIGN_PROFILE_NAMES,
  resolveDesignProfileName,
} from "../prompts/designSystemProfiles";

dotenv.config();

export type ValidateOutputFormat = "text" | "json";
export type ValidateMode = "strict" | "non-strict";

export interface ValidateCliOptions {
  filePath: string;
  designSystemEnabled: boolean;
  profile?: string;
  format: ValidateOutputFormat;
  mode: ValidateMode;
}

export interface ValidationDiagnostic {
  source: "shopify-validator-v1";
  ruleId: string;
  path: string;
  severity: "error" | "warning";
  message: string;
  suggestion: string | null;
}

export interface ValidationReport {
  reportVersion: 2;
  reportSchemaVersion: "1.1.0";
  engine: "regex-v1";
  mode: ValidateMode;
  filePath: string;
  isValid: boolean;
  summary: {
    errors: number;
    warnings: number;
    total: number;
  };
  diagnostics: ValidationDiagnostic[];
}

export interface ValidateCliRuntimeDeps {
  readFileFn: (filePath: string) => Promise<string>;
  validateSectionCodeFn: (
    sectionCode: string,
    options?: { designSystemEnabled?: boolean },
  ) => SectionValidationResult;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_VALIDATE_CLI_DEPS: ValidateCliRuntimeDeps = {
  readFileFn: (filePath: string) => fs.readFile(filePath, "utf8"),
  validateSectionCodeFn: validateSectionCode,
  log: console.log,
  error: console.error,
};

function usageText(): string {
  return [
    "Usage:",
    "  npm run validate -- <file-path> [options]",
    "",
    "Options:",
    "  --design-system          Enable design-system validation rules",
    "  --profile <name>         Profile name (minimal, luxury, editorial, conversion, playful, tech)",
    "  --profile=<name>         Profile name (inline form)",
    "  --mode <strict|non-strict> Validation mode (default: strict)",
    "  --mode=<strict|non-strict> Validation mode (inline form)",
    "  --strict                 Shortcut for --mode strict",
    "  --non-strict             Shortcut for --mode non-strict",
    "  --format <text|json>     Output format (default: text)",
    "  --format=<text|json>     Output format (inline form)",
    "  --help                   Show this help",
  ].join("\n");
}

function parseModeValue(input: string | undefined): ValidateMode | null {
  if (!input) {
    return null;
  }

  if (input === "strict" || input === "non-strict") {
    return input;
  }

  return null;
}

export function parseValidateCliOptions(argv: string[]): ValidateCliOptions {
  const args = [...argv];
  let filePath: string | undefined;
  let designSystemEnabled = false;
  let profileInput: string | undefined;
  let format: ValidateOutputFormat = "text";
  let mode: ValidateMode = "strict";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help") {
      throw new Error(usageText());
    }

    if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
      continue;
    }

    if (arg === "--design-system") {
      designSystemEnabled = true;
      continue;
    }

    if (arg === "--strict") {
      mode = "strict";
      continue;
    }

    if (arg === "--non-strict") {
      mode = "non-strict";
      continue;
    }

    if (arg === "--mode") {
      const modeValue = args[i + 1];
      i += 1;
      const parsedMode = parseModeValue(modeValue);
      if (parsedMode) {
        mode = parsedMode;
        continue;
      }

      throw new Error(
        `Invalid mode \"${modeValue}\". Allowed modes: strict, non-strict`,
      );
    }

    if (arg.startsWith("--mode=")) {
      const modeValue = arg.split("=")[1];
      const parsedMode = parseModeValue(modeValue);
      if (parsedMode) {
        mode = parsedMode;
        continue;
      }

      throw new Error(
        `Invalid mode \"${modeValue}\". Allowed modes: strict, non-strict`,
      );
    }

    if (arg === "--profile") {
      profileInput = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--profile=")) {
      profileInput = arg.split("=")[1];
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

  if (profileInput) {
    designSystemEnabled = true;
  }

  let profile: string | undefined;
  if (profileInput) {
    const resolvedProfile = resolveDesignProfileName(profileInput);
    if (!resolvedProfile) {
      const allowedProfiles = DESIGN_PROFILE_NAMES.join(", ");
      throw new Error(
        `Invalid design profile \"${profileInput}\". Allowed profiles: ${allowedProfiles}`,
      );
    }
    profile = resolvedProfile;
  }

  return {
    filePath,
    designSystemEnabled,
    profile,
    format,
    mode,
  };
}

function mapErrorToDiagnostic(error: string): ValidationDiagnostic {
  const normalized = error.trim();

  if (normalized.includes("Section code is empty.")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "structure.empty_section",
      path: "section",
      severity: "error",
      message: normalized,
      suggestion: "Provide non-empty section code before validation.",
    };
  }

  if (normalized.includes("Missing Shopify schema tags")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.missing_tags",
      path: "schema",
      severity: "error",
      message: normalized,
      suggestion: "Add a {% schema %} ... {% endschema %} block.",
    };
  }

  if (normalized.includes("Schema JSON is invalid")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.invalid_json",
      path: "schema",
      severity: "error",
      message: normalized,
      suggestion: "Fix JSON syntax inside the schema block.",
    };
  }

  if (normalized.includes("Schema must include a non-empty name")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.name_required",
      path: "schema.name",
      severity: "error",
      message: normalized,
      suggestion: 'Define a non-empty "name" in schema JSON.',
    };
  }

  if (normalized.includes("Schema must include a settings array")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.settings_array_required",
      path: "schema.settings",
      severity: "error",
      message: normalized,
      suggestion: 'Define "settings" as an array in schema JSON.',
    };
  }

  if (normalized.includes("Schema must include a blocks array")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.blocks_array_required",
      path: "schema.blocks",
      severity: "error",
      message: normalized,
      suggestion: 'Define "blocks" as an array in schema JSON.',
    };
  }

  if (normalized.includes("Schema must include a presets array")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.presets_array_required",
      path: "schema.presets",
      severity: "error",
      message: normalized,
      suggestion: 'Define "presets" as an array in schema JSON.',
    };
  }

  if (
    normalized.includes(
      "Section is not configurable: schema settings and blocks are both empty.",
    )
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "schema.not_configurable",
      path: "schema",
      severity: "error",
      message: normalized,
      suggestion:
        "Add at least one setting or block to make the section configurable.",
    };
  }

  if (normalized.includes("CSS must use section.id for scoping")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "css.section_id_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Use section.id in scoped CSS selectors.",
    };
  }

  if (normalized.includes("CSS must be scoped with")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "css.scope_selector_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Scope CSS under .section-{{ section.id }}.",
    };
  }

  if (normalized.includes("Global CSS selectors are not allowed")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "css.global_selector",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Replace global selectors with section-scoped selectors.",
    };
  }

  if (normalized.includes("Global JS access via document")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "js.global_document_access",
      path: "script",
      severity: "error",
      message: normalized,
      suggestion: "Query from the section root instead of global document.",
    };
  }

  if (normalized.includes("Global JS access is not allowed")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "js.global_access",
      path: "script",
      severity: "error",
      message: normalized,
      suggestion: "Avoid window/global event handlers outside section scope.",
    };
  }

  if (
    normalized.includes("Mobile UX issue: missing responsive @media rules.")
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "ux.mobile_missing_media_rules",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Add responsive CSS overrides for mobile breakpoints.",
    };
  }

  if (
    normalized.includes("Mobile UX issue: fixed large pixel widths detected.")
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "ux.mobile_fixed_large_widths",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion:
        "Replace large fixed pixel widths with fluid or responsive sizing.",
    };
  }

  if (
    normalized.includes(
      "Mobile UX issue: multi-column grid without mobile max-width override.",
    )
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "ux.mobile_grid_missing_max_width_override",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion:
        "Add a mobile max-width media override for multi-column grids.",
    };
  }

  if (normalized.includes("Section is too complex")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "complexity.threshold_exceeded",
      path: "section",
      severity: "error",
      message: normalized,
      suggestion: "Reduce markup, CSS, or JavaScript complexity.",
    };
  }

  if (normalized.includes("Missing CSS style block for design system rules.")) {
    return {
      source: "shopify-validator-v1",
      ruleId: "design_system.missing_style_block",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Add a style block with section-scoped design system rules.",
    };
  }

  if (
    normalized.includes(
      "Design system expects responsive CSS using @media rules.",
    )
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "design_system.responsive_media_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Add responsive @media rules aligned with the design system.",
    };
  }

  if (
    normalized.includes("Design system expects animation or transition rules.")
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "design_system.motion_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion:
        "Add transition, animation, or keyframes rules per design system.",
    };
  }

  if (
    normalized.includes(
      "Design system expects CSS tokens via custom properties.",
    )
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "design_system.tokens_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Use CSS custom properties for design system tokens.",
    };
  }

  if (
    normalized.includes(
      "Design system expects button styling scoped under .section-{{ section.id }}.",
    )
  ) {
    return {
      source: "shopify-validator-v1",
      ruleId: "design_system.button_scoping_required",
      path: "style",
      severity: "error",
      message: normalized,
      suggestion: "Scope button styling under .section-{{ section.id }}.",
    };
  }

  return {
    source: "shopify-validator-v1",
    ruleId: "validation.unknown",
    path: "section",
    severity: "error",
    message: normalized,
    suggestion: null,
  };
}

const NON_STRICT_WARNING_RULE_IDS = new Set<string>([
  "ux.mobile_missing_media_rules",
  "ux.mobile_fixed_large_widths",
  "ux.mobile_grid_missing_max_width_override",
  "complexity.threshold_exceeded",
]);

function applyValidationMode(
  diagnostics: ValidationDiagnostic[],
  mode: ValidateMode,
): ValidationDiagnostic[] {
  if (mode === "strict") {
    return diagnostics;
  }

  return diagnostics.map((diagnostic) => {
    if (!NON_STRICT_WARNING_RULE_IDS.has(diagnostic.ruleId)) {
      return diagnostic;
    }

    return {
      ...diagnostic,
      severity: "warning",
    };
  });
}

export function buildValidationReport(
  filePath: string,
  validation: SectionValidationResult,
  mode: ValidateMode,
): ValidationReport {
  const diagnostics = applyValidationMode(
    validation.errors.map((error) => mapErrorToDiagnostic(error)),
    mode,
  );
  const errorCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;
  const warningCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  ).length;

  return {
    reportVersion: 2,
    reportSchemaVersion: "1.1.0",
    engine: "regex-v1",
    mode,
    filePath,
    isValid: errorCount === 0,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      total: diagnostics.length,
    },
    diagnostics,
  };
}

function printTextReport(
  report: ValidationReport,
  deps: Pick<ValidateCliRuntimeDeps, "log" | "error">,
): void {
  const print = report.isValid ? deps.log : deps.error;

  if (report.isValid) {
    print(`Validation passed for: ${report.filePath}`);
  } else {
    print(`Validation failed for: ${report.filePath}`);
  }

  print(
    `Summary: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.total} diagnostic(s).`,
  );

  if (report.diagnostics.length === 0) {
    return;
  }

  print("Diagnostics:");
  for (let index = 0; index < report.diagnostics.length; index += 1) {
    const diagnostic = report.diagnostics[index];
    print(
      `${index + 1}. [${diagnostic.severity}] ${diagnostic.ruleId} @ ${diagnostic.path} - ${diagnostic.message}`,
    );
    if (diagnostic.suggestion) {
      print(`   suggestion: ${diagnostic.suggestion}`);
    }
  }
}

export async function runValidateCli(
  argv: string[],
  deps: ValidateCliRuntimeDeps = DEFAULT_VALIDATE_CLI_DEPS,
): Promise<number> {
  let options: ValidateCliOptions;

  try {
    options = parseValidateCliOptions(argv);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI parsing error";
    deps.error(message);
    return 2;
  }

  let fileContent: string;
  try {
    fileContent = await deps.readFileFn(options.filePath);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown file read error";
    deps.error(`Cannot read file \"${options.filePath}\": ${message}`);
    return 2;
  }

  const validation = deps.validateSectionCodeFn(fileContent, {
    designSystemEnabled: options.designSystemEnabled,
  });
  const report = buildValidationReport(
    options.filePath,
    validation,
    options.mode,
  );

  if (options.format === "json") {
    deps.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report, deps);
  }

  return report.isValid ? 0 : 1;
}

if (require.main === module) {
  runValidateCli(process.argv.slice(2)).then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Validation command failed: ${message}`);
      process.exit(2);
    },
  );
}
