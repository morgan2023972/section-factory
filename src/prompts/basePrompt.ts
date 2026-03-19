import {
  type DesignSystemOptions,
  injectDesignSystem,
} from "../core/designSystemInjector";
import { shopifyRules } from "./shopifyRules";

export interface BasePromptOptions {
  designSystem?: DesignSystemOptions;
}

export function buildBasePrompt(options?: BasePromptOptions): string {
  const basePrompt = `You are an expert Shopify section developer.

Generate a complete Shopify section file.

Requirements:
- Include HTML, Liquid, CSS, JavaScript, and {% schema %}.
- Ensure the section is fully independent and reusable.
- Encapsulate all CSS using the section wrapper class: .section-{{ section.id }}.
- Encapsulate all JavaScript so it only targets the current section instance.
- Output only the final section code with no explanations, markdown, or extra text.

${shopifyRules}`;

  return injectDesignSystem(basePrompt, options?.designSystem);
}
