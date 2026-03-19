export type DesignProfileName =
  | "minimal"
  | "luxury"
  | "editorial"
  | "conversion"
  | "playful"
  | "tech";

export interface DesignProfile {
  visualTokens: string;
  layoutRules: string;
  typographyRules: string;
  spacingRules: string;
  buttonRules: string;
  animationRules: string;
  responsiveConventions: string;
  globalStyle: string;
}

export const DESIGN_PROFILE_NAMES: DesignProfileName[] = [
  "minimal",
  "luxury",
  "editorial",
  "conversion",
  "playful",
  "tech",
];

export const DEFAULT_DESIGN_PROFILE: DesignProfileName = "minimal";

const designProfiles: Record<DesignProfileName, DesignProfile> = {
  minimal: {
    visualTokens:
      "Use a restrained color system with neutral backgrounds, high contrast text, and one subtle accent color. Use a clean radius scale and soft shadow levels.",
    layoutRules:
      "Prefer simple single-column or two-column layouts with strong content hierarchy and generous negative space.",
    typographyRules:
      "Use modern sans-serif typography with clear hierarchy: large heading, readable body, concise labels.",
    spacingRules:
      "Use an 8px spacing rhythm with consistent vertical rhythm and balanced inner paddings.",
    buttonRules:
      "Buttons should be clear, medium weight, and high contrast. Primary button style only, no decorative effects.",
    animationRules:
      "Use subtle transitions only (opacity/transform), short duration, no distracting motion.",
    responsiveConventions:
      "Stack columns on mobile, preserve readable line lengths, and keep tap targets comfortable.",
    globalStyle:
      "Overall feel: calm, clean, premium minimalism focused on readability and product clarity.",
  },
  luxury: {
    visualTokens:
      "Use deep neutrals, rich contrast, metallic-like accent tones, refined radii, and elegant shadow layering.",
    layoutRules:
      "Use composed layouts with spacious margins, asymmetric blocks, and premium visual balance.",
    typographyRules:
      "Use high-end editorial typography contrast between display heading and refined body text.",
    spacingRules:
      "Use larger spacing intervals to convey exclusivity and breathing room.",
    buttonRules:
      "Buttons should be refined, confident, and premium with subtle hover elevation.",
    animationRules:
      "Use smooth and luxurious micro-animations with restrained timing and easing.",
    responsiveConventions:
      "Preserve premium hierarchy on mobile with simplified but elegant stacking and spacing.",
    globalStyle:
      "Overall feel: sophisticated luxury storefront with elevated brand perception.",
  },
  editorial: {
    visualTokens:
      "Use paper-like backgrounds, restrained accent colors, and text-first contrast tokens.",
    layoutRules:
      "Use magazine-inspired composition with clear reading flow and story-oriented blocks.",
    typographyRules:
      "Use expressive heading typography and highly legible body copy with strong rhythm.",
    spacingRules:
      "Use typographic spacing tied to baseline rhythm and paragraph cadence.",
    buttonRules:
      "Buttons should feel secondary to content but remain discoverable and clear.",
    animationRules:
      "Use gentle reveal and fade transitions that support narrative reading.",
    responsiveConventions:
      "Keep reading comfort first on mobile: line length, spacing, and hierarchy clarity.",
    globalStyle:
      "Overall feel: content-rich editorial aesthetic, elegant and narrative-driven.",
  },
  conversion: {
    visualTokens:
      "Use high-clarity contrast tokens, action-focused accent colors, and trust-oriented neutral backgrounds.",
    layoutRules:
      "Use conversion-first layouts with clear value proposition, social proof space, and visible CTAs.",
    typographyRules:
      "Use direct, benefit-led headings and concise supporting copy.",
    spacingRules:
      "Use compact but breathable spacing to keep momentum and reduce scroll fatigue.",
    buttonRules:
      "Buttons must be prominent, high-contrast, and action-oriented with clear CTA labels.",
    animationRules:
      "Use practical motion to guide attention to key actions without delay.",
    responsiveConventions:
      "Prioritize mobile conversion clarity: CTA visibility, short sections, and fast scanning.",
    globalStyle:
      "Overall feel: performance marketing design optimized for clarity and action.",
  },
  playful: {
    visualTokens:
      "Use vibrant accent tokens, soft gradients, rounded shapes, and friendly contrast combinations.",
    layoutRules:
      "Use dynamic compositions with playful visual rhythm while preserving structure.",
    typographyRules:
      "Use friendly, energetic typography with clear but expressive hierarchy.",
    spacingRules:
      "Use lively spacing variations with consistent base rhythm to avoid clutter.",
    buttonRules:
      "Buttons should feel tactile and fun, with clear states and accessible contrast.",
    animationRules:
      "Use cheerful but controlled micro-interactions and hover/press feedback.",
    responsiveConventions:
      "Maintain playful identity on mobile while simplifying density and interactions.",
    globalStyle:
      "Overall feel: joyful, approachable, colorful premium playfulness.",
  },
  tech: {
    visualTokens:
      "Use crisp neutral palettes with electric accent tokens, precise radii, and structured elevation.",
    layoutRules:
      "Use modular grid-based layouts with strong alignment and systematic component spacing.",
    typographyRules:
      "Use modern technical typography with strong information hierarchy and concise labels.",
    spacingRules:
      "Use systematic spacing scale with predictable intervals and component density control.",
    buttonRules:
      "Buttons should look precise and performant, with distinct primary/secondary styles.",
    animationRules:
      "Use fast, smooth transitions that communicate responsiveness and product polish.",
    responsiveConventions:
      "Use breakpoint-aware component behavior with robust mobile-first adaptation.",
    globalStyle:
      "Overall feel: advanced, product-focused, high-trust technology brand aesthetic.",
  },
};

export function isDesignProfileName(value: string): value is DesignProfileName {
  return (DESIGN_PROFILE_NAMES as string[]).includes(value);
}

export function resolveDesignProfileName(
  value?: string,
): DesignProfileName | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (isDesignProfileName(normalized)) {
    return normalized;
  }

  return null;
}

export function getDesignProfile(profile: DesignProfileName): DesignProfile {
  return designProfiles[profile];
}
