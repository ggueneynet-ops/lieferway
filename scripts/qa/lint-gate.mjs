#!/usr/bin/env node
/**
 * Release-gate wrapper around ESLint.
 *
 * The freeze inherited a set of `react-hooks` / `prefer-const` errors from the
 * eslint-config-next 16 upgrade. Fixing them means touching working runtime
 * code, which the freeze forbids, but CI still has to block *new* violations.
 *
 * So the gate compares the current report against `qa/lint-baseline.json`
 * (errors per file per rule) and fails only on regressions.
 *
 *   node scripts/qa/lint-gate.mjs            # gate (CI)
 *   node scripts/qa/lint-gate.mjs --update   # rewrite the baseline after fixes
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baselinePath = join(repoRoot, "qa", "lint-baseline.json");
const update = process.argv.includes("--update");

function runEslint() {
  const bin = join(repoRoot, "node_modules", ".bin", "eslint");
  const result = spawnSync(bin, ["--format", "json"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    console.error(`[lint-gate] could not run eslint: ${result.error.message}`);
    process.exit(1);
  }
  const raw = (result.stdout ?? "").trim();
  if (!raw) {
    console.error("[lint-gate] eslint produced no JSON report");
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[lint-gate] eslint report was not valid JSON");
    console.error(raw.slice(0, 2000));
    process.exit(1);
  }
}

/** `{ "src/x.tsx": { "rule/id": 2 } }` for severity=2 messages only. */
function fingerprint(report) {
  const files = {};
  let errors = 0;
  let warnings = 0;
  for (const file of report) {
    const path = relative(repoRoot, file.filePath).split("\\").join("/");
    for (const message of file.messages) {
      if (message.severity === 1) {
        warnings += 1;
        continue;
      }
      if (message.severity !== 2) continue;
      errors += 1;
      const rule = message.ruleId ?? "(no-rule)";
      files[path] ??= {};
      files[path][rule] = (files[path][rule] ?? 0) + 1;
    }
  }
  const sortedFiles = {};
  for (const path of Object.keys(files).sort()) {
    sortedFiles[path] = Object.fromEntries(
      Object.entries(files[path]).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return { totals: { errors, warnings }, files: sortedFiles };
}

function readBaseline() {
  if (!existsSync(baselinePath)) return { totals: { errors: 0, warnings: 0 }, files: {} };
  try {
    const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
    return { totals: parsed.totals ?? { errors: 0, warnings: 0 }, files: parsed.files ?? {} };
  } catch {
    console.error(`[lint-gate] ${relative(repoRoot, baselinePath)} is not valid JSON`);
    process.exit(1);
  }
}

const current = fingerprint(runEslint());

if (update) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        note: "Accepted lint debt during the QA/Release Gate freeze. Errors per file per rule; regressions fail `npm run lint:gate`. Refresh with `npm run lint:baseline` after a cleanup PR.",
        generatedAt: new Date().toISOString().slice(0, 10),
        totals: current.totals,
        files: current.files,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `[lint-gate] baseline written: ${current.totals.errors} errors, ${current.totals.warnings} warnings`,
  );
  process.exit(0);
}

const baseline = readBaseline();
const regressions = [];
const improvements = [];

for (const [path, rules] of Object.entries(current.files)) {
  for (const [rule, count] of Object.entries(rules)) {
    const allowed = baseline.files[path]?.[rule] ?? 0;
    if (count > allowed) {
      regressions.push(`${path}  ${rule}  ${allowed} allowed → ${count} found`);
    } else if (count < allowed) {
      improvements.push(`${path}  ${rule}  ${allowed} → ${count}`);
    }
  }
}

for (const [path, rules] of Object.entries(baseline.files)) {
  for (const [rule, count] of Object.entries(rules)) {
    if (!current.files[path]?.[rule]) improvements.push(`${path}  ${rule}  ${count} → 0`);
  }
}

console.log(
  `[lint-gate] current: ${current.totals.errors} errors, ${current.totals.warnings} warnings ` +
    `(baseline: ${baseline.totals.errors} errors)`,
);

if (improvements.length > 0) {
  console.log("[lint-gate] fixed since baseline — run `npm run lint:baseline` to lock it in:");
  for (const line of improvements) console.log(`  - ${line}`);
}

if (regressions.length > 0) {
  console.error(`[lint-gate] FAIL — ${regressions.length} new lint error(s):`);
  for (const line of regressions) console.error(`  - ${line}`);
  console.error("[lint-gate] fix them, or run `npx eslint` locally for full context.");
  process.exit(1);
}

console.log("[lint-gate] PASS — no new lint errors.");
