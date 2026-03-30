import * as fs from "fs-extra";
import * as path from "path";
import { type AstValidationPhase } from "./ruleRouter";

export type AstRuleSeverity = "off" | "warning" | "error" | "auto";

export interface AstRulePolicy {
  advisory?: AstRuleSeverity;
  warn?: AstRuleSeverity;
  block?: AstRuleSeverity;
}

export interface AstRulePolicySnapshot {
  configPath: string;
  loadedFromEnv: boolean;
  policies: Record<string, AstRulePolicy>;
}

const DEFAULT_AST_RULE_POLICY: Required<AstRulePolicy> = {
  advisory: "warning",
  warn: "warning",
  block: "auto",
};

export const AST_RULE_CONFIG_ENV_VAR = "SECTION_FACTORY_AST_RULE_CONFIG";
export const DEFAULT_AST_RULE_CONFIG_PATH = path.join(
  "config",
  "ast-rule-policies.json",
);

const BUILTIN_AST_RULE_POLICIES: Record<string, AstRulePolicy> = {
  "ast.css.section_id_required": {
    block: "error",
  },
  "ast.css.scope_selector_required": {
    block: "error",
  },
  "ast.js.global_document_access": {
    block: "error",
  },
  "ast.js.global_window_access": {
    block: "error",
  },
  "ast.js.global_add_event_listener": {
    block: "warning",
  },
  "ast.css.global_selector": {
    block: "warning",
  },
  "ast.css.parse_failure": {
    block: "warning",
  },
  "ast.js.parse_failure": {
    block: "warning",
  },
  "ast.a11y.heading_missing": {
    block: "warning",
  },
  "ast.a11y.image_alt_missing": {
    block: "warning",
  },
};

const VALID_SEVERITIES: AstRuleSeverity[] = ["off", "warning", "error", "auto"];

let cachedConfigPath: string | null = null;
let cachedPolicies: Record<string, AstRulePolicy> | null = null;

function isAstRuleSeverity(value: unknown): value is AstRuleSeverity {
  return (
    typeof value === "string" &&
    VALID_SEVERITIES.includes(value as AstRuleSeverity)
  );
}

function sanitizeAstRulePolicies(
  input: unknown,
): Record<string, AstRulePolicy> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const sanitized: Record<string, AstRulePolicy> = {};
  const rawEntries = Object.entries(input as Record<string, unknown>);

  for (const [ruleId, rawPolicy] of rawEntries) {
    if (!rawPolicy || typeof rawPolicy !== "object") {
      continue;
    }

    const candidate = rawPolicy as Record<string, unknown>;
    const policy: AstRulePolicy = {};

    if (isAstRuleSeverity(candidate.advisory)) {
      policy.advisory = candidate.advisory;
    }

    if (isAstRuleSeverity(candidate.warn)) {
      policy.warn = candidate.warn;
    }

    if (isAstRuleSeverity(candidate.block)) {
      policy.block = candidate.block;
    }

    if (Object.keys(policy).length > 0) {
      sanitized[ruleId] = policy;
    }
  }

  return sanitized;
}

function resolveRuntimeConfigPath(): string {
  const fromEnv = process.env[AST_RULE_CONFIG_ENV_VAR]?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  return path.resolve(process.cwd(), DEFAULT_AST_RULE_CONFIG_PATH);
}

function loadRuntimeOverrides(
  configPath: string,
): Record<string, AstRulePolicy> {
  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const raw = fs.readJsonSync(configPath);
    return sanitizeAstRulePolicies(raw);
  } catch {
    // Keep builtin defaults if external config is missing or invalid.
    return {};
  }
}

function mergePolicies(
  basePolicies: Record<string, AstRulePolicy>,
  overridePolicies: Record<string, AstRulePolicy>,
): Record<string, AstRulePolicy> {
  const merged: Record<string, AstRulePolicy> = { ...basePolicies };

  for (const [ruleId, override] of Object.entries(overridePolicies)) {
    merged[ruleId] = {
      ...(merged[ruleId] ?? {}),
      ...override,
    };
  }

  return merged;
}

function getEffectivePolicies(): Record<string, AstRulePolicy> {
  const configPath = resolveRuntimeConfigPath();

  if (cachedPolicies && cachedConfigPath === configPath) {
    return cachedPolicies;
  }

  const runtimeOverrides = loadRuntimeOverrides(configPath);
  cachedPolicies = mergePolicies(BUILTIN_AST_RULE_POLICIES, runtimeOverrides);
  cachedConfigPath = configPath;

  return cachedPolicies;
}

export function getAstRulePolicySnapshot(): AstRulePolicySnapshot {
  const configPath = resolveRuntimeConfigPath();
  return {
    configPath,
    loadedFromEnv: Boolean(process.env[AST_RULE_CONFIG_ENV_VAR]?.trim()),
    policies: getEffectivePolicies(),
  };
}

export function resetAstRulePolicyCacheForTests(): void {
  cachedConfigPath = null;
  cachedPolicies = null;
}

export function resolveAstRuleSeverity(
  ruleId: string,
  phase: Exclude<AstValidationPhase, "off">,
): AstRuleSeverity {
  const effectivePolicies = getEffectivePolicies();
  const rulePolicy = effectivePolicies[ruleId];

  if (phase === "advisory") {
    return rulePolicy?.advisory ?? DEFAULT_AST_RULE_POLICY.advisory;
  }

  if (phase === "warn") {
    return rulePolicy?.warn ?? DEFAULT_AST_RULE_POLICY.warn;
  }

  return rulePolicy?.block ?? DEFAULT_AST_RULE_POLICY.block;
}
