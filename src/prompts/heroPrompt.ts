import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildHeroPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify hero section with the following capabilities:
- Background image support.
- Heading content.
- Subheading content.
- CTA button with text and link.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for all hero content and behavior.

Ensure the generated code includes meaningful defaults in schema settings.
If JavaScript is included, scope it with:
const root = document.currentScript?.closest('.section-{{ section.id }}');
and only query inside root (never use global document selectors).
Return only the complete section code.`;
}
