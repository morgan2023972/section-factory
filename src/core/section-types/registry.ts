export type SectionTypeId =
  | "before-after"
  | "comparison-table"
  | "featured-product"
  | "image-with-text"
  | "logo-cloud"
  | "newsletter"
  | "promo-banner"
  | "trust-badges"
  | "hero"
  | "faq"
  | "testimonials"
  | "product-grid";

export interface SectionTypeDefinition {
  id: SectionTypeId;
  label: string;
  description: string;
  category: string;
  supportsDesignSystem: boolean;
  enabled: boolean;
}

export const SECTION_TYPE_REGISTRY: SectionTypeDefinition[] = [
  {
    id: "before-after",
    label: "Before/After",
    description: "Visual comparison slider between two images",
    category: "media",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "comparison-table",
    label: "Comparison Table",
    description: "Feature comparison table across products or plans",
    category: "conversion",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "featured-product",
    label: "Featured Product",
    description: "Spotlight for a single product with key details and CTA",
    category: "catalog",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "image-with-text",
    label: "Image With Text",
    description: "Image and text split layout for storytelling",
    category: "content",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "logo-cloud",
    label: "Logo Cloud",
    description: "Grid of partner or client logos",
    category: "social-proof",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description: "Email signup section for audience capture",
    category: "conversion",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "promo-banner",
    label: "Promo Banner",
    description: "Promotional banner highlighting an offer or event",
    category: "marketing",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "trust-badges",
    label: "Trust Badges",
    description: "Reassurance badges and trust signals",
    category: "social-proof",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "hero",
    label: "Hero",
    description: "Top banner section with heading, text, CTA and media",
    category: "marketing",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Expandable frequently asked questions section",
    category: "content",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "testimonials",
    label: "Testimonials",
    description: "Customer quotes and social proof section",
    category: "social-proof",
    supportsDesignSystem: true,
    enabled: true,
  },
  {
    id: "product-grid",
    label: "Product Grid",
    description: "Grid of featured or selected products",
    category: "catalog",
    supportsDesignSystem: true,
    enabled: true,
  },
];

function sortByLabel(
  sectionTypes: SectionTypeDefinition[],
): SectionTypeDefinition[] {
  return [...sectionTypes].sort((a, b) => a.label.localeCompare(b.label));
}

export function getAllSectionTypes(): SectionTypeDefinition[] {
  return sortByLabel(SECTION_TYPE_REGISTRY);
}

export function getEnabledSectionTypes(): SectionTypeDefinition[] {
  return sortByLabel(
    SECTION_TYPE_REGISTRY.filter((definition) => definition.enabled),
  );
}

export function getSectionTypeById(
  id: string,
): SectionTypeDefinition | undefined {
  return SECTION_TYPE_REGISTRY.find((definition) => definition.id === id);
}

export function isKnownSectionType(id: string): boolean {
  return getSectionTypeById(id) !== undefined;
}

export function getSectionTypeIds(): SectionTypeId[] {
  return getAllSectionTypes().map((definition) => definition.id);
}

export function getSectionTypesByCategory(
  category: string,
): SectionTypeDefinition[] {
  return sortByLabel(
    SECTION_TYPE_REGISTRY.filter(
      (definition) => definition.category === category,
    ),
  );
}
