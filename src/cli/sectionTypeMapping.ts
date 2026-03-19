export const SECTION_TYPE_ALIASES: Record<string, string> = {
  features: "product-grid",
};

export function resolveSectionType(input: string): string {
  return SECTION_TYPE_ALIASES[input] || input;
}
