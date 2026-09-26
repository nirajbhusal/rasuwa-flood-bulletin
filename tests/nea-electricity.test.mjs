import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const data = JSON.parse(readFileSync(new URL("../data/nea_electricity.json", import.meta.url), "utf8"));
const electricityHtml = readFileSync(new URL("../electricity.html", import.meta.url), "utf8");
const electricityJs = readFileSync(new URL("../electricity.js", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

const districts = JSON.parse(readFileSync(new URL("../data/nepal-districts-svg.json", import.meta.url), "utf8"));

const CHECKED = /\+05:45$/;
const NEPAL = { latMin: 26.3, latMax: 30.5, lonMin: 80, lonMax: 88.3 };
const incident = data.incidents[0];

function filled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertProvenance(item, label) {
  assert.equal(filled(item.source_url), true, label + " source_url");
  assert.equal(filled(item.source_name), true, label + " source_name");
  assert.match(String(item.checked_at || ""), CHECKED, label + " checked_at " + item.checked_at);
}

test("NEA file has the schema v2 blocks", () => {
  assert.ok(data.alert && typeof data.alert === "object");
  assert.ok(data.alert_summary && typeof data.alert_summary === "object");
  assert.ok(Array.isArray(data.alert_outages) && data.alert_outages.length);
  assert.ok(Array.isArray(data.alert_feed) && data.alert_feed.length);
  assert.ok(Array.isArray(data.advisories) && data.advisories.length);
  assert.ok(Array.isArray(data.planned_shutdowns.rows) && data.planned_shutdowns.rows.length);
  assert.ok(incident && Array.isArray(incident.statements.items) && incident.statements.items.length);
  assert.ok(Array.isArray(incident.damaged_assets.items) && incident.damaged_assets.items.length);
  assert.ok(Array.isArray(data.helplines.items) && data.helplines.items.length);
  assert.equal(data.statements, undefined);
  assert.equal(data.damaged_assets, undefined);
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
  incident.statements.items.forEach((item, i) => {
    assert.ok(Array.isArray(item.sources) && item.sources.length, "statement " + i + " sources");
    item.sources.forEach((src, j) => assertProvenance(src, "statement " + i + " source " + j));
  });
  incident.damaged_assets.items.forEach((item, i) => assertProvenance(item, "asset " + i));
  data.alert_outages.forEach((item, i) => {
    assertProvenance(item, "outage " + i);
    assert.ok(Array.isArray(item.sources) && item.sources.length, "outage " + i + " sources");
    item.sources.forEach((src, j) => assertProvenance(src, "outage " + i + " source " + j));
    item.assets.forEach((asset, j) => {
      assert.equal(filled(asset.source_url), true, "outage asset " + asset.id + " source_url");
    });
  });
  data.advisories.forEach((item, i) => {
    assert.ok(Array.isArray(item.sources) && item.sources.length, "advisory " + i + " sources");
    item.sources.forEach((src, j) => assertProvenance(src, "advisory " + i + " source " + j));
  });
  data.helplines.items.forEach((item, i) => assertProvenance(item, "helpline " + i));
});

test("mapped assets stay inside Nepal and null latitudes have null longitudes", () => {
  const assets = incident.damaged_assets.items.concat(data.alert_outages.flatMap((item) => item.assets || []));
  assets.forEach((item) => {
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

test("alert feed, districts, and planned rows stay consistent", () => {
  const districtIds = new Set((districts.districts || []).map((item) => item.id));
  data.alert_district_status.forEach((row) => {
    assert.equal(districtIds.has(row.district_id), true, row.district_id);
  });
  assert.equal(data.alert_summary.outage_items, data.alert_outages.length);
  const assetCount = data.alert_outages.reduce((n, item) => n + (item.assets || []).length, 0);
  assert.equal(data.alert_summary.assets_listed, assetCount);
  const supply = data.alert_district_status.filter((row) => row.status === "disrupted" || row.status === "partly_disrupted").length;
  assert.equal(data.alert_summary.districts_supply_affected, supply);
  const outages = new Set(data.alert_outages.map((item) => item.id));
  const advisories = new Set(data.advisories.map((item) => item.id));
  data.alert_feed.forEach((entry) => {
    const pool = entry.ref === "advisories" ? advisories : outages;
    assert.equal(pool.has(entry.id), true, entry.id);
  });
  data.planned_shutdowns.rows.forEach((row) => {
    assert.ok(row.status_at_check === "upcoming" || row.status_at_check === "ongoing", row.status_at_check);
  });
});

test("electricity visual is wired to existing NEA ids only", () => {
  assert.equal((electricityHtml.match(/<title>/g) || []).length, 1);
  assert.equal((electricityHtml.match(/class="[^"]*elec-pagehead[^"]*"/g) || []).length, 1);
  assert.match(electricityHtml, /id="power-alert"/);
  assert.match(electricityHtml, /id="incidents"/);
  assert.ok(electricityHtml.indexOf('id="power-alert"') < electricityHtml.indexOf('id="shutdowns"'));
  assert.ok(electricityHtml.indexOf('id="shutdowns"') < electricityHtml.indexOf('id="incidents"'));
  assert.ok(electricityHtml.indexOf('id="incidents"') < electricityHtml.indexOf('id="helplines"'));
  assert.match(indexHtml, /id="dash-electricity"/);
  assert.match(indexHtml, /id="dash-elec-figs"/);
  assert.equal(indexHtml.includes('id="elec-dash-flow"'), false);
  assert.ok(indexHtml.indexOf('id="overview"') < indexHtml.indexOf('id="dash-electricity"'));
  assert.ok(indexHtml.indexOf('id="dash-electricity"') < indexHtml.indexOf('id="cat-electricity"'));
  assert.equal(indexHtml.includes('id="elec-home-viz"'), false);
  assert.match(indexHtml, /id="cat-electricity"/);
  assert.equal(electricityHtml.includes("L.marker("), false);
  assert.equal(/\b405\b/.test(electricityJs), false);
  assert.equal(/176\.1/.test(electricityJs), false);
  const knownAssets = new Set(incident.damaged_assets.items.map((item) => item.id));
  const knownStatements = new Set(incident.statements.items.map((item) => item.id));
  for (const match of electricityJs.matchAll(/needAsset:\s*"([a-z0-9_]+)"/g)) {
    assert.equal(knownAssets.has(match[1]), true, match[1]);
  }
  for (const match of electricityJs.matchAll(/needStmt:\s*"(nea-[0-9-]+)"/g)) {
    assert.equal(knownStatements.has(match[1]), true, match[1]);
  }
  for (const match of electricityJs.matchAll(/stmtById\("(nea-[0-9-]+)"\)/g)) {
    assert.equal(knownStatements.has(match[1]), true, match[1]);
  }
});

test("section pages do not draw pin markers or permanent tooltips", () => {
  [electricityHtml, indexHtml].forEach((html) => {
    assert.equal(html.includes("L.marker("), false);
    assert.equal(/bindTooltip\([\s\S]{0,160}permanent:\s*true/.test(html), false);
  });
});
