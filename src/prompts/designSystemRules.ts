import {
  type DesignProfileName,
  getDesignProfile,
} from "./designSystemProfiles";

export function buildDesignSystemRules(profile: DesignProfileName): string {
  const config = getDesignProfile(profile);

  return `
Design System Profile: ${profile}

Design System Injector Rules:
- Visual Tokens: ${config.visualTokens}
- Layout Rules: ${config.layoutRules}
- Typography Rules: ${config.typographyRules}
- Spacing Rules: ${config.spacingRules}
- Button Rules: ${config.buttonRules}
- Animation Rules: ${config.animationRules}
- Responsive Conventions: ${config.responsiveConventions}
- Premium Global Style: ${config.globalStyle}

Apply these rules consistently across HTML/Liquid structure, CSS, JavaScript interactions, and schema defaults.
Never output explanations; output only final Shopify section code.
`.trim();
}
