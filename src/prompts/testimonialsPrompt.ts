import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildTestimonialsPrompt(options?: BasePromptOptions): string {
  return `${buildBasePrompt(options)}

Build a Shopify testimonials section with the following capabilities:
- Testimonial blocks with quote, author name, and optional role/company.
- Optional avatar image support.
- Optional heading and subheading.
- Responsive layout for desktop and mobile.
- Fully configurable schema settings for section options and testimonial blocks.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
