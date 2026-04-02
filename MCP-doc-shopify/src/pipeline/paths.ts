import * as path from "node:path";

const PROJECT_ROOT = process.cwd();

export const DOCS_ROOT_DIR = path.join(PROJECT_ROOT, "data", "docs");
export const RAW_DOCS_DIR = path.join(DOCS_ROOT_DIR, "raw");
export const NORMALIZED_DOCS_DIR = path.join(DOCS_ROOT_DIR, "normalized");
export const INDEX_DIR = path.join(DOCS_ROOT_DIR, "index");

export const FETCH_MANIFEST_FILE = path.join(RAW_DOCS_DIR, "manifest.json");
export const INDEX_FILE = path.join(INDEX_DIR, "shopify-docs-index.json");
export const INDEX_SNAPSHOT_FILE = path.join(
  INDEX_DIR,
  "shopify-docs-index.snapshot.json",
);
