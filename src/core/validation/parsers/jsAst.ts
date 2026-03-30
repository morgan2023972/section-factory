import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";

export interface JsAstIssue {
  ruleId: string;
  message: string;
  path: string;
  confidence: "low" | "medium" | "high";
}

function extractScriptBlocks(sectionCode: string): string[] {
  const scriptBlocks =
    sectionCode.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  return scriptBlocks.map((block) =>
    block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim(),
  );
}

interface IdentifierNode {
  type: "Identifier";
  name: string;
}

interface MemberExpressionNode {
  type: "MemberExpression";
  object: unknown;
  property: unknown;
  computed: boolean;
}

interface CallExpressionNode {
  type: "CallExpression";
  callee: unknown;
}

function isIdentifierNode(node: unknown): node is IdentifierNode {
  return Boolean(
    node &&
    typeof node === "object" &&
    "type" in node &&
    (node as { type: unknown }).type === "Identifier" &&
    "name" in node,
  );
}

function isMemberExpressionNode(node: unknown): node is MemberExpressionNode {
  return Boolean(
    node &&
    typeof node === "object" &&
    "type" in node &&
    (node as { type: unknown }).type === "MemberExpression" &&
    "object" in node &&
    "property" in node,
  );
}

function isCallExpressionNode(node: unknown): node is CallExpressionNode {
  return Boolean(
    node &&
    typeof node === "object" &&
    "type" in node &&
    (node as { type: unknown }).type === "CallExpression" &&
    "callee" in node,
  );
}

function getMemberPropertyName(node: MemberExpressionNode): string | null {
  if (node.computed) {
    return null;
  }

  return isIdentifierNode(node.property) ? node.property.name : null;
}

function isDocumentSelectorAccess(node: unknown): boolean {
  if (!isMemberExpressionNode(node)) {
    return false;
  }

  if (!isIdentifierNode(node.object) || node.object.name !== "document") {
    return false;
  }

  const propertyName = getMemberPropertyName(node);
  if (!propertyName) {
    return false;
  }

  return [
    "querySelector",
    "querySelectorAll",
    "getElementById",
    "getElementsByClassName",
    "getElementsByTagName",
  ].includes(propertyName);
}

function isWindowAccess(node: unknown): boolean {
  return (
    isMemberExpressionNode(node) &&
    isIdentifierNode(node.object) &&
    node.object.name === "window"
  );
}

function isBareGlobalAddEventListener(node: unknown): boolean {
  return (
    isCallExpressionNode(node) &&
    isIdentifierNode(node.callee) &&
    node.callee.name === "addEventListener"
  );
}

export function validateJsAst(sectionCode: string): JsAstIssue[] {
  const issues: JsAstIssue[] = [];
  const scripts = extractScriptBlocks(sectionCode);

  if (scripts.length === 0) {
    return issues;
  }

  const combinedScript = scripts.join("\n\n");
  let ast: acorn.Node;

  try {
    ast = acorn.parse(combinedScript, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowHashBang: true,
    });
  } catch {
    issues.push({
      ruleId: "ast.js.parse_failure",
      message:
        "AST check: unable to parse JavaScript reliably. Keep section scripts syntactically valid.",
      path: "script",
      confidence: "low",
    });
    return issues;
  }

  let foundDocumentAccess = false;
  let foundWindowAccess = false;
  let foundBareEventListener = false;

  acornWalk.full(ast, (node: unknown) => {
    if (foundDocumentAccess && foundWindowAccess && foundBareEventListener) {
      return;
    }

    foundDocumentAccess = foundDocumentAccess || isDocumentSelectorAccess(node);
    foundWindowAccess = foundWindowAccess || isWindowAccess(node);
    foundBareEventListener =
      foundBareEventListener || isBareGlobalAddEventListener(node);
  });

  if (foundDocumentAccess) {
    issues.push({
      ruleId: "ast.js.global_document_access",
      message:
        "AST check: global document selector access detected. Scope JS to the section root.",
      path: "script",
      confidence: "high",
    });
  }

  if (foundWindowAccess) {
    issues.push({
      ruleId: "ast.js.global_window_access",
      message:
        "AST check: window.* access detected. Avoid global JavaScript side effects.",
      path: "script",
      confidence: "high",
    });
  }

  if (foundBareEventListener) {
    issues.push({
      ruleId: "ast.js.global_add_event_listener",
      message:
        "AST check: bare addEventListener(...) detected. Bind listeners from a scoped section root.",
      path: "script",
      confidence: "medium",
    });
  }

  return issues;
}
