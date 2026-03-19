import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildFaqPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify FAQ section with the following capabilities:
- Question and answer blocks.
- Optional section title and introduction text.
- Expand/collapse behavior scoped to the section instance.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for section fields and FAQ blocks.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
