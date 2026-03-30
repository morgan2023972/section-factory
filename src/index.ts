import * as dotenv from "dotenv";
import {
  DEFAULT_DESIGN_PROFILE,
  DESIGN_PROFILE_NAMES,
  getDesignProfile,
} from "./prompts/designSystemProfiles";
import { getEnabledSectionTypes } from "./core/section-types/registry";
import { getAliasesForSectionType } from "./cli/sectionTypeMapping";
import {
  AST_RULE_CONFIG_ENV_VAR,
  getAstRulePolicySnapshot,
} from "./core/validation/astRuleConfig";

dotenv.config();

function hasArg(flag: string, argv: string[]): boolean {
  return argv.includes(flag);
}

function handleListSectionsCommand(log: (message: string) => void): void {
  const sectionTypes = getEnabledSectionTypes();

  log("Available sections:\n");

  type SectionRow = {
    type: string;
    alias: string;
    description: string;
    designSystem: string;
  };

  const rows: SectionRow[] = sectionTypes.map((sectionType) => {
    const aliases = getAliasesForSectionType(sectionType.id);

    return {
      type: sectionType.id,
      alias: aliases.length > 0 ? aliases.join(", ") : "-",
      description: sectionType.description,
      designSystem: sectionType.supportsDesignSystem ? "yes" : "no",
    };
  });

  log("type | alias | description | design-system");
  log("--- | --- | --- | ---");

  for (const row of rows) {
    log(
      `${row.type} | ${row.alias} | ${row.description} | ${row.designSystem}`,
    );
  }
}

function handleListProfilesCommand(log: (message: string) => void): void {
  log("Available design profiles:\n");

  for (const profileName of DESIGN_PROFILE_NAMES) {
    const profile = getDesignProfile(profileName);
    const defaultMarker =
      profileName === DEFAULT_DESIGN_PROFILE ? " (default)" : "";

    log(`- ${profileName}${defaultMarker}`);
    log(`  ${profile.globalStyle}`);
    log("");
  }
}

function handleShowAstPolicyCommand(log: (message: string) => void): void {
  const snapshot = getAstRulePolicySnapshot();

  log(
    JSON.stringify(
      {
        source: "ast-policy-runtime",
        configPath: snapshot.configPath,
        loadedFromEnv: snapshot.loadedFromEnv,
        envVar: AST_RULE_CONFIG_ENV_VAR,
        ruleCount: Object.keys(snapshot.policies).length,
        policies: snapshot.policies,
      },
      null,
      2,
    ),
  );
}

export function startFactory(argv: string[] = process.argv): void {
  if (hasArg("--list-sections", argv)) {
    handleListSectionsCommand(console.log);
    return;
  }

  if (hasArg("--list-section", argv)) {
    console.error(
      'Unsupported option: "--list-section" was removed. Use "--list-sections" instead.',
    );
    return;
  }

  if (hasArg("--list-types", argv)) {
    console.warn(
      'Deprecation warning: "--list-types" will be removed in 2 releases. Use "--list-sections" instead.',
    );
    handleListSectionsCommand(console.log);
    return;
  }

  if (hasArg("--list-profiles", argv)) {
    handleListProfilesCommand(console.log);
    return;
  }

  if (hasArg("--show-ast-policy", argv)) {
    handleShowAstPolicyCommand(console.log);
    return;
  }

  console.log("Section Factory started");
}

if (require.main === module) {
  startFactory(process.argv);
}
