import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { runAstRuleRouter } from "../../src/core/validation/ruleRouter";
import {
  AST_RULE_CONFIG_ENV_VAR,
  resetAstRulePolicyCacheForTests,
} from "../../src/core/validation/astRuleConfig";

const originalConfigEnv = process.env[AST_RULE_CONFIG_ENV_VAR];

function resetConfigEnv(): void {
  if (originalConfigEnv === undefined) {
    delete process.env[AST_RULE_CONFIG_ENV_VAR];
    return;
  }

  process.env[AST_RULE_CONFIG_ENV_VAR] = originalConfigEnv;
}

describe("AST rule router config", () => {
  it("returns warnings in advisory phase", () => {
    const sectionCode = `
<div class="section-{{ section.id }}">
  <img src="/x.jpg">
</div>
<style>
.section-{{ section.id }} { color: #111; }
</style>
{% schema %}
{
  "name": "Sample",
  "settings": [],
  "blocks": [],
  "presets": [{ "name": "Sample" }]
}
{% endschema %}
`.trim();

    const result = runAstRuleRouter(sectionCode, "advisory");

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(
      result.diagnostics.every(
        (diagnostic) => diagnostic.severity === "warning",
      ),
    ).toBe(true);
    expect(result.blockingErrors).toHaveLength(0);
  });

  it("applies per-rule block severity policy", () => {
    const sectionCode = `
<div class="section-{{ section.id }}">
  <h2>Title</h2>
</div>
<script>
(() => {
  document.querySelector('.foo');
  addEventListener('resize', () => {});
})();
</script>
<style>
.section-{{ section.id }} { color: #111; }
</style>
{% schema %}
{
  "name": "Sample",
  "settings": [],
  "blocks": [],
  "presets": [{ "name": "Sample" }]
}
{% endschema %}
`.trim();

    const result = runAstRuleRouter(sectionCode, "block");

    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.ruleId === "ast.js.global_document_access" &&
          diagnostic.severity === "error",
      ),
    ).toBe(true);

    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.ruleId === "ast.js.global_add_event_listener" &&
          diagnostic.severity === "warning",
      ),
    ).toBe(true);

    expect(
      result.blockingErrors.some((message) =>
        message.includes("global document selector access"),
      ),
    ).toBe(true);
  });

  it("loads external JSON policy overrides at runtime", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sf-ast-policy-"));
    const policyPath = path.join(tempDir, "ast-policy.json");
    try {
      await fs.writeJson(
        policyPath,
        {
          "ast.js.global_add_event_listener": {
            block: "error",
          },
        },
        { spaces: 2 },
      );

      process.env[AST_RULE_CONFIG_ENV_VAR] = policyPath;
      resetAstRulePolicyCacheForTests();

      const sectionCode = `
<div class="section-{{ section.id }}">
  <h2>Title</h2>
</div>
<script>
(() => {
  addEventListener('resize', () => {});
})();
</script>
<style>
.section-{{ section.id }} { color: #111; }
</style>
{% schema %}
{
  "name": "Sample",
  "settings": [],
  "blocks": [],
  "presets": [{ "name": "Sample" }]
}
{% endschema %}
`.trim();

      const result = runAstRuleRouter(sectionCode, "block");

      expect(
        result.diagnostics.some(
          (diagnostic) =>
            diagnostic.ruleId === "ast.js.global_add_event_listener" &&
            diagnostic.severity === "error",
        ),
      ).toBe(true);
      expect(result.blockingErrors.length).toBeGreaterThan(0);
    } finally {
      await fs.remove(tempDir);
      resetConfigEnv();
      resetAstRulePolicyCacheForTests();
    }
  });
});
