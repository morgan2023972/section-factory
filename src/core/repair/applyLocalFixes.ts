import type { LocalFixResult } from "./types";

function normalizeWhitespace(input: string): {
  code: string;
  changed: boolean;
} {
  const normalized = input.replace(/\r\n/g, "\n").trimEnd() + "\n";
  return {
    code: normalized,
    changed: normalized !== input,
  };
}

function cleanupTrivialMarkdownWrapper(input: string): {
  code: string;
  changed: boolean;
} {
  const fence = /^\s*```\s*[a-z0-9_-]*\s*\n([\s\S]*?)\n```\s*$/i.exec(input);
  if (!fence) {
    return { code: input, changed: false };
  }

  return {
    code: fence[1],
    changed: true,
  };
}

function addMissingEndSchemaIfSafe(input: string): {
  code: string;
  changed: boolean;
} {
  const schemaOpenMatches = input.match(/{%\s*schema\s*%}/gi) || [];
  const hasEndSchema = /{%\s*endschema\s*%}/i.test(input);

  if (schemaOpenMatches.length !== 1 || hasEndSchema) {
    return { code: input, changed: false };
  }

  return {
    code: `${input.trimEnd()}\n{% endschema %}\n`,
    changed: true,
  };
}

export function applyLocalFixes(codeCandidate: string): LocalFixResult {
  let code = codeCandidate || "";
  const fixesApplied: LocalFixResult["fixesApplied"] = [];

  const wrapperCleanup = cleanupTrivialMarkdownWrapper(code);
  if (wrapperCleanup.changed) {
    code = wrapperCleanup.code;
    fixesApplied.push({
      type: "cleanup.markdown-wrapper",
      description: "Removed an unambiguous outer markdown code fence.",
    });
  }

  const schemaFix = addMissingEndSchemaIfSafe(code);
  if (schemaFix.changed) {
    code = schemaFix.code;
    fixesApplied.push({
      type: "schema.endschema",
      description:
        "Added a missing {% endschema %} after a single schema block.",
    });
  }

  const whitespace = normalizeWhitespace(code);
  if (whitespace.changed) {
    code = whitespace.code;
    fixesApplied.push({
      type: "normalize.whitespace",
      description: "Normalized newlines and trailing whitespace.",
    });
  }

  return {
    code,
    fixed: fixesApplied.length > 0,
    fixesApplied,
  };
}
