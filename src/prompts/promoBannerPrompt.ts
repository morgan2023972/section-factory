import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildPromoBannerPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify promo banner section with the following capabilities:
- Promotional message with optional countdown or urgency label.
- Optional icon/image support.
- Primary CTA with configurable text and URL.
- Optional dismissible behavior scoped to this section instance.
- Responsive layout with clear CTA visibility on mobile.
- Fully configurable schema settings for text, colors, and actions.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
