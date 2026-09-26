import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wx = JSON.parse(readFileSync(new URL("../data/weather-alert.json", import.meta.url), "utf8"));
const geo = JSON.parse(readFileSync(new URL("../data/nepal-districts.geojson", import.meta.url), "utf8"));
const companion = JSON.parse(readFileSync(new URL("../data/dhm-weather-alert.json", import.meta.url), "utf8"));
const raw = JSON.parse(readFileSync(new URL("../data/dhm-12312.json", import.meta.url), "utf8"));
const ids = geo.features.map(function (f) { return f.properties.id; });

const DATES = ["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"];
const COUNTS = [
  [14, 34, 29, 0, 28],
  [0, 22, 33, 22, 26],
  [0, 0, 0, 77, 18],
  [0, 0, 0, 77, 12],
  [0, 0, 0, 77, 12]
];
const RED_ASOJ_10 = [
  "gorkha", "kaski", "lamjung", "syangja", "manang", "kapilbastu", "rupandehi",
  "arghakhanchi", "gulmi", "palpa", "baglung", "myagdi", "parbat", "mustang"
];

test("DHM #12312 warning days cover every district", function () {
  assert.equal(wx.lead.page_id, 12312);
  assert.equal(wx.id, "2026-09-26-dhm-12312");
  assert.equal(wx.page_ver, "2026-09-25-dhm-12310");
  assert.equal(wx.callout.page_id, 12311);
  assert.equal(ids.length, 77);
  assert.deepEqual(wx.warning_days.map(function (d) { return d.date; }), DATES);
  wx.warning_days.forEach(function (day, i) {
    const got = Object.keys(day.districts);
    assert.equal(got.length, 77, day.date);
    assert.deepEqual(got.slice().sort(), ids.slice().sort());
    const c = { red: 0, orange: 0, yellow: 0, green: 0, rain: 0 };
    got.forEach(function (id) {
      const rec = day.districts[id];
      assert.ok(c[rec.level] != null, rec.level);
      c[rec.level] += 1;
      if (rec.rain) c.rain += 1;
    });
    assert.deepEqual([c.red, c.orange, c.yellow, c.green, c.rain], COUNTS[i], day.date);
  });
  const day1 = wx.warning_days[0].districts;
  assert.deepEqual(
    RED_ASOJ_10.filter(function (id) { return day1[id].level === "red"; }).sort(),
    RED_ASOJ_10.slice().sort()
  );
  assert.equal(day1.rasuwa.level, "orange");
  assert.equal(day1.rasuwa.rain, false);
  assert.equal(wx.warning_days[1].districts.rasuwa.level, "yellow");
  assert.equal(wx.warning_days[1].districts.rasuwa.rain, false);
  ["2026-09-28", "2026-09-29", "2026-09-30"].forEach(function (date) {
    const rec = wx.warning_days.find(function (d) { return d.date === date; }).districts.rasuwa;
    assert.equal(rec.level, "green");
    assert.equal(!!rec.rain, false);
  });
  const bars = wx.timeline.bars.map(function (b) { return [b.page_id, b.live, b.start, b.end]; });
  assert.deepEqual(bars, [
    [12311, true, 0, 2.38],
    [12310, false, 0, 3.85],
    [12312, true, 0, 4.85]
  ]);
  assert.deepEqual(wx.maps.map(function (m) { return m.file; }), [
    "img/dhm/warning-12312-day1.png",
    "img/dhm/warning-12312-day2.png",
    "img/dhm/warning-12312-day3.png",
    "img/dhm/warning-12312-day4.png",
    "img/dhm/warning-12312-day5.png"
  ]);
  wx.maps.forEach(function (m) {
    const buf = readFileSync(new URL("../" + m.file, import.meta.url));
    assert.equal(buf.readUInt32BE(16), 1300);
    assert.equal(buf.readUInt32BE(20), 800);
  });
  assert.equal(companion.live_lead, 12312);
  assert.equal(companion.bulletin_27.page_id, 12311);
  assert.equal(raw.id, "12312");
  assert.equal(raw.update_at, wx.lead.api_update_at);
  assert.equal(raw.weather_map_images.length, 5);
});
