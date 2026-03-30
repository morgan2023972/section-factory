import { type OptimizationChange } from "./types";

function minifyInlineCss(sectionCode: string): string {
  return sectionCode.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (_full, attrs: string, cssContent: string) => {
      const minified = cssContent
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,>])\s*/g, "$1")
        .trim();
      return `<style${attrs}>${minified}</style>`;
    },
  );
}

function minifyInlineJs(sectionCode: string): string {
  return sectionCode.replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    (_full, attrs: string, jsContent: string) => {
      const withoutLineComments = jsContent.replace(/^\s*\/\/.*$/gm, "");
      const minified = withoutLineComments
        .replace(/\s+/g, " ")
        .replace(/\s*([{}();,=:+\-*/<>])\s*/g, "$1")
        .trim();
      return `<script${attrs}>${minified}</script>`;
    },
  );
}

export function applyMinification(code: string): {
  code: string;
  changes: OptimizationChange[];
} {
  const changes: OptimizationChange[] = [];
  let nextCode = code;

  const cssMinified = minifyInlineCss(nextCode);
  if (cssMinified !== nextCode) {
    changes.push({
      type: "minification",
      location: "style",
      description: "Minified inline CSS blocks.",
      before: "formatted CSS",
      after: "compact CSS",
    });
    nextCode = cssMinified;
  }

  const jsMinified = minifyInlineJs(nextCode);
  if (jsMinified !== nextCode) {
    changes.push({
      type: "minification",
      location: "script",
      description: "Minified inline JavaScript blocks.",
      before: "formatted JS",
      after: "compact JS",
    });
    nextCode = jsMinified;
  }

  return {
    code: nextCode,
    changes,
  };
}
