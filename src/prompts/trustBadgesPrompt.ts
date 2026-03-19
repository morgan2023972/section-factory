import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildTrustBadgesPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify trust badges section with the following capabilities:
- Badge blocks with icon/image, title, and supporting text.
- Optional heading and introduction.
- Configurable columns and alignment.
- Accessible visual hierarchy and icon sizing.
- Responsive layout with stacked badges on smaller screens.
- Fully configurable schema settings for section and badge blocks.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
