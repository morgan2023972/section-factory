import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { ValidationIssue } from "../../src/core/repair";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures", "repair");

export async function readRepairTestFixture(name: string): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, name);
  return readFile(filePath, "utf8");
}

export function normalizeRepairLiquid(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toValidationIssues(errors: string[]): ValidationIssue[] {
  return errors.map((message) => ({
    path: "section",
    message,
    severity: "error",
  }));
}

export function extractCodeFromPrompt(prompt: string): string {
  const marker = "Code to repair:\n";
  const index = prompt.lastIndexOf(marker);
  if (index < 0) {
    return "";
  }

  return prompt.slice(index + marker.length).trim();
}

export function makeSchemaBlock(name: string): string {
  return [
    "{% schema %}",
    "{",
    `  \"name\": \"${name}\",`,
    '  "settings": [],',
    '  "blocks": [],',
    '  "presets": [{ "name": "Default" }]',
    "}",
    "{% endschema %}",
  ].join("\n");
}

export function extractSchemaJson(code: string): string | null {
  const match = code.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
  return match?.[1]?.trim() ?? null;
}

export function parseSchemaObject(
  code: string,
): Record<string, unknown> | null {
  const schemaJson = extractSchemaJson(code);
  if (!schemaJson) {
    return null;
  }

  try {
    return JSON.parse(schemaJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function applyStructuralRepairHeuristics(
  code: string,
  schemaName = "Auto Repaired",
): string {
  let next = code;

  if (!/{%\s*schema\s*%}/i.test(next)) {
    next = `${next.trimEnd()}\n\n${makeSchemaBlock(schemaName)}`;
  }

  if (/{%\s*schema\s*%}[\s\S]*{%\s*endschema\s*%}/i.test(next)) {
    next = next.replace(
      /{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/i,
      makeSchemaBlock(schemaName),
    );
  }

  if (/{%\s*schema\s*%}/i.test(next) && !/{%\s*endschema\s*%}/i.test(next)) {
    next = `${next.trimEnd()}\n{% endschema %}`;
  }

  const ifOpen = (next.match(/{%\s*if\b/gi) || []).length;
  const ifClose = (next.match(/{%\s*endif\s*%}/gi) || []).length;
  if (ifOpen > ifClose) {
    next = `${next.trimEnd()}\n{% endif %}`;
  }

  const forOpen = (next.match(/{%\s*for\b/gi) || []).length;
  const forClose = (next.match(/{%\s*endfor\s*%}/gi) || []).length;
  if (forOpen > forClose) {
    next = `${next.trimEnd()}\n{% endfor %}`;
  }

  return next;
}
