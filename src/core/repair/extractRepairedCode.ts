import type { ExtractedCodeResult } from "./types";

function normalize(code: string): string {
  return code.replace(/\r\n/g, "\n").trim();
}

function hasStrongShopifyMarkers(input: string): boolean {
  const text = normalize(input);
  if (!text) {
    return false;
  }

  if (/{%\s*schema\s*%}[\s\S]*{%\s*endschema\s*%}/i.test(text)) {
    return true;
  }

  if (/{%[^%]+%}/.test(text) && /{{[^}]+}}/.test(text)) {
    return true;
  }

  if (
    /{%\s*(if|for|assign|capture|case|render|include|paginate|form)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}

export function extractRepairedCode(rawResponse: string): ExtractedCodeResult {
  const raw = rawResponse || "";

  const liquidFence = /```\s*liquid\s*\n([\s\S]*?)```/i.exec(raw);
  if (liquidFence) {
    const code = normalize(liquidFence[1]);
    if (code) {
      return {
        extracted: true,
        code,
        metadata: { strategy: "fenced-liquid" },
      };
    }
  }

  const genericFence = /```\s*[a-z0-9_-]*\s*\n([\s\S]*?)```/i.exec(raw);
  if (genericFence) {
    const candidate = normalize(genericFence[1]);
    if (candidate && hasStrongShopifyMarkers(candidate)) {
      return {
        extracted: true,
        code: candidate,
        metadata: { strategy: "fenced-generic" },
      };
    }
  }

  const normalizedRaw = normalize(raw);
  if (normalizedRaw && hasStrongShopifyMarkers(normalizedRaw)) {
    return {
      extracted: true,
      code: normalizedRaw,
      metadata: { strategy: "raw-strong-markers" },
    };
  }

  return {
    extracted: false,
    code: null,
    metadata: { strategy: "none" },
  };
}
