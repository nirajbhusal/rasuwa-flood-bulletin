import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wx = JSON.parse(readFileSync(new URL("../data/weather-alert.json", import.meta.url), "utf8"));
const geo = JSON.parse(readFileSync(new URL("../data/nepal-districts.geojson", import.meta.url), "utf8"));
const companion = JSON.parse(readFileSync(new URL("../data/dhm-weather-alert.json", import.meta.url), "utf8"));
const raw = JSON.parse(readFileSync(new URL("../data/dhm-12337.json", import.meta.url), "utf8"));
const ids = geo.features.map(function (f) { return f.properties.id; });

const DATES = ["2026-10-05", "2026-10-06", "2026-10-07"];
// [red, orange, yellow, green, rain-icon]
const COUNTS = [
  [0, 0, 0, 77, 12],
  [0, 0, 0, 77, 13],
  [0, 0, 0, 77, 13]
];

test("DHM #12337 alert days cover every district and are all green", function () {
  assert.equal(wx.lead.page_id, 12337);
  assert.equal(wx.id, "2026-10-05-dhm-12337");
  assert.equal(wx.page_ver, "2026-09-25-dhm-12310");
  assert.equal(wx.callout.page_id, 12325);
  assert.equal(ids.length, 77);
  assert.deepEqual(wx.warning_days.map(function (d) { return d.date; }), DATES);
  wx.provinces.forEach(function (p) { assert.equal(p.level, null, p.id); });
  assert.deepEqual(wx.district_warnings, []);
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
    assert.equal(day.districts.rasuwa.level, "green", day.date);
    assert.equal(day.districts.rasuwa.rain, false, day.date);
  });
  const bars = wx.timeline.bars.map(function (b) { return [b.page_id, b.live]; });
  assert.deepEqual(bars, [[12336, false], [12337, true]]);
  assert.equal(wx.callout.expired, true);
  assert.deepEqual(wx.maps.map(function (m) { return m.file; }), [
    "img/dhm/warning-12337-day1.png",
    "img/dhm/warning-12337-day2.png",
    "img/dhm/warning-12337-day3.png"
  ]);
  wx.maps.forEach(function (m) {
    const buf = readFileSync(new URL("../" + m.file, import.meta.url));
    assert.equal(buf.readUInt32BE(16), 1300);
    assert.equal(buf.readUInt32BE(20), 800);
  });
  assert.equal(companion.live_lead, 12337);
  assert.equal(companion.bulletin_32.page_id, 12325);
  assert.equal(raw.id, "12337");
  assert.equal(raw.update_at, wx.lead.api_update_at);
  assert.equal(raw.weather_map_images.length, 3);
  const rawText = readFileSync(new URL("../data/dhm-12337.json", import.meta.url), "utf8");
  assert.equal(rawText.includes("user_id"), false);
  assert.equal(rawText.includes("update_by"), false);
});
