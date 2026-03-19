export const SHOPIFY_SECTION_RULES = [
  "A section should be modular and reusable.",
  "A section file should contain a valid {% schema %} block.",
  "Use section settings for merchant-configurable content.",
  "Use blocks when repeated configurable sub-items are needed.",
  "Avoid assumptions about a specific theme structure.",
  "Keep CSS and JavaScript scoped as much as possible.",
  "Provide presets when appropriate.",
  "Use accessible semantic markup.",
  "Support customization through settings instead of hardcoded content.",
];

export const SHOPIFY_SCHEMA_GUIDE = {
  attributes: [
    "name",
    "tag",
    "class",
    "limit",
    "settings",
    "blocks",
    "max_blocks",
    "presets",
    "default",
    "locales",
    "enabled_on",
    "disabled_on",
  ],
  notes: [
    "settings define merchant-editable inputs",
    "blocks define repeatable content units",
    "presets help merchants add the section quickly in the editor",
    "enabled_on and disabled_on can restrict usage to specific templates/groups",
  ],
};

export const CATEGORY_SETTINGS_MAP: Record<string, string[]> = {
  hero: [
    "heading",
    "subheading",
    "button_label",
    "button_link",
    "background_image",
    "text_alignment",
    "color_scheme",
  ],
  faq: ["title", "intro_text", "question", "answer"],
  testimonial: ["title", "quote", "author_name", "author_role", "author_image"],
  "feature-grid": ["title", "columns", "icon", "heading", "text", "link"],
};
