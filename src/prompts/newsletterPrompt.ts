import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildNewsletterPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify newsletter section with the following capabilities:
- Heading, subheading, and optional incentive text.
- Email signup form compatible with Shopify customer/newsletter flow.
- Success and error message handling scoped to the section.
- Optional background image or color style settings.
- Responsive layout with strong mobile usability.
- Fully configurable schema settings for content and visual options.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
