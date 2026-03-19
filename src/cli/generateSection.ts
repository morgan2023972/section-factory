import * as dotenv from "dotenv";
import { type DesignSystemOptions } from "../core/designSystemInjector";
import { generateSection } from "../core/sectionGenerator";
import { writeSectionToDisk } from "../core/sectionBuilder";
import { validateSectionCode } from "../core/sectionValidator";
import { buildBeforeAfterPrompt } from "../prompts/beforeAfterPrompt";
import { buildComparisonTablePrompt } from "../prompts/comparisonTablePrompt";
import {
  DEFAULT_DESIGN_PROFILE,
  DESIGN_PROFILE_NAMES,
  resolveDesignProfileName,
} from "../prompts/designSystemProfiles";
import { buildFaqPrompt } from "../prompts/faqPrompt";
import { buildFeaturedProductPrompt } from "../prompts/featuredProductPrompt";
import { buildHeroPrompt } from "../prompts/heroPrompt";
import { buildImageWithTextPrompt } from "../prompts/imageWithTextPrompt";
import { buildLogoCloudPrompt } from "../prompts/logoCloudPrompt";
import { buildNewsletterPrompt } from "../prompts/newsletterPrompt";
import { buildProductGridPrompt } from "../prompts/productGridPrompt";
import { buildPromoBannerPrompt } from "../prompts/promoBannerPrompt";
import { buildTestimonialsPrompt } from "../prompts/testimonialsPrompt";
import { buildTrustBadgesPrompt } from "../prompts/trustBadgesPrompt";

dotenv.config();

interface CliOptions {
  sectionType: string;
  designSystem: DesignSystemOptions;
}

const SECTION_TYPE_ALIASES: Record<string, string> = {
  features: "product-grid",
};

type PromptBuilder = (designSystem: DesignSystemOptions) => string;

const SECTION_PROMPT_BUILDERS: Record<string, PromptBuilder> = {
  hero: (designSystem) => buildHeroPrompt({ designSystem }),
  "featured-product": (designSystem) =>
    buildFeaturedProductPrompt({ designSystem }),
  "product-grid": (designSystem) => buildProductGridPrompt({ designSystem }),
  testimonials: (designSystem) => buildTestimonialsPrompt({ designSystem }),
  faq: (designSystem) => buildFaqPrompt({ designSystem }),
  "logo-cloud": (designSystem) => buildLogoCloudPrompt({ designSystem }),
  "image-with-text": (designSystem) =>
    buildImageWithTextPrompt({ designSystem }),
  newsletter: (designSystem) => buildNewsletterPrompt({ designSystem }),
  "promo-banner": (designSystem) => buildPromoBannerPrompt({ designSystem }),
  "trust-badges": (designSystem) => buildTrustBadgesPrompt({ designSystem }),
  "before-after": (designSystem) => buildBeforeAfterPrompt({ designSystem }),
  "comparison-table": (designSystem) =>
    buildComparisonTablePrompt({ designSystem }),
};

function getSupportedSectionTypes(): string[] {
  return Object.keys(SECTION_PROMPT_BUILDERS);
}

function resolveSectionType(input: string): string {
  return SECTION_TYPE_ALIASES[input] || input;
}

function parseCliOptions(argv: string[]): CliOptions {
  const args = [...argv];
  const firstArg = args[0];
  const sectionType =
    firstArg && !firstArg.startsWith("--")
      ? (args.shift() as string).trim().toLowerCase()
      : "hero";
  const resolvedSectionType = resolveSectionType(sectionType);

  if (!SECTION_PROMPT_BUILDERS[resolvedSectionType]) {
    const supportedTypes = getSupportedSectionTypes().join(", ");
    throw new Error(
      `Unsupported section type \"${sectionType}\". Allowed types: ${supportedTypes}`,
    );
  }

  let designSystemEnabled = false;
  let profileInput: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--design-system") {
      designSystemEnabled = true;
      continue;
    }

    if (arg === "--profile") {
      profileInput = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--profile=")) {
      profileInput = arg.split("=")[1];
      continue;
    }
  }

  if (profileInput) {
    designSystemEnabled = true;
  }

  if (!designSystemEnabled) {
    return {
      sectionType: resolvedSectionType,
      designSystem: {
        enabled: false,
      },
    };
  }

  const resolvedProfile = profileInput
    ? resolveDesignProfileName(profileInput)
    : DEFAULT_DESIGN_PROFILE;

  if (!resolvedProfile) {
    const allowedProfiles = DESIGN_PROFILE_NAMES.join(", ");
    throw new Error(
      `Invalid design profile \"${profileInput}\". Allowed profiles: ${allowedProfiles}`,
    );
  }

  return {
    sectionType: resolvedSectionType,
    designSystem: {
      enabled: true,
      profile: resolvedProfile,
    },
  };
}

function buildPromptForType(
  sectionType: string,
  designSystem: DesignSystemOptions,
): string {
  const builder = SECTION_PROMPT_BUILDERS[sectionType];
  if (!builder) {
    const supportedTypes = getSupportedSectionTypes().join(", ");
    throw new Error(
      `Unsupported section type \"${sectionType}\". Allowed types: ${supportedTypes}`,
    );
  }

  return builder(designSystem);
}

async function run(): Promise<void> {
  const cliOptions = parseCliOptions(process.argv.slice(2));
  const prompt = buildPromptForType(
    cliOptions.sectionType,
    cliOptions.designSystem,
  );

  if (cliOptions.designSystem.enabled) {
    console.log(
      `Design system enabled with profile: ${cliOptions.designSystem.profile}`,
    );
  }

  const sectionCode = await generateSection(prompt);
  const validation = validateSectionCode(sectionCode, {
    designSystemEnabled: cliOptions.designSystem.enabled,
  });

  if (!validation.isValid) {
    console.error("Validation failed:");
    for (const error of validation.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const outputPath = await writeSectionToDisk(
    cliOptions.sectionType,
    sectionCode,
  );

  console.log(`Section generated successfully: ${outputPath}`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Section generation failed: ${message}`);
  process.exit(1);
});
