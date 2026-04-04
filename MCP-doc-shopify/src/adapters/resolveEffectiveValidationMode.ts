import type { ValidationMode } from "../core/validation/reportTypes.js";

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

function envForcesReportOnly(env: NodeJS.ProcessEnv): boolean {
  const raw = env.VALIDATION_FORCE_REPORT_ONLY;
  if (!raw) {
    return false;
  }

  return TRUTHY_ENV_VALUES.has(raw.trim().toLowerCase());
}

export interface EffectiveValidationModeResolution {
  requestedMode: ValidationMode;
  effectiveMode: ValidationMode;
  forcedByConfig: boolean;
}

export function resolveEffectiveValidationMode(input?: {
  requestedMode?: ValidationMode;
  env?: NodeJS.ProcessEnv;
}): EffectiveValidationModeResolution {
  const requestedMode = input?.requestedMode ?? "full";
  const env = input?.env ?? process.env;
  const forcedByConfig = envForcesReportOnly(env);

  return {
    requestedMode,
    effectiveMode: forcedByConfig ? "report-only" : requestedMode,
    forcedByConfig,
  };
}
