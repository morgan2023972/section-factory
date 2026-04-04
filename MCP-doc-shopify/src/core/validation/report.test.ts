import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalysisResult } from "./buildAnalysisResult.js";
import { buildValidationReport } from "./buildValidationReport.js";
import { computeVerdict } from "./computeVerdict.js";

test("computeVerdict returns fail on blocking business diagnostic", () => {
  const result = computeVerdict({
    diagnostics: [
      {
        id: "schema-required",
        category: "business",
        title: "schema",
        severity: "error",
        blocking: true,
        message: "schema missing",
        recommendation: "add schema",
        sourceUrls: [],
        legacyOrigin: "core-rule",
      },
    ],
    analysisLimitations: [],
    criticalUnknownSignals: [],
  });

  assert.equal(result.verdict, "fail");
});

test("computeVerdict returns inconclusive for high-impact limitation", () => {
  const result = computeVerdict({
    diagnostics: [],
    analysisLimitations: [
      {
        code: "schema_analysis_incomplete",
        message: "incomplete",
        impact: "high",
      },
    ],
    criticalUnknownSignals: [],
  });

  assert.equal(result.verdict, "inconclusive");
  assert.equal(result.inconclusiveSignals.length > 0, true);
});

test("buildValidationReport aggregates diagnostics and summary", () => {
  const analysis = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
      },
      settings: { count: 2 },
      blocks: { count: 1 },
      presets: { count: 1 },
    },
    documents: [],
  });

  const report = buildValidationReport({
    analysisResult: analysis,
    diagnostics: [
      {
        id: "presets-availability",
        origin: "core-rule",
        severity: "warning",
        blocking: false,
        title: "presets",
        message: "missing presets",
        recommendation: "add presets",
        sourceUrls: [],
      },
    ],
    technicalGuidance: [],
    documentaryHints: [],
  });

  assert.equal(report.requestedMode, "full");
  assert.equal(report.effectiveMode, "full");
  assert.equal(report.forcedByConfig, false);
  assert.equal(report.downgradedDiagnosticsCount, 0);
  assert.equal(report.qualityDiagnostics.length, 1);
  assert.equal(report.summary.qualityCount, 1);
});

test("buildValidationReport downgrades final verdict in report-only mode", () => {
  const analysis = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: false,
        isValid: false,
        errors: ["missing_schema"],
      },
      settings: { count: 0 },
      blocks: { count: 0 },
      presets: { count: 0 },
    },
    documents: [],
  });

  const report = buildValidationReport({
    analysisResult: analysis,
    diagnostics: [
      {
        id: "schema-required",
        origin: "core-rule",
        severity: "error",
        blocking: true,
        title: "schema",
        message: "schema missing",
        recommendation: "add schema",
        sourceUrls: [],
      },
    ],
    technicalGuidance: [],
    documentaryHints: [],
    modeResolution: {
      requestedMode: "full",
      effectiveMode: "report-only",
      forcedByConfig: true,
    },
  });

  assert.equal(report.requestedMode, "full");
  assert.equal(report.effectiveMode, "report-only");
  assert.equal(report.forcedByConfig, true);
  assert.equal(report.verdict, "pass_with_warnings");
  assert.equal(report.downgradedDiagnosticsCount, 1);
});

test("buildValidationReport keeps verdict independent from guidance and documentary hints", () => {
  const analysis = buildAnalysisResult({
    guides: [],
    validationSignals: {
      schema: {
        exists: true,
        isValid: true,
      },
      settings: { count: 1 },
      blocks: { count: 0 },
      presets: { count: 1 },
    },
    documents: [],
  });

  const report = buildValidationReport({
    analysisResult: analysis,
    diagnostics: [],
    technicalGuidance: [
      {
        id: "os2-compatibility",
        title: "OS2",
        category: "compatibility",
        message: "guidance",
        recommendation: "recommendation",
        sourceUrls: ["shopify://guides/sections"],
      },
    ],
    documentaryHints: [
      {
        id: "schema-hints",
        topic: "schema",
        confidence: "high",
        message: "hint",
        recommendation: "recommendation",
        sourceUrls: ["https://shopify.dev/docs/schema"],
      },
    ],
  });

  assert.equal(report.verdict, "pass");
  assert.equal(report.businessDiagnostics.length, 0);
  assert.equal(report.qualityDiagnostics.length, 0);
  assert.equal(report.summary.technicalGuidanceCount, 1);
  assert.equal(report.summary.documentaryHintCount, 1);
});
