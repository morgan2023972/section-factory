import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildLogoCloudPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify logo cloud section with the following capabilities:
- Logo blocks with image and optional link.
- Optional section heading and subheading.
- Configurable logo size and spacing.
- Grayscale to color hover option.
- Responsive wrapping/grid layout for all devices.
- Fully configurable schema settings for section options and logo blocks.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
