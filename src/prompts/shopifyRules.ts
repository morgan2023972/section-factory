export const shopifyRules = `
Shopify Section Generation Rules:

1. Scope all CSS with ".section-{{ section.id }}".
2. JavaScript must be scoped to the section element only.
3. Do not write global CSS.
4. Do not use document.querySelector.
5. The schema must include: name, settings, blocks, and presets.
`;

export default shopifyRules;
