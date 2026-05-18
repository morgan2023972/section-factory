[![Status](https://img.shields.io/badge/status-private_alpha-orange)](#current-status)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](#quick-start-cli)
[![TypeScript](https://img.shields.io/badge/typescript-cli-3178C6)](#quick-start-cli)
[![License](https://img.shields.io/badge/license-TBD-lightgrey)](#license)

# Section Factory

A safer workflow for generating, validating, repairing, and exporting Shopify Liquid sections.

Section Factory is a developer-first CLI that helps Shopify teams move faster with AI-assisted custom Liquid section workflows while keeping validation, repair, optimization, and export steps explicit.

## What Is Section Factory?

Section Factory is a Node.js + TypeScript CLI focused on custom Shopify section workflows. It is designed for teams who want to move faster with AI-assisted generation while keeping technical quality gates in place before shipping code to themes.

## Why This Exists

Building custom Shopify sections is often repetitive and time-consuming.

Raw AI output can be useful, but it is frequently fragile in real theme contexts. Production-ready sections must respect Liquid conventions, section schema rules, settings structure, CSS scoping, and theme compatibility constraints.

Section Factory exists to provide a more reliable workflow for developers who still want control and review, not a black-box generator.

## Who Is This For?

- Shopify developers
- Shopify freelancers
- Small Shopify agencies
- Theme developers
- Product builders working with Shopify automation

## Current Status

**Section Factory is currently in private alpha.**

Today, the product is available as a developer-oriented CLI. The current goal is to validate and harden the end-to-end workflow before packaging a broader product experience.

## What It Does Today

- Generate Shopify section files
- Validate generated or existing sections
- Attempt repair when validation fails
- Produce optimization reports
- Export ready-to-use Liquid section files
- Provide CLI diagnostics through a `doctor` command
- Support a section type registry

## What It Is Not Yet

Section Factory is not yet:

- A public SaaS
- A Shopify App Store app
- A no-code page builder
- A finished commercial product
- A replacement for developer review

## How It Works

```text
prompt -> generate -> validate -> repair -> optimize -> export
```

The pipeline is intentionally explicit so each step can be inspected, tested, and improved.

## Quick Start (CLI)

### Requirements

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Common Commands

```bash
# List available section types
npm run list-sections

# Generate a section (example)
npm run generate -- hero

# Validate a section file
npm run validate -- output/sections/hero.liquid

# Attempt repair on a section file
npm run repair -- output/sections/hero.liquid

# Produce optimization report
npm run optimize -- output/sections/hero.liquid

# Run environment diagnostics
npm run doctor
```

## Technical Direction

Section Factory is being built as a robust foundation first (CLI + validation + repair + optimization). The longer-term direction is to evolve this workflow into a more packaged SaaS/API or platform experience once reliability is proven.

## Join The Private Alpha

Section Factory is currently looking for a small number of Shopify developers, freelancers, and small agencies to provide feedback on real section-building workflows.

If you regularly build custom Shopify sections and want to follow or test the project, you can:

- Watch this repository
- Open an issue with feedback
- Contact me on LinkedIn
- Join the early access list: coming soon

## Security And Scope

- This public repository is a technical and product showcase.
- Premium prompts, private strategy, and sensitive operational data are intentionally excluded.
- Do not commit API keys or secrets in issues, pull requests, or examples.

## Feedback

Feedback and issue reports are welcome, especially from Shopify developers testing real theme workflows.

If you want to follow the alpha progression, watch the repository and check release notes.

## License

License details are currently being evaluated.

Until a license is explicitly added, this repository should be considered source-available for review and feedback, not open-source for unrestricted reuse.
