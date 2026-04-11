import * as dotenv from "dotenv";
import { resolveSectionType } from "./sectionTypeMapping";
import {
  repairSection,
  type RepairResult,
  type ValidationIssue as RepairValidationIssue,
} from "../core/repair";
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
import { type SectionTypeId } from "../core/section-types/registry";

dotenv.config();

interface CliOptions {
  sectionType: SectionTypeId;
  designSystem: DesignSystemOptions;
  maxRetries: number;
  validationMode: "strict" | "non-strict";
}

const DEFAULT_MAX_RETRIES = 2;

type PromptBuilder = (designSystem: DesignSystemOptions) => string;

const SECTION_PROMPT_BUILDERS: Record<SectionTypeId, PromptBuilder> = {
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

export function getSupportedSectionTypes(): SectionTypeId[] {
  return Object.keys(SECTION_PROMPT_BUILDERS) as SectionTypeId[];
}

function isSupportedSectionType(
  sectionType: string,
): sectionType is SectionTypeId {
  return sectionType in SECTION_PROMPT_BUILDERS;
}

function parseCliOptions(argv: string[]): CliOptions {
  const args = [...argv];
  const firstArg = args[0];
  const sectionType =
    firstArg && !firstArg.startsWith("--")
      ? (args.shift() as string).trim().toLowerCase()
      : "hero";
  const resolvedSectionType = resolveSectionType(sectionType);

  if (!isSupportedSectionType(resolvedSectionType)) {
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
  sectionType: SectionTypeId,
  designSystem: DesignSystemOptions,
): string {
  return SECTION_PROMPT_BUILDERS[sectionType](designSystem);
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
  repairSectionFn: typeof repairSection;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_CLI_RUNTIME_DEPS: CliRuntimeDeps = {
  generateSectionFn: generateSection,
  writeSectionToDiskFn: writeSectionToDisk,
  validateSectionCodeFn: validateSectionCode,
  repairSectionFn: repairSection,
  log: console.log,
  error: console.error,
};

function mapValidationErrorsToRetryIssues(
  errors: string[],
): RepairValidationIssue[] {
  return errors.map((message) => ({
    path: "section",
    message,
    severity: "error",
  }));
}

interface PipelineValidationState {
  isValid: boolean;
  blockingErrors: string[];
  warningErrors: string[];
  issueCount: number;
}

export type GenerationPipelineStatus =
  | "generated_valid"
  | "generated_invalid_repaired_valid"
  | "generated_invalid_repaired_improved"
  | "generated_invalid_repair_no_improvement"
  | "generated_invalid_repair_failed";

export interface GenerationPipelineResult {
  pipelineStatus: GenerationPipelineStatus;
  initialCode: string;
  finalCode: string;
  initialValidation: PipelineValidationState;
  repairAttempted: boolean;
  repairSucceeded: boolean;
  postRepairValidation: PipelineValidationState | null;
  usedRepairedOutput: boolean;
  repairError?: string;
  repairFailureReason: string | null;
  repairResult: RepairResult | null;
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

function toValidationState(
  validation: SectionValidationResult,
  mode: "strict" | "non-strict",
): PipelineValidationState {
  const normalized = splitValidationErrorsByMode(validation.errors, mode);
  return {
    isValid: normalized.blockingErrors.length === 0,
    blockingErrors: normalized.blockingErrors,
    warningErrors: normalized.warningErrors,
    issueCount: normalized.blockingErrors.length,
  };
}

export function decideFinalOutput(
  initial: {
    code: string;
    validation: PipelineValidationState;
  },
  repaired: {
    code: string | null;
    error?: string | null;
  },
  validations: {
    postRepair: PipelineValidationState | null;
  },
): {
  finalCode: string;
  usedRepairedOutput: boolean;
  pipelineStatus:
    | "generated_invalid_repaired_valid"
    | "generated_invalid_repaired_improved"
    | "generated_invalid_repair_no_improvement"
    | "generated_invalid_repair_failed";
  repairError?: string;
} {
  if (repaired.error) {
    return {
      finalCode: initial.code,
      usedRepairedOutput: false,
      pipelineStatus: "generated_invalid_repair_failed",
      repairError: repaired.error,
    };
  }

  const repairedCode = repaired.code ?? "";
  if (!repairedCode.trim()) {
    return {
      finalCode: initial.code,
      usedRepairedOutput: false,
      pipelineStatus: "generated_invalid_repair_failed",
      repairError: "Repair produced no usable code.",
    };
  }

  const postRepairValidation = validations.postRepair;
  if (!postRepairValidation) {
    return {
      finalCode: initial.code,
      usedRepairedOutput: false,
      pipelineStatus: "generated_invalid_repair_failed",
      repairError: "Repair post-validation did not run.",
    };
  }

  if (postRepairValidation.isValid) {
    return {
      finalCode: repairedCode,
      usedRepairedOutput: true,
      pipelineStatus: "generated_invalid_repaired_valid",
    };
  }

  if (postRepairValidation.issueCount < initial.validation.issueCount) {
    return {
      finalCode: repairedCode,
      usedRepairedOutput: true,
      pipelineStatus: "generated_invalid_repaired_improved",
    };
  }

  return {
    finalCode: initial.code,
    usedRepairedOutput: false,
    pipelineStatus: "generated_invalid_repair_no_improvement",
    repairError: "Repair did not provide measurable improvement.",
  };
}

export async function runGenerationPipeline(
  cliOptions: CliOptions,
  deps: CliRuntimeDeps,
): Promise<GenerationPipelineResult> {
  const prompt = buildPromptForType(
    cliOptions.sectionType,
    cliOptions.designSystem,
  );
  const initialCode = await deps.generateSectionFn(prompt);
  const validationOptions = {
    designSystemEnabled: cliOptions.designSystem.enabled,
  };
  const initialValidationResult = deps.validateSectionCodeFn(
    initialCode,
    validationOptions,
  );
  const initialValidation = toValidationState(
    initialValidationResult,
    cliOptions.validationMode,
  );

  if (initialValidation.isValid) {
    return {
      pipelineStatus: "generated_valid",
      initialCode,
      finalCode: initialCode,
      initialValidation,
      repairAttempted: false,
      repairSucceeded: false,
      postRepairValidation: null,
      usedRepairedOutput: false,
      repairError: undefined,
      repairFailureReason: null,
      repairResult: null,
    };
  }

  if (cliOptions.maxRetries <= 0) {
    const repairError = "Repair disabled by --max-retries=0.";
    return {
      pipelineStatus: "generated_invalid_repair_no_improvement",
      initialCode,
      finalCode: initialCode,
      initialValidation,
      repairAttempted: false,
      repairSucceeded: false,
      postRepairValidation: null,
      usedRepairedOutput: false,
      repairError,
      repairFailureReason: repairError,
      repairResult: null,
    };
  }

  try {
    const repairResult = await deps.repairSectionFn(
      initialCode,
      mapValidationErrorsToRetryIssues(initialValidation.blockingErrors),
      {
        mode: cliOptions.validationMode,
        maxRetries: cliOptions.maxRetries,
        sectionType: cliOptions.sectionType,
      },
      {
        generateCorrectionFn: deps.generateSectionFn,
        validateCandidateFn: (candidateCode) => {
          const candidateValidation = deps.validateSectionCodeFn(
            candidateCode,
            validationOptions,
          );
          const candidateState = toValidationState(
            candidateValidation,
            cliOptions.validationMode,
          );
          return mapValidationErrorsToRetryIssues(
            candidateState.blockingErrors,
          );
        },
        shopifyRules,
      },
    );

    const repairedCode = repairResult.finalCode ?? "";
    const postRepairValidationResult = deps.validateSectionCodeFn(
      repairedCode,
      validationOptions,
    );
    const postRepairValidation = toValidationState(
      postRepairValidationResult,
      cliOptions.validationMode,
    );

    const decision = decideFinalOutput(
      {
        code: initialCode,
        validation: initialValidation,
      },
      {
        code: repairedCode,
      },
      {
        postRepair: postRepairValidation,
      },
    );

    if (decision.usedRepairedOutput) {
      return {
        pipelineStatus: decision.pipelineStatus,
        initialCode,
        finalCode: decision.finalCode,
        initialValidation,
        repairAttempted: true,
        repairSucceeded: true,
        postRepairValidation,
        usedRepairedOutput: true,
        repairError: undefined,
        repairFailureReason: null,
        repairResult,
      };
    }

    return {
      pipelineStatus: decision.pipelineStatus,
      initialCode,
      finalCode: decision.finalCode,
      initialValidation,
      repairAttempted: true,
      repairSucceeded: false,
      postRepairValidation,
      usedRepairedOutput: false,
      repairError: decision.repairError,
      repairFailureReason:
        decision.repairError ??
        "Repair did not provide measurable improvement.",
      repairResult,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const repairError = `Repair failed: ${message}`;
    return {
      pipelineStatus: "generated_invalid_repair_failed",
      initialCode,
      finalCode: initialCode,
      initialValidation,
      repairAttempted: true,
      repairSucceeded: false,
      postRepairValidation: null,
      usedRepairedOutput: false,
      repairError,
      repairFailureReason: repairError,
      repairResult: null,
    };
  }
}

export async function runCli(
  argv: string[],
  deps: CliRuntimeDeps = DEFAULT_CLI_RUNTIME_DEPS,
): Promise<number> {
  const cliOptions = parseCliOptions(argv);

  if (cliOptions.designSystem.enabled) {
    deps.log(
      `Design system enabled with profile: ${cliOptions.designSystem.profile}`,
    );
  }

  const pipelineResult = await runGenerationPipeline(cliOptions, deps);

  for (const warning of pipelineResult.initialValidation.warningErrors) {
    deps.log(`[Validation warning] ${warning}`);
  }

  if (pipelineResult.pipelineStatus === "generated_valid") {
    deps.log("Validation passed on first attempt. Repair not executed.");
  }

  if (pipelineResult.pipelineStatus === "generated_invalid_repaired_valid") {
    deps.log(
      `Repair accepted: code is now valid (issues ${pipelineResult.initialValidation.issueCount} -> 0).`,
    );
  }

  if (
    pipelineResult.pipelineStatus === "generated_invalid_repaired_improved" &&
    pipelineResult.postRepairValidation
  ) {
    deps.log(
      `Repair accepted: measurable improvement (issues ${pipelineResult.initialValidation.issueCount} -> ${pipelineResult.postRepairValidation.issueCount}).`,
    );
  }

  if (
    pipelineResult.pipelineStatus === "generated_invalid_repair_no_improvement"
  ) {
    deps.error("Validation failed: no measurable improvement after repair.");
    for (const error of pipelineResult.initialValidation.blockingErrors) {
      deps.error(`- ${error}`);
    }
    return 1;
  }

  if (pipelineResult.pipelineStatus === "generated_invalid_repair_failed") {
    deps.error(
      pipelineResult.repairError ??
        pipelineResult.repairFailureReason ??
        "Validation failed: repair did not produce a usable output.",
    );
    for (const error of pipelineResult.initialValidation.blockingErrors) {
      deps.error(`- ${error}`);
    }
    return 1;
  }

  const outputPath = await deps.writeSectionToDiskFn(
    cliOptions.sectionType,
    pipelineResult.finalCode,
  );

  deps.log(`Pipeline status: ${pipelineResult.pipelineStatus}`);
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
