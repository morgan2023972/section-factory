import * as dotenv from "dotenv";
import {
  DEFAULT_DESIGN_PROFILE,
  DESIGN_PROFILE_NAMES,
  getDesignProfile,
} from "./prompts/designSystemProfiles";
import { getEnabledSectionTypes } from "./core/section-types/registry";
import { getAliasesForSectionType } from "./cli/sectionTypeMapping";

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

export function startFactory(argv: string[] = process.argv): void {
  if (hasArg("--list-sections", argv) || hasArg("--list-section", argv)) {
    handleListSectionsCommand(console.log);
    return;
  }

  if (hasArg("--list-types", argv)) {
    handleListSectionsCommand(console.log);
    return;
  }

  if (hasArg("--list-profiles", argv)) {
    handleListProfilesCommand(console.log);
    return;
  }

  console.log("Section Factory started");
}

if (require.main === module) {
  startFactory(process.argv);
}
