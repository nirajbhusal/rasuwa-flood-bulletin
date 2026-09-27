import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");

const ndrrma = JSON.parse(readFileSync(new URL("../data/ndrrma_flood_alerts.json", import.meta.url), "utf8"));
const latest = JSON.parse(readFileSync(new URL("../latest.json", import.meta.url), "utf8"));
const now = JSON.parse(readFileSync(new URL("../data/weather/now.json", import.meta.url), "utf8"));
const poster = readFileSync(new URL("../img/ndrrma/narayani-2083-06-11-0800.jpg", import.meta.url));
const floodJs = readFileSync(new URL("../flood-bulletin.js", import.meta.url), "utf8");
const weatherDb = readFileSync(new URL("../weather-db.js", import.meta.url), "utf8");
const notifyJs = readFileSync(new URL("../notify.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");

function ask(q, lang) {
  return Ask.answer(q, { lang: lang, now: "2026-09-27", ndrrma: ndrrma, t: function () { return ""; } });
}

const enBits = ["11 m", "13.0", "Chitwan", "Nawalparasi East", "Nawalparasi West", "Move to high, safe ground now", "Stay away from river banks", "NDRRMA", "Asoj 11", "8 AM"];
const neBits = ["११", "१३.०", "चितवन", "नवलपरासी पूर्व", "नवलपरासी पश्चिम", "उच्च तथा सुरक्षित स्थानमा जानुहोस्", "किनार र तटिय क्षेत्रबाट टाढा बस्नुहोस्", "NDRRMA", "असोज ११", "८"];

function assertAlert(q, lang) {
  const ans = ask(q, lang);
  assert.equal(ans.intent, "flood_ndrrma", q + " → " + ans.intent + " " + ans.text);
  assert.ok(ans.text && ans.text.length <= 400, q + " length " + ans.text.length);
  assert.equal(/<[a-z!/]/i.test(ans.text), false, ans.text);
  assert.equal(ans.href, "weather.html#ndrrma-flood-alert");
  const bits = lang === "en" ? enBits : neBits;
  bits.forEach(function (bit) {
    assert.ok(ans.text.includes(bit), q + " missing “" + bit + "” in " + ans.text);
  });
  if (lang === "en") assert.equal(/\bwarning\b/i.test(ans.text), false, ans.text);
  return ans;
}

test("NDRRMA Narayani alert file and poster", function () {
  const alert = ndrrma.alerts[0];
  assert.equal(alert.id, "narayani-2083-06-11-0800");
  assert.equal(alert.issued_npt, "2026-09-27T08:00:00+05:45");
  assert.equal(alert.posted_utc, "2026-09-27T03:29:00Z");
  assert.equal(alert.current_m, 11);
  assert.equal(alert.danger_m, 11);
  assert.equal(alert.expected_peak_m, 13);
  assert.equal(alert.image, "img/ndrrma/narayani-2083-06-11-0800.jpg");
  assert.equal(alert.source_url, "https://x.com/NDRRMA_Nepal/status/2104050743875653646");
  assert.deepEqual(alert.districts.map(function (d) { return d.id; }), ["chitwan", "nawalparasi-east", "nawalparasi-west"]);
  assert.equal(/\bwarning\b/i.test(alert.text_en + " " + alert.title_en + " " + alert.lead_en), false);
  assert.equal(createHash("sha256").update(poster).digest("hex"), "fe948d4102c384ab87aa287f3b273ecb5da1441f8b6a49c7de4a26ed9eb4fab4");
  assert.equal(poster.length, 323875);
  assert.equal(poster[0], 0xff);
  assert.equal(poster[1], 0xd8);
});

test("Narayani, Chitwan, Nawalparasi and Devghat questions use the NDRRMA alert", function () {
  [
    ["Narayani", "en"],
    ["नारायणी", "ne"],
    ["Chitwan flood", "en"],
    ["चितवन बाढी", "ne"],
    ["Nawalparasi", "en"],
    ["नवलपरासी", "ne"],
    ["Devghat", "en"],
    ["देवघाट", "ne"],
    ["is Narayani in danger", "en"],
    ["नारायणी खतरामा छ?", "ne"]
  ].forEach(function (row) { assertAlert(row[0], row[1]); });
  const dh = ask("Which rivers are near the alert level?", "en");
  assert.equal(dh.intent, "flood_rivers");
  const place = ask("Rasuwa weather", "en");
  assert.equal(place.intent, "weather_place");
});

test("bell notification, homepage list, and danger card styling", function () {
  assert.equal(latest.id, "2026-09-27-ndrrma-narayani-0800");
  assert.equal(latest.url, "weather.html#ndrrma-flood-alert");
  assert.equal(/\bwarning\b/i.test(latest.body), false);
  assert.match(latest.body, /Special flood alert/);
  assert.match(notifyJs, /weather\.html#ndrrma-flood-alert/);
  assert.match(notifyJs, /notify-feed/);
  assert.match(floodJs, /ndrrma-flood-alert/);
  assert.match(floodJs, /hydrology\.gov\.np live reading/);
  assert.match(weatherDb, /nepalNdrrmCard/);
  assert.match(weatherDb, /data\/ndrrma_flood_alerts\.json/);
  for (const sheet of [css, min]) {
    assert.match(sheet, /\.ndr-alert\{[^}]*border-left:4px solid #c41e3a/);
    assert.match(sheet, /\.notify-feed\[hidden\]\{display:none !important\}/);
  }
  const live = (now.corridor.rivers || []).find(function (row) { return row.id === 265; });
  assert.equal(live.fresh, true);
  assert.equal(typeof live.level_m, "number");
  assert.ok(live.obs_at);
});
