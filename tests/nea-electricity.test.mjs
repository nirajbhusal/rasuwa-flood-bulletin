import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const data = JSON.parse(readFileSync(new URL("../data/nea_electricity.json", import.meta.url), "utf8"));
const electricityHtml = readFileSync(new URL("../electricity.html", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const CHECKED = /\+05:45$/;
const NEPAL = { latMin: 26.3, latMax: 30.5, lonMin: 80, lonMax: 88.3 };

function filled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertProvenance(item, label) {
  assert.equal(filled(item.source_url), true, label + " source_url");
  assert.equal(filled(item.source_name), true, label + " source_name");
  assert.match(String(item.checked_at || ""), CHECKED, label + " checked_at " + item.checked_at);
}

test("NEA file has the four blocks", () => {
  assert.ok(Array.isArray(data.planned_shutdowns.rows) && data.planned_shutdowns.rows.length);
  assert.ok(Array.isArray(data.statements.items) && data.statements.items.length);
  assert.ok(Array.isArray(data.damaged_assets.items) && data.damaged_assets.items.length);
  assert.ok(Array.isArray(data.helplines.items) && data.helplines.items.length);
});

test("rows, statement sources, assets, and helplines cite a checked source", () => {
  data.planned_shutdowns.rows.forEach((row, i) => {
    assertProvenance(row, "row " + i);
    assert.equal(filled(row.distribution_centre), true, "row " + i + " dc");
    assert.equal(filled(row.area_ne), true, "row " + i + " area");
    assert.equal(filled(row.start), true, "row " + i + " start");
    assert.equal(filled(row.end), true, "row " + i + " end");
    assert.equal(filled(row.published), true, "row " + i + " published");
    if (row.notice_url != null) assert.equal(row.notice_url.startsWith("https://nea.org.np/"), true, row.notice_url);
  });
  data.statements.items.forEach((item, i) => {
    assert.ok(Array.isArray(item.sources) && item.sources.length, "statement " + i + " sources");
    item.sources.forEach((src, j) => assertProvenance(src, "statement " + i + " source " + j));
  });
  data.damaged_assets.items.forEach((item, i) => assertProvenance(item, "asset " + i));
  data.helplines.items.forEach((item, i) => assertProvenance(item, "helpline " + i));
});

test("mapped assets stay inside Nepal and null latitudes have null longitudes", () => {
  data.damaged_assets.items.forEach((item) => {
    if (item.lat == null) {
      assert.equal(item.lon, null, item.id + " lon");
      return;
    }
    assert.notEqual(item.lon, null, item.id + " lon");
    assert.equal(String(item.coord_source || "").startsWith("https://www.openstreetmap.org/"), true, item.id);
    assert.ok(item.lat >= NEPAL.latMin && item.lat <= NEPAL.latMax, item.id + " lat " + item.lat);
    assert.ok(item.lon >= NEPAL.lonMin && item.lon <= NEPAL.lonMax, item.id + " lon " + item.lon);
  });
});

test("helpline numbers and source hosts", () => {
  data.helplines.items.forEach((item) => {
    assert.ok(Array.isArray(item.numbers) && item.numbers.length, item.category);
    item.numbers.forEach((num) => assert.match(num, /^[0-9+\-]+$/, num));
    const host = new URL(item.source_url).hostname;
    if (item.category === "hotline") {
      assert.equal(item.source_url.startsWith("https://x.com/Hello_NEA/"), true, item.source_url);
    } else {
      assert.equal(host, "nea.org.np", item.source_url);
    }
  });
});

test("electricity page cites the JSON and both source lines", () => {
  assert.match(electricityHtml, /data\/nea_electricity\.json/);
  assert.match(electricityHtml, /स्रोत: नेपाल विद्युत प्राधिकरण \(NEA\)/);
  assert.match(electricityHtml, /Source: Nepal Electricity Authority \(NEA\)/);
});

test("section pages do not draw pin markers or permanent tooltips", () => {
  [electricityHtml, indexHtml].forEach((html) => {
    assert.equal(html.includes("L.marker("), false);
    assert.equal(/bindTooltip\([\s\S]{0,160}permanent:\s*true/.test(html), false);
  });
});
