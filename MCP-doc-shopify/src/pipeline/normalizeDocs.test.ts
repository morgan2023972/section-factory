import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDocumentSummary,
  chunkStructuredTextBlocks,
  extractRuleCandidateSignals,
  extractStructuredTextBlocks,
} from "./normalizeDocs.js";

test("extractStructuredTextBlocks keeps heading context and strips noise", () => {
  const html = `
    <html>
      <head>
        <style>.x { color: red; }</style>
        <script>window.__ignored = true;</script>
      </head>
      <body>
        <h2>Schema</h2>
        <p>Settings should be explicit.</p>
        <p>Blocks are recommended.</p>
      </body>
    </html>
  `;

  const blocks = extractStructuredTextBlocks(html);

  assert.equal(blocks.length >= 2, true);
  assert.equal(blocks[0]?.sectionHint, "Schema");
  assert.equal(
    blocks.some((b) => b.text.includes("window.__ignored")),
    false,
  );
  assert.equal(
    blocks.some((b) => b.text.includes("Settings should be explicit.")),
    true,
  );
});

test("buildDocumentSummary prefers sentence boundary", () => {
  const text =
    "Schema settings should be explicit and coherent. Blocks should expose configurable content. Presets should provide discoverability for merchants.";

  const summary = buildDocumentSummary(text, 95);

  assert.equal(summary.endsWith("."), true);
  assert.equal(summary.includes("discoverability"), false);
});

test("buildDocumentSummary returns fallback for empty text", () => {
  const summary = buildDocumentSummary("   ");

  assert.equal(
    summary,
    "No documentary excerpt available from normalized content.",
  );
});

test("chunkStructuredTextBlocks keeps chunks bounded and contextualized", () => {
  const blocks = [
    {
      sectionHint: "Schema",
      text: "Settings should be clear and blocks should be reusable for merchants.",
    },
    {
      sectionHint: "Schema",
      text: "Presets should be available and names should be practical for the editor.",
    },
  ];

  const chunks = chunkStructuredTextBlocks(blocks, 90);

  assert.equal(chunks.length >= 2, true);
  assert.equal(
    chunks.every((chunk) => chunk.text.length <= 90),
    true,
  );
  assert.equal(
    chunks.every((chunk) => chunk.sectionHint === "Schema"),
    true,
  );
});

test("extractRuleCandidateSignals ranks normative candidates first", () => {
  const blocks = [
    {
      sectionHint: "Schema Rules",
      text: "You can explore examples. Section schema must include settings and blocks for editor configuration.",
    },
    {
      sectionHint: "Guidelines",
      text: "Use semantic markup where possible. Presets are recommended for discoverability.",
    },
  ];

  const signals = extractRuleCandidateSignals(blocks, 5);

  assert.equal(signals.length > 0, true);
  assert.equal(
    signals[0]?.text.includes("must include settings and blocks"),
    true,
  );
  assert.equal(
    signals[0]?.confidence === "high" || signals[0]?.confidence === "medium",
    true,
  );
});

test("extractRuleCandidateSignals deduplicates equivalent sentences", () => {
  const blocks = [
    {
      sectionHint: "Schema",
      text: "Section schema should include presets for merchants.",
    },
    {
      sectionHint: "Schema",
      text: "Section schema should include presets for merchants!",
    },
  ];

  const signals = extractRuleCandidateSignals(blocks, 8);

  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.text.includes("presets for merchants"), true);
});

test("extractRuleCandidateSignals is deterministic on tie scores", () => {
  const blocks = [
    {
      sectionHint: "Guidelines",
      text: "Use concise labels for settings. Use clear IDs for settings.",
    },
  ];

  const firstRun = extractRuleCandidateSignals(blocks, 8).map((s) => s.text);
  const secondRun = extractRuleCandidateSignals(blocks, 8).map((s) => s.text);

  assert.deepEqual(firstRun, secondRun);
});
