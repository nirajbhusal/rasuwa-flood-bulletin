import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
function read(rel) {
  return readFileSync(new URL(rel, root), "utf8");
}

test("publication 455 is the people board and SitRep #2283 stays a daily bulletin", function () {
  const dash = JSON.parse(read("api/dashboard.json"));
  const flood = JSON.parse(read("data/ndrrma_flood_update_2083-06-17.json"));
  const sitrep = JSON.parse(read("data/ndrrma_sitrep_2283.json"));
  const index = read("index.html");
  assert.equal(flood.publication_id, 455);
  assert.equal(flood.kpis.dead, 1455);
  assert.equal(flood.kpis.missing, 5285);
  assert.equal(flood.kpis.rescued, 13795);
  assert.equal(flood.kpis.in_treatment, 3);
  assert.equal(flood.kpis.deployed, 20477);
  assert.equal(dash.cards.find(function (c) { return c.id === "dead"; }).value, 1455);
  assert.equal(sitrep.number, 2283);
  assert.equal(sitrep.last_24h.deaths, 0);
  assert.match(index, /१,४५५/);
  assert.match(index, /२०,४७७/);
  assert.equal(index.includes("२०,९२९"), false);
  assert.match(index, /यस बोर्डमा निकाय विभाजन छैन/);
  assert.equal(existsSync(new URL("img/ndrrma/flood-update-2083-06-17-board.png", root)), false);
  assert.equal(JSON.stringify(flood).includes(".jpg"), false);
  assert.equal(JSON.stringify(flood).includes(".png"), false);
});

test("electricity keeps one flood incident and six upcoming Valley shutdowns", function () {
  const nea = JSON.parse(read("data/nea_electricity.json"));
  const rows = nea.planned_shutdowns.rows;
  assert.equal(nea.alert.active, false);
  assert.equal(nea.incidents.length, 1);
  assert.equal(nea.incidents[0].id, "bhotekoshi-trishuli-2026-08-26");
  assert.equal(rows.length, 6);
  assert.ok(rows.every(function (row) { return row.status_at_check === "upcoming"; }));
  assert.match(rows[0].start, /^2026-10-06/);
  assert.match(rows[5].start, /^2026-10-12/);
  assert.equal(existsSync(new URL("img/nea/KVWDSEP-Cha-no-83-84-57.pdf", root)), true);
});

test("roads stay on NEOC Asoj 19 and Police Asoj 17, with a DoR recheck line", function () {
  const roads = read("roads-dor.js");
  assert.match(roads, /neoc_roads_2083-06-19-0700\.json/);
  assert.match(roads, /police_roads_2083-06-17-0645\.json/);
  assert.match(roads, /dor_navigate_recheck_2026-10-05\.json/);
  assert.match(roads, /including NH42/);
  const recheck = JSON.parse(read("data/dor_navigate_recheck_2026-10-05.json"));
  assert.equal(recheck.counts.closed, 4);
  assert.ok(recheck.closed_scrubbed.some(function (row) { return row.road_refno === "NH42" && row.closure_type === "CLOSED"; }));
  assert.equal(JSON.stringify(recheck).includes("contact_person"), false);
});

test("nowcast leads with 51.8 mm at Maipokhari and keeps the 15.6 mm hour", function () {
  const alert = JSON.parse(read("data/weather-alert.json"));
  const n = alert.nowcast;
  assert.match(n.max.en, /51\.8 mm/);
  assert.match(n.max.en, /Maipokhari, Ilam/);
  assert.match(n.max.ne, /माइपोखरी/);
  assert.match(n.prior.en, /15\.6 mm/);
  assert.match(n.prior.en, /Udayapur Gadhi/);
  assert.equal(Object.prototype.hasOwnProperty.call(n, "image"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(n, "image_w"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(n, "image_h"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(n, "image_alt"), false);
  assert.equal(existsSync(new URL("img/dhm/rainfall-now-3h-2026-10-05-1435.jpg", root)), false);
  assert.equal(existsSync(new URL("img/dhm/rainfall-now-1h.jpg", root)), false);
  assert.equal(n.cite[0].url, "https://x.com/NMD_Weather/status/2107030728592838988");
  assert.equal(n.cite[2].url, "https://dhm.gov.np/mfd/");
  const wx = read("weather-alert.js");
  const nowcastFn = wx.slice(wx.indexOf("function buildNowcast("), wx.indexOf("function colorCounts("));
  const homeFn = wx.slice(wx.indexOf("function buildHomeNowcast("), wx.indexOf("function sectionLink("));
  assert.equal(nowcastFn.includes("wxb-nowthumb"), false);
  assert.equal(nowcastFn.includes("createElement(\"img\")"), false);
  assert.equal(homeFn.includes("wxb-nowthumb"), false);
  assert.equal(homeFn.includes("createElement(\"img\")"), false);
  assert.match(nowcastFn, /हालको वर्षा/);
  assert.match(homeFn, /buildCite\(n\.cite\)/);
  assert.match(wx, /wxb-rain-gif/);
  const notices = read("notices.html");
  assert.equal(notices.includes("bulletin-12296-districts.png"), false);
  assert.match(notices, /id="wx-12294"/);
  assert.match(notices, /data-i18n="wx_b25_map"/);
  assert.match(notices, /weather-warning\/12296/);
  assert.equal(/\bwarning\b/i.test(n.max.en + n.body.en + n.prior.en), false);
  const home = read("home-status.js");
  assert.match(home, /tx\(n\.max\)/);
  assert.match(home, /All rivers below the alert level/);
});
