export type SectionTypeId =
  | "hero"
  | "faq"
  | "testimonials"
  | "product-grid"
  | "rich-text"
  | "image-banner";

export interface SectionTypeDefinition {
  id: SectionTypeId;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
}

export const SECTION_TYPE_REGISTRY: SectionTypeDefinition[] = [
  {
    id: "hero",
    label: "Hero",
    description: "Top banner section with heading, text, CTA and media",
    category: "marketing",
    enabled: true,
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Expandable frequently asked questions section",
    category: "content",
    enabled: true,
  },
  {
    id: "testimonials",
    label: "Testimonials",
    description: "Customer quotes and social proof section",
    category: "social-proof",
    enabled: true,
  },
  {
    id: "product-grid",
    label: "Product Grid",
    description: "Grid of featured or selected products",
    category: "catalog",
    enabled: true,
  },
  {
    id: "rich-text",
    label: "Rich Text",
    description: "Formatted text content section",
    category: "content",
    enabled: true,
  },
  {
    id: "image-banner",
    label: "Image Banner",
    description: "Large image section with overlay content",
    category: "media",
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
