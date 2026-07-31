#!/usr/bin/env node

/**
 * Reproducible real-world compatibility sweep.
 *
 * Clones the official Stylus repository and nib at pinned revisions, parses
 * every non-empty .styl file with the local grammar, and fails if any file
 * produces ERROR or MISSING nodes, or if the file count drifts from the
 * recorded baseline.
 *
 * Environment overrides:
 *   SWEEP_STYLUS_REF   git ref for stylus/stylus (default: 0.64.0 tag)
 *   SWEEP_NIB_REF      git ref for stylus/nib (default: v1.2.0 tag)
 *   SWEEP_CACHE_DIR    clone cache (default: .sweep-cache)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STYLUS_REF = process.env.SWEEP_STYLUS_REF ?? "0.64.0";
const NIB_REF = process.env.SWEEP_NIB_REF ?? "v1.2.0";
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE_DIR = path.resolve(ROOT, process.env.SWEEP_CACHE_DIR ?? ".sweep-cache");

const EXPECTED_FILES = 499;

function cloneIfMissing(name, repo, ref) {
  const target = path.join(CACHE_DIR, name);
  if (existsSync(path.join(target, ".git"))) return target;

  mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`Cloning ${repo}@${ref} into ${target}`);
  execFileSync(
    "git",
    ["clone", "--depth", "1", "--branch", ref, "--quiet", repo, target],
    { stdio: "inherit" },
  );
  return target;
}

function collectStylusFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectStylusFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".styl")) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const stylus = cloneIfMissing("stylus", "https://github.com/stylus/stylus.git", STYLUS_REF);
  const nib = cloneIfMissing("nib", "https://github.com/stylus/nib.git", NIB_REF);

  const files = [...collectStylusFiles(stylus), ...collectStylusFiles(nib)]
    .filter((file) => readFileSync(file, "utf8").trim().length > 0)
    .sort();

  console.log(`Parsing ${files.length} non-empty .styl files...`);
  if (files.length !== EXPECTED_FILES) {
    console.error(
      `FAIL: expected ${EXPECTED_FILES} files at the pinned revisions, found ${files.length}. ` +
        `Update EXPECTED_FILES after reviewing the drift.`,
    );
    process.exit(1);
  }

  const chunkSize = 200;
  let failures = 0;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    let output;
    try {
      output = execFileSync(
        "npx",
        ["tree-sitter", "parse", "--quiet", ...chunk],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (error) {
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    const errorMatch = output.match(/\(ERROR|\(MISSING/g);
    if (errorMatch) {
      failures += errorMatch.length;
      const lines = output.split("\n").filter((line) => /ERROR|MISSING/.test(line));
      console.error(lines.slice(0, 10).join("\n"));
    }
  }

  if (failures > 0) {
    console.error(`FAIL: ${failures} ERROR/MISSING nodes across ${files.length} files.`);
    process.exit(1);
  }

  console.log(`OK: ${files.length} files parsed with 0 ERROR and 0 MISSING nodes.`);
}

main();
