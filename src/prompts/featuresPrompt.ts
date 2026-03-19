import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildFeaturesPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify features section with the following capabilities:
- Feature blocks with icon/image, title, and description.
- Optional heading and subheading.
- Configurable columns/grid layout.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for section options and feature blocks.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
