import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");

const dash = JSON.parse(readFileSync(new URL("../api/dashboard.json", import.meta.url), "utf8"));
const sitrep = JSON.parse(readFileSync(new URL("../data/ndrrma_sitrep_2283.json", import.meta.url), "utf8"));
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const notices = readFileSync(new URL("../notices.html", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");
const search = readFileSync(new URL("../site-search.js", import.meta.url), "utf8");

test("flood casualty board stays on SitRep #16 figures", function () {
  const dead = dash.cards.find(function (card) { return card.id === "dead"; });
  const rescued = dash.cards.find(function (card) { return card.id === "rescued"; });
  assert.equal(dead.value, 1451);
  assert.equal(rescued.value, 13784);
  assert.equal(sitrep.number, 2283);
  assert.equal(sitrep.last_24h.incidents, 24);
  assert.equal(sitrep.last_24h.deaths, 0);
  assert.equal(sitrep.last_24h.injured, 9);
  assert.equal(sitrep.last_24h.estimated_loss_npr, 2590000);
  assert.equal(sitrep.last_24h.livestock_loss, 25);
  assert.equal(sitrep.fy_cumulative.incidents, 7103);
  assert.equal(sitrep.fy_cumulative.deaths, 362);
  assert.equal(sitrep.fy_cumulative.injured, 2284);
  assert.equal(sitrep.fy_cumulative.affected_families, 9056);
  assert.equal(sitrep.rainfall_24h.max_mm, 75.4);
});

test("homepage card sits after the weather map and before Nepal now", function () {
  const status = index.indexOf('id="home-status"');
  const map = index.indexOf('id="wx-home"');
  const card = index.indexOf('id="sitrep-home"');
  const now = index.indexOf('id="wxdb-home"');
  const people = index.indexOf('id="overview"');
  assert.ok(status < map && map < card && card < now && now < people);
  assert.match(index, /sitrep-home\.js/);
  assert.match(css, /\.sitrep-card\{/);
  assert.match(min, /\.sitrep-card\{/);
  assert.match(search, /2283/);
  assert.match(search, /आजको विपद्/);
});

test("notices history leads with SitRep #2283 and English stays aligned", function () {
  const start = notices.indexOf('id="history-list"');
  const block = notices.slice(start);
  assert.match(block, /id="sitrep-2283"/);
  assert.ok(block.indexOf("SitRep #2283") < block.indexOf("असोज १६"));
  assert.match(block, /घटना २४/);
  assert.match(block, /२५,९०,०००/);
  assert.match(block, /sitrep2283-p1\.jpg/);
  assert.match(block, /sitrep2283-p3\.jpg/);
  const histAt = i18n.indexOf('"hist": [');
  const histEnd = i18n.indexOf('\n],\n"alert"', histAt);
  const hist = i18n.slice(histAt, histEnd);
  assert.ok(hist.startsWith('"hist": ['));
  assert.ok(hist.indexOf("SitRep #2283") < hist.indexOf("Asoj 16 evening"));
  assert.equal(/\bwarning\b/i.test(hist.slice(0, hist.indexOf("Asoj 16 evening"))), false);
});

test("ask credits Dhakeri from both DHM and NDRRMA without a new rain figure", function () {
  const wxnow = JSON.parse(readFileSync(new URL("../data/weather/now.json", import.meta.url), "utf8"));
  const ans = Ask.answer("where did it rain the most", {
    lang: "en",
    now: "2026-10-05",
    wxnow: wxnow,
    sitrep: sitrep,
    t: function () { return ""; }
  });
  assert.equal(ans.intent, "weather_top_rain");
  assert.match(ans.text, /75\.4 mm/);
  assert.match(ans.text, /Dhakeri, Banke/);
  assert.match(ans.source, /NDRRMA SitRep #2283/);
  assert.equal((ans.text.match(/75\.4/g) || []).length, 1);
  assert.equal(/\bwarning\b/i.test(ans.text + ans.source), false);
});
