import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildBeforeAfterPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify before/after section with the following capabilities:
- Before and after image settings.
- Interactive comparison slider scoped to the section instance.
- Optional labels and explanatory text.
- Touch-friendly controls for mobile.
- Responsive media container with stable aspect ratio.
- Fully configurable schema settings for images, labels, and interaction.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
