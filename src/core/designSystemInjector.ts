import {
  DEFAULT_DESIGN_PROFILE,
  type DesignProfileName,
} from "../prompts/designSystemProfiles";
import { buildDesignSystemRules } from "../prompts/designSystemRules";

export interface DesignSystemOptions {
  enabled?: boolean;
  profile?: DesignProfileName;
}

const DESIGN_SYSTEM_MARKER = "Design System Injector Rules:";

export function injectDesignSystem(
  prompt: string,
  options?: DesignSystemOptions,
): string {
  if (!options?.enabled) {
    return prompt;
  }

  if (prompt.includes(DESIGN_SYSTEM_MARKER)) {
    return prompt;
  }

  const profile = options.profile || DEFAULT_DESIGN_PROFILE;
  const rules = buildDesignSystemRules(profile);

  return `${prompt}\n\n${rules}`;
}
