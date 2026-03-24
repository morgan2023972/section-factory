export const SECTION_TYPE_ALIASES: Record<string, string> = {
  features: "product-grid",
};

export function resolveSectionType(input: string): string {
  return SECTION_TYPE_ALIASES[input] || input;
}

export function getAliasesForSectionType(typeId: string): string[] {
  return Object.entries(SECTION_TYPE_ALIASES)
    .filter(([, resolvedTypeId]) => resolvedTypeId === typeId)
    .map(([alias]) => alias)
    .sort((a, b) => a.localeCompare(b));
}
