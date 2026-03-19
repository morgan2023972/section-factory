import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildProductGridPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify product grid section with the following capabilities:
- Product source from collection setting.
- Configurable number of products to show.
- Product cards with image, title, price, and optional compare-at price.
- Optional quick action button per card.
- Responsive grid behavior for desktop, tablet, and mobile.
- Fully configurable schema settings for layout, spacing, and card elements.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
