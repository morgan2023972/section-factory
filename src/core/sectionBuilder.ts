import * as path from "path";
import * as fs from "fs-extra";

const OUTPUT_DIR = path.resolve(process.cwd(), "output", "sections");

function toFileBaseName(sectionName: string): string {
  return (
    sectionName
      .trim()
      .toLowerCase()
      .replace(/\.liquid$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

export async function writeSectionToDisk(
  sectionName: string,
  sectionCode: string,
): Promise<string> {
  if (!sectionCode || !sectionCode.trim()) {
    throw new Error("Section code is empty.");
  }

  const fileName = `${toFileBaseName(sectionName)}.liquid`;
  const outputPath = path.join(OUTPUT_DIR, fileName);

  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeFile(outputPath, sectionCode, "utf8");

  return outputPath;
}
