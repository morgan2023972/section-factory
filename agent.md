# AGENTS.md

## 🎯 Project Overview

This project is a private desktop application used to generate high-quality Shopify theme sections using AI.

The system focuses on:

- reusable Shopify sections
- high configurability for merchants
- clean and production-ready Liquid code
- compatibility with most Shopify themes

---

## 🧠 General Behavior

- Always prioritize correctness over speed
- Never generate incomplete Shopify section files
- Always return production-ready code
- Avoid assumptions about specific Shopify themes
- Keep outputs clean, structured, and maintainable

---

## 🛠 MCP Usage Rules

### Shopify MCP (shopifyDocs)

Use `shopifyDocs` MCP whenever the task involves:

- Shopify section rules
- Liquid structure
- `{% schema %}` format
- settings, blocks, presets
- theme compatibility

Always retrieve:

- section constraints
- schema guidelines
- recommended settings

---

### OpenAI MCP (openaiDeveloperDocs)

Use `openaiDeveloperDocs` MCP whenever the task involves:

- OpenAI API usage
- prompt design
- model selection
- generation strategies
- tool usage

---

## 🧱 Shopify Section Requirements

Every generated section MUST:

- Be fully independent and reusable
- Include a valid `{% schema %}` block
- Include `settings` for merchant customization
- Avoid hardcoded content when configurable
- Avoid global CSS leaks
- Use scoped CSS and JS where needed
- Be compatible with most Shopify themes
- Follow semantic HTML best practices

---

## ⚙️ Generation Workflow

When generating a section, follow this pipeline:

1. Retrieve Shopify rules from `shopifyDocs`
2. Retrieve schema guidance from `shopifyDocs`
3. Build a structured prompt
4. Generate the section code
5. Validate the output (structure, schema, configurability)
6. Fix issues if needed
7. Output a complete `.liquid` file

---

## 🧩 Section Design Guidelines

- Prefer flexibility over visual rigidity
- Use settings for all editable content
- Use blocks for repeatable elements
- Avoid unnecessary complexity
- Optimize for performance and readability

---

## 🎨 Supported Section Categories

Common categories include:

- hero
- faq
- testimonials
- feature grid
- rich text
- announcement bar
- countdown
- before/after

---

## 🚫 Things to Avoid

- Do not generate partial code
- Do not omit the schema
- Do not rely on global styles
- Do not hardcode merchant content
- Do not assume a specific theme structure

---

## ✅ Expected Output Format

- Always return a complete Shopify `.liquid` section file
- Include:
  - HTML markup
  - schema block
  - optional scoped CSS/JS
- Code must be clean and ready to use

---

## 🔁 Iteration Strategy

If validation fails:

- Identify issues clearly
- Fix them immediately
- Return an improved version

---

## 🧠 Agent Mindset

Act as:

- a senior Shopify theme developer
- a strict code reviewer
- a system-oriented engineer

The goal is not just to generate code, but to generate **sellable Shopify sections**.
