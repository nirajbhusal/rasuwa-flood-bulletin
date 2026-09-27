import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wx = JSON.parse(readFileSync(new URL("../data/weather-alert.json", import.meta.url), "utf8"));
const geo = JSON.parse(readFileSync(new URL("../data/nepal-districts.geojson", import.meta.url), "utf8"));
const companion = JSON.parse(readFileSync(new URL("../data/dhm-weather-alert.json", import.meta.url), "utf8"));
const raw = JSON.parse(readFileSync(new URL("../data/dhm-12315.json", import.meta.url), "utf8"));
const ids = geo.features.map(function (f) { return f.properties.id; });

const DATES = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"];
const COUNTS = [
  [8, 22, 31, 16, 25],
  [0, 0, 0, 77, 18],
  [0, 0, 0, 77, 12],
  [0, 0, 0, 77, 12],
  [0, 0, 0, 77, 12]
];
const RED_ASOJ_11 = [
  "parsa", "chitwan", "syangja", "tanahu", "nawalparasi-east",
  "nawalparasi-west", "rupandehi", "palpa"
];
const RASUWA = ["yellow", "green", "green", "green", "green"];

test("DHM #12315 alert days cover every district", function () {
  assert.equal(wx.lead.page_id, 12315);
  assert.equal(wx.id, "2026-09-27-dhm-12315");
  assert.equal(wx.page_ver, "2026-09-25-dhm-12310");
  assert.equal(wx.callout.page_id, 12311);
  assert.equal(ids.length, 77);
  assert.deepEqual(wx.warning_days.map(function (d) { return d.date; }), DATES);
  const koshi = wx.provinces.find(function (p) { return p.id === "koshi"; });
  assert.equal(koshi.level, null);
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
    const rasuwa = day.districts.rasuwa;
    assert.equal(rasuwa.level, RASUWA[i], day.date);
    assert.equal(rasuwa.rain, false, day.date);
  });
  const day1 = wx.warning_days[0].districts;
  assert.deepEqual(
    RED_ASOJ_11.filter(function (id) { return day1[id].level === "red"; }).sort(),
    RED_ASOJ_11.slice().sort()
  );
  const bars = wx.timeline.bars.map(function (b) { return [b.page_id, b.live, b.start, b.end]; });
  assert.deepEqual(bars, [
    [12311, true, 0, 1.38],
    [12312, false, 0, 3.85],
    [12315, true, 0, 4.85]
  ]);
  assert.deepEqual(wx.maps.map(function (m) { return m.file; }), [
    "img/dhm/warning-12315-day1.png",
    "img/dhm/warning-12315-day2.png",
    "img/dhm/warning-12315-day3.png",
    "img/dhm/warning-12315-day4.png",
    "img/dhm/warning-12315-day5.png"
  ]);
  wx.maps.forEach(function (m) {
    const buf = readFileSync(new URL("../" + m.file, import.meta.url));
    assert.equal(buf.readUInt32BE(16), 1300);
    assert.equal(buf.readUInt32BE(20), 800);
  });
  assert.equal(companion.live_lead, 12315);
  assert.equal(companion.bulletin_27.page_id, 12311);
  assert.equal(companion.warning.content, "पहिलो दिनको चेतावनी नक्शा आज मध्यान्न सम्मका लागि मध्यनजर गर्दै जारी भएको ।");
  assert.equal(raw.id, "12315");
  assert.equal(raw.update_at, wx.lead.api_update_at);
  assert.equal(raw.weather_map_images.length, 5);
  const rawText = readFileSync(new URL("../data/dhm-12315.json", import.meta.url), "utf8");
  assert.equal(rawText.includes("user_id"), false);
  assert.equal(rawText.includes("update_by"), false);
});
