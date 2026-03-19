import * as dotenv from "dotenv";
import { getEnabledSectionTypes } from "./core/section-types/registry";

dotenv.config();

function hasArg(flag: string): boolean {
  return process.argv.includes(flag);
}

function handleListTypesCommand(): void {
  const sectionTypes = getEnabledSectionTypes();

  console.log("Available section types:\n");

  const idWidth = Math.max(...sectionTypes.map((type) => type.id.length), 4);
  const labelWidth = Math.max(
    ...sectionTypes.map((type) => type.label.length),
    5,
  );

  for (const sectionType of sectionTypes) {
    console.log(
      `- ${sectionType.id.padEnd(idWidth)} | ${sectionType.label.padEnd(labelWidth)} | ${sectionType.category}`,
    );
    console.log(`  ${sectionType.description}`);
    console.log("");
  }
}

export function startFactory(): void {
  if (hasArg("--list-types")) {
    handleListTypesCommand();
    return;
  }

  console.log("Section Factory started");
}

startFactory();
