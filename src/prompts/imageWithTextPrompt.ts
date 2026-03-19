import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildImageWithTextPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify image with text section with the following capabilities:
- Main image setting with optional mobile image override.
- Heading, rich text, and optional eyebrow label.
- Primary and secondary CTA buttons.
- Configurable image position (left/right) and content alignment.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for media, content, and actions.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
