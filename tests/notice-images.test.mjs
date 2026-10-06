import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url);
const rootPath = new URL("..", import.meta.url).pathname;

/** Hosted scans of official notices, sitreps, and bulletin pages. */
const SCAN = new RegExp(
  "(?:img|assets)\\/[^\\\"'\\\\\\s<>]*?(?:" +
  [
    "npns-[^/\\\"'\\\\\\s]*notice",
    "sitrep",
    "flood-bulletin-",
    "nepal-police",
    "neoc-roads",
    "police-highway",
    "high-alert",
    "narayani-",
    "flood-update-",
    "ndrrma-road",
    "foreign-rescued",
    "lpg-import",
    "lpg-sheet",
    "fonepay-core",
    "nchl-",
    "pmdrf-",
    "rdna-",
    "us-state-",
    "trishuli1-indians",
    "warning-\\d",
    "warning-2026",
    "x_nepalpolicehq"
  ].join("|") +
  ")[^\\\"'\\\\\\s<>]*\\.(?:jpg|jpeg|png|webp|gif)",
  "i"
);

const SKIP = new Set(["node_modules", ".git", "tests"]);
const TEXT = new Set([".html", ".js", ".mjs", ".json", ".css", ".py", ".xml", ".md", ".txt", ".webmanifest"]);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else out.push(path);
  }
}

test("source does not reference hosted notice, sitrep, or bulletin scans", function () {
  const files = [];
  walk(rootPath, files);
  const hits = [];
  files.forEach(function (path) {
    const ext = path.slice(path.lastIndexOf("."));
    if (!TEXT.has(ext)) return;
    const text = readFileSync(path, "utf8");
    const found = text.match(SCAN);
    if (found) hits.push(relative(rootPath, path) + " → " + found[0]);
  });
  assert.deepEqual(hits, []);
});

test("notice-scan image files are not in the repo", function () {
  const files = [];
  walk(rootPath, files);
  const hits = files.filter(function (path) {
    return SCAN.test(path) && existsSync(path);
  }).map(function (path) { return relative(rootPath, path); });
  assert.deepEqual(hits, []);
});
