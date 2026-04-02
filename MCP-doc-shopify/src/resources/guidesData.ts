import type { GuideResource } from "../catalog/types.js";

export const SHOPIFY_GUIDES: readonly GuideResource[] = [
  {
    uri: "shopify://guides/sections",
    name: "shopify-guide-sections",
    title: "Shopify Sections Guide",
    description:
      "Core structure and implementation practices for Online Store 2.0 sections.",
    markdown: `# Shopify Sections Guide

## Purpose
Sections are modular Liquid components that merchants can add, configure, and reorder in the theme editor.

## Required Structure
1. Liquid markup for output
2. Optional scoped CSS and JavaScript
3. A valid {% schema %} JSON block

## Best Practices
- Keep sections reusable and configurable through settings.
- Avoid hardcoding merchant content.
- Use semantic HTML for accessibility.
- Scope styles and behavior to the section instance.

## Minimal Schema Example
\`\`\`liquid
{% schema %}
{
  "name": "Hero",
  "settings": [{ "type": "text", "id": "heading", "label": "Heading" }],
  "presets": [{ "name": "Hero" }]
}
{% endschema %}
\`\`\`
`,
  },
  {
    uri: "shopify://guides/blocks",
    name: "shopify-guide-blocks",
    title: "Shopify Blocks Guide",
    description:
      "How to model repeatable content in section schema using blocks.",
    markdown: `# Shopify Blocks Guide

## What Blocks Solve
Blocks let merchants add repeated items (FAQ rows, slides, features, testimonials) without duplicating section code.

## Recommended Pattern
- Define a block type with merchant-editable settings.
- Use \`max_blocks\` to control complexity.
- Render blocks with defensive defaults.

## Schema Snippet
\`\`\`json
"blocks": [
  {
    "type": "faq_item",
    "name": "FAQ Item",
    "settings": [
      { "type": "text", "id": "question", "label": "Question" },
      { "type": "textarea", "id": "answer", "label": "Answer" }
    ]
  }
]
\`\`\`
`,
  },
  {
    uri: "shopify://guides/presets",
    name: "shopify-guide-presets",
    title: "Shopify Presets Guide",
    description:
      "Guidelines for presets so sections are easy to add in the theme editor.",
    markdown: `# Shopify Presets Guide

## Why Presets Matter
Presets make sections discoverable in the theme editor and provide sensible defaults.

## Preset Rules
- Include at least one preset for merchant onboarding.
- Use clear preset names matching section intent.
- Keep default block and setting values realistic.

## Preset Snippet
\`\`\`json
"presets": [
  {
    "name": "Hero",
    "category": "Banner"
  }
]
\`\`\`
`,
  },
  {
    uri: "shopify://guides/schema-settings",
    name: "shopify-guide-schema-settings",
    title: "Shopify Schema Settings Guide",
    description: "Practical guidance for selecting and naming schema settings.",
    markdown: `# Shopify Schema Settings Guide

## Setting Design Principles
- Use predictable IDs: \`heading\`, \`subheading\`, \`button_label\`.
- Prefer merchant language in labels.
- Group related controls with \`header\` settings where useful.

## Common Setting Types
- \`text\` and \`textarea\` for copy
- \`image_picker\` for visual assets
- \`url\` for links
- \`select\` for constrained options
- \`color_scheme\` for theme-level consistency

## Validation Checklist
1. Every setting has unique \`id\`.
2. Labels are explicit for merchants.
3. Defaults are present where relevant.
`,
  },
  {
    uri: "shopify://guides/liquid-patterns",
    name: "shopify-guide-liquid-patterns",
    title: "Shopify Liquid Patterns Guide",
    description:
      "Robust Liquid implementation patterns for maintainable sections.",
    markdown: `# Shopify Liquid Patterns Guide

## Recommended Patterns
- Resolve values with fallbacks: \`section.settings.heading | default: '...'\`.
- Guard optional data before rendering wrappers.
- Iterate blocks with \`for block in section.blocks\` and block-scoped attributes.

## Avoid
- Global DOM assumptions in JavaScript.
- Theme-specific hardcoded selectors.
- Markup that cannot adapt to missing settings.

## Pattern Example
\`\`\`liquid
{% if section.settings.heading != blank %}
  <h2>{{ section.settings.heading }}</h2>
{% endif %}
\`\`\`
`,
  },
  {
    uri: "shopify://guides/os2-compatibility",
    name: "shopify-guide-os2-compatibility",
    title: "Shopify OS 2.0 Compatibility Guide",
    description:
      "Checklist for compatibility with Shopify Online Store 2.0 behavior.",
    markdown: `# Shopify OS 2.0 Compatibility Guide

## Compatibility Goals
- Work in JSON templates and app blocks context.
- Support dynamic section composition in the theme editor.
- Respect merchant customization without code edits.

## OS 2.0 Checklist
1. Section schema includes \`name\`, \`settings\`, and \`presets\`.
2. Blocks are optional and validated when present.
3. CSS and JavaScript are instance-scoped.
4. Markup remains accessible with empty or partial settings.

## Regression Traps
- Missing presets (section hard to discover)
- Rigid assumptions about template context
- Unscoped scripts affecting other sections
`,
  },
];
