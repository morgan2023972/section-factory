import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildFeaturedProductPrompt(
  options?: BasePromptOptions,
): string {
  return `${buildBasePrompt(options)}

Build a Shopify featured product section with the following capabilities:
- Product picker setting to select one product.
- Product image, title, price, and short description.
- Optional product badges (sale/new/limited).
- Primary CTA linking to the selected product.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for content, style, and CTA.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
