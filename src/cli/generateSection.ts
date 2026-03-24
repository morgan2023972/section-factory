import * as dotenv from "dotenv";
import { resolveSectionType } from "./sectionTypeMapping";
import {
  retryGenerateSection,
  type ValidationIssue as RetryValidationIssue,
} from "../generator/retryGenerator";
import { type DesignSystemOptions } from "../core/designSystemInjector";
import { generateSection } from "../core/sectionGenerator";
import { writeSectionToDisk } from "../core/sectionBuilder";
import {
  validateSectionCode,
  type SectionValidationResult,
} from "../core/sectionValidator";
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
import { shopifyRules } from "../prompts/shopifyRules";
import { buildTestimonialsPrompt } from "../prompts/testimonialsPrompt";
import { buildTrustBadgesPrompt } from "../prompts/trustBadgesPrompt";

dotenv.config();

interface CliOptions {
  sectionType: string;
  designSystem: DesignSystemOptions;
  maxRetries: number;
  validationMode: "strict" | "non-strict";
}

const DEFAULT_MAX_RETRIES = 2;

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
  let maxRetries = DEFAULT_MAX_RETRIES;
  let validationMode: "strict" | "non-strict" = "non-strict";

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

    if (arg === "--max-retries") {
      const retriesValue = Number(args[i + 1]);
      if (Number.isInteger(retriesValue) && retriesValue >= 0) {
        maxRetries = retriesValue;
      }
      i += 1;
      continue;
    }

    if (arg.startsWith("--max-retries=")) {
      const retriesValue = Number(arg.split("=")[1]);
      if (Number.isInteger(retriesValue) && retriesValue >= 0) {
        maxRetries = retriesValue;
      }
      continue;
    }

    if (arg === "--strict") {
      validationMode = "strict";
      continue;
    }

    if (arg === "--non-strict") {
      validationMode = "non-strict";
      continue;
    }
  }

  if (profileInput) {
    designSystemEnabled = true;
  }

  if (!designSystemEnabled) {
    return {
      sectionType: resolvedSectionType,
      maxRetries,
      validationMode,
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
    maxRetries,
    validationMode,
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

export interface CliRuntimeDeps {
  generateSectionFn: (prompt: string) => Promise<string>;
  writeSectionToDiskFn: (
    sectionType: string,
    sectionCode: string,
  ) => Promise<string>;
  validateSectionCodeFn: (
    sectionCode: string,
    options?: { designSystemEnabled?: boolean },
  ) => SectionValidationResult;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_CLI_RUNTIME_DEPS: CliRuntimeDeps = {
  generateSectionFn: generateSection,
  writeSectionToDiskFn: writeSectionToDisk,
  validateSectionCodeFn: validateSectionCode,
  log: console.log,
  error: console.error,
};

function mapValidationErrorsToRetryIssues(
  errors: string[],
): RetryValidationIssue[] {
  return errors.map((message) => ({
    path: "section",
    message,
  }));
}

function isNonBlockingGenerationError(message: string): boolean {
  return (
    message.startsWith("Mobile UX issue:") ||
    message.startsWith("Global CSS selectors are not allowed:") ||
    message === "Global JS access via document.* selectors is not allowed." ||
    message ===
      "Global JS access is not allowed: scope JS to the section element."
  );
}

function splitValidationErrorsByMode(
  errors: string[],
  mode: "strict" | "non-strict",
): { blockingErrors: string[]; warningErrors: string[] } {
  if (mode === "strict") {
    return {
      blockingErrors: errors,
      warningErrors: [],
    };
  }

  const warningErrors = errors.filter(isNonBlockingGenerationError);
  const blockingErrors = errors.filter(
    (errorMessage) => !isNonBlockingGenerationError(errorMessage),
  );

  return {
    blockingErrors,
    warningErrors,
  };
}

export async function runCli(
  argv: string[],
  deps: CliRuntimeDeps = DEFAULT_CLI_RUNTIME_DEPS,
): Promise<number> {
  const cliOptions = parseCliOptions(argv);
  const prompt = buildPromptForType(
    cliOptions.sectionType,
    cliOptions.designSystem,
  );

  if (cliOptions.designSystem.enabled) {
    deps.log(
      `Design system enabled with profile: ${cliOptions.designSystem.profile}`,
    );
  }

  const sectionCode = await deps.generateSectionFn(prompt);
  const validationOptions = {
    designSystemEnabled: cliOptions.designSystem.enabled,
  };
  const validation = deps.validateSectionCodeFn(sectionCode, validationOptions);
  const initialValidation = splitValidationErrorsByMode(
    validation.errors,
    cliOptions.validationMode,
  );

  for (const warning of initialValidation.warningErrors) {
    deps.log(`[Validation warning] ${warning}`);
  }

  if (initialValidation.blockingErrors.length > 0) {
    if (cliOptions.maxRetries <= 0) {
      deps.error("Validation failed:");
      for (const error of initialValidation.blockingErrors) {
        deps.error(`- ${error}`);
      }
      return 1;
    }

    deps.log(
      `Validation failed. Starting retry correction (max ${cliOptions.maxRetries} attempts).`,
    );

    const retryResult = await retryGenerateSection({
      sectionType: cliOptions.sectionType,
      originalCode: sectionCode,
      issues: mapValidationErrorsToRetryIssues(
        initialValidation.blockingErrors,
      ),
      shopifyRules,
      maxRetries: cliOptions.maxRetries,
      generateCorrection: deps.generateSectionFn,
      validateCandidate: (candidateCode) => {
        const candidateValidation = deps.validateSectionCodeFn(
          candidateCode,
          validationOptions,
        );
        const normalized = splitValidationErrorsByMode(
          candidateValidation.errors,
          cliOptions.validationMode,
        );
        return mapValidationErrorsToRetryIssues(normalized.blockingErrors);
      },
    });

    if (!retryResult.success || !retryResult.finalCode) {
      deps.error("Validation failed after retry attempts:");
      for (const issue of retryResult.lastIssues) {
        deps.error(`- ${issue.path}: ${issue.message}`);
      }
      return 1;
    }

    deps.log("Retry correction succeeded.");
    const outputPath = await deps.writeSectionToDiskFn(
      cliOptions.sectionType,
      retryResult.finalCode,
    );
    deps.log(`Section generated successfully: ${outputPath}`);
    return 0;
  }

  const outputPath = await deps.writeSectionToDiskFn(
    cliOptions.sectionType,
    sectionCode,
  );

  deps.log(`Section generated successfully: ${outputPath}`);
  return 0;
}

if (require.main === module) {
  runCli(process.argv.slice(2)).then(
    (exitCode) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Section generation failed: ${message}`);
      process.exit(1);
    },
  );
}
