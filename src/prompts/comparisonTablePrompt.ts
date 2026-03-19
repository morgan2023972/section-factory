import { type BasePromptOptions, buildBasePrompt } from "./basePrompt";

export function buildComparisonTablePrompt(
  options?: BasePromptOptions,
): string {
  return `${buildBasePrompt(options)}

Build a Shopify comparison table section with the following capabilities:
- Configurable columns for products/plans.
- Feature rows with values per column.
- Highlighted recommended column option.
- Optional CTA per column.
- Responsive behavior with horizontal scroll or stacked mobile layout.
- Fully configurable schema settings for columns, rows, and actions.

Ensure defaults are meaningful and merchant-friendly.
Return only the complete section code.`;
}
