import { type OptimizationChange } from "./types";

function removeEmptyHtmlComments(input: string): string {
  return input.replace(/<!--\s*-->/g, "");
}

function trimTrailingWhitespace(input: string): string {
  return input
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

function collapseExcessBlankLines(input: string): string {
  return input.replace(/\n{3,}/g, "\n\n");
}

export function applyCleanup(code: string): {
  code: string;
  changes: OptimizationChange[];
} {
  const changes: OptimizationChange[] = [];
  let nextCode = code;

  const withoutEmptyComments = removeEmptyHtmlComments(nextCode);
  if (withoutEmptyComments !== nextCode) {
    changes.push({
      type: "cleanup",
      location: "markup",
      description: "Removed empty HTML comments.",
      before: "<!-- -->",
      after: "",
    });
    nextCode = withoutEmptyComments;
  }

  const withoutTrailingWhitespace = trimTrailingWhitespace(nextCode);
  if (withoutTrailingWhitespace !== nextCode) {
    changes.push({
      type: "cleanup",
      location: "all",
      description: "Trimmed trailing whitespace.",
      before: "lines with trailing spaces",
      after: "trimmed lines",
    });
    nextCode = withoutTrailingWhitespace;
  }

  const compactedBlankLines = collapseExcessBlankLines(nextCode);
  if (compactedBlankLines !== nextCode) {
    changes.push({
      type: "cleanup",
      location: "all",
      description: "Collapsed excessive blank lines.",
      before: "3+ consecutive newlines",
      after: "2 consecutive newlines",
    });
    nextCode = compactedBlankLines;
  }

  return {
    code: nextCode,
    changes,
  };
}
