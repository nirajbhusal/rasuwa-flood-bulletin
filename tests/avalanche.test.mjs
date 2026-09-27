import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");
const root = new URL("..", import.meta.url);

function read(name) {
  return readFileSync(new URL(name, root), "utf8");
}

const doc = JSON.parse(read("data/avalanche.json"));
const notices = read("notices.html");
const nav = read("nav-menu.js");

function ask(q, lang) {
  return Ask.answer(q, { lang: lang, avalanche: doc, now: "2026-09-27" });
}

function englishStrings(node, key, out) {
  if (node == null) return;
  if (typeof node === "string") {
    if (key === "en" || (/[A-Za-z]/.test(node) && !/[\u0900-\u097F]/.test(node))) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(function (item) { englishStrings(item, key, out); });
    return;
  }
  if (typeof node === "object") {
    Object.keys(node).forEach(function (k) { englishStrings(node[k], k, out); });
  }
}

test("avalanche figures are the published 10, with null dead injured rescued", function () {
  const figs = doc.incidents[0].figures;
  assert.equal(figs.unaccounted, 10);
  const sum = figs.breakdown.reduce(function (n, row) { return n + row.count; }, 0);
  assert.equal(sum, 10);
  assert.equal(figs.dead, null);
  assert.equal(figs.injured, null);
  assert.equal(figs.rescued, null);
});

test("avalanche sources are https and the NDRRMA letter is in the repo", function () {
  doc.incidents[0].sources.forEach(function (src) {
    assert.equal(src.url.startsWith("https://"), true, src.url);
  });
  doc.official_alerts.forEach(function (row) {
    assert.equal(row.url.startsWith("https://"), true, row.url);
  });
  const path = doc.official_alerts[0].image.repo_path;
  assert.equal(path, "img/ndrrma/high-alert-2026-09-23.jpg");
  assert.equal(existsSync(new URL(path, root)), true);
});

test("no English avalanche string says warning", function () {
  const bits = [];
  englishStrings(doc, "", bits);
  bits.forEach(function (text) {
    assert.equal(/warning/i.test(text), false, text);
  });
});

test("avalanche section sits above the heavy-rain alert and loads its script", function () {
  const ava = notices.indexOf('id="avalanche"');
  const alert = notices.indexOf('id="alert"');
  assert.ok(ava >= 0 && alert > ava);
  assert.match(notices, /<script defer src="avalanche\.js/);
  assert.match(notices, /id="avalanche-mount"/);
  assert.match(notices, /data-i18n="h_avalanche"/);
});

test("ask routes Himlung and Manaslu to avalanche and leaves flood cause alone", function () {
  const himlung = ask("Himlung avalanche", "en");
  assert.equal(himlung.intent, "avalanche");
  assert.ok(himlung.text.includes("10"), himlung.text);
  assert.ok(himlung.text.includes("Himlung"), himlung.text);
  assert.equal(/warning/i.test(himlung.text), false);

  const ne = ask("हिमलुङ हिमपहिरो", "ne");
  assert.equal(ne.intent, "avalanche");
  assert.ok(ne.text.includes("१०"), ne.text);

  assert.equal(ask("हिमलुङमा कति बेपत्ता?", "ne").intent, "avalanche");
  assert.equal(ask("avalanche news", "en").intent, "avalanche");

  const manaslu = ask("Manaslu avalanche", "en");
  assert.equal(manaslu.intent, "avalanche");
  assert.ok(manaslu.text.includes("Manaslu"), manaslu.text);

  assert.equal(ask("what caused the flood", "en").intent, "cause");
  assert.equal(ask("बाढी किन आयो?", "ne").intent, "cause");
  assert.equal(ask("Langtang avalanche", "en").intent, "cause");
  assert.equal(ask("हिमपहिरोले बाढी किन आयो", "ne").intent, "cause");
});

test("nav GROUPS stay the same six groups and hrefs", function () {
  const src = nav.slice(nav.indexOf("var GROUPS"), nav.indexOf("var ICONS"));
  const keys = [...src.matchAll(/key:\s*"([^"]+)"/g)].map(function (m) { return m[1]; });
  assert.deepEqual(keys, ["home", "alerts", "people", "gov", "relief", "more"]);
  const hrefs = [];
  for (const m of src.matchAll(/hrefs:\s*\[([^\]]*)\]/g)) {
    for (const h of m[1].matchAll(/"([^"]+)"/g)) hrefs.push(h[1]);
  }
  assert.deepEqual(hrefs, [
    "index.html",
    "notices.html",
    "notices.html#roads",
    "electricity.html",
    "weather.html",
    "photos.html",
    "names.html",
    "contact.html",
    "gov.html",
    "markets.html",
    "donate.html",
    "response.html",
    "damage.html",
    "supply.html",
    "about.html"
  ]);
});
