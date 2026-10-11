import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const page = readFileSync(new URL("../budhi-gandaki.html", import.meta.url), "utf8");
const notices = readFileSync(new URL("../notices.html", import.meta.url), "utf8");
const weather = readFileSync(new URL("../weather.html", import.meta.url), "utf8");
const damage = readFileSync(new URL("../damage.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const js = readFileSync(new URL("../budhi-gandaki.js", import.meta.url), "utf8");
const docs = readFileSync(new URL("../docs/budhi-gandaki.md", import.meta.url), "utf8");
const flood = readFileSync(new URL("../data/flood-bulletin.json", import.meta.url), "utf8");
const data = JSON.parse(readFileSync(new URL("../data/budhi-gandaki.json", import.meta.url), "utf8"));
const rivers = JSON.parse(readFileSync(new URL("../dhm-rivers.json", import.meta.url), "utf8"));

function sliceBetween(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}

test("homepage card is a light summary that renders from the data file", function () {
  const budhi = index.indexOf('id="budhi-alert"');
  const prithvi = index.indexOf('id="prithvi-alert"');
  const festival = index.indexOf('id="festival-home"');
  assert.ok(budhi > 0 && budhi < prithvi && prithvi < festival);
  const card = sliceBetween(index, 'id="budhi-alert"', 'id="prithvi-alert"');
  assert.match(card, /data-budhi-home/);
  assert.match(card, /data-budhi-slot/);
  assert.match(card, /data-budhi-updated/);
  assert.match(card, /data-budhi-guide/);
  assert.match(card, /data-i18n="budhi_k">बाढी अलर्ट/);
  assert.match(card, /href="budhi-gandaki\.html"[^>]*data-i18n="budhi_h">बुढीगण्डकी बाढी अपडेट/);
  assert.match(index, /budhi-gandaki\.js/);
  assert.doesNotMatch(card, /<img/i);
  assert.doesNotMatch(card, /budhi-gandaki-aarughat|River Watch/);
  assert.doesNotMatch(index, /<title>[^<]*बुढीगण्डकी बाढी अपडेट/);
  assert.match(index, /<h1 data-i18n="brand">रसुवा–भोटेकोशी बाढी<\/h1>/);
  const light = css.lastIndexOf(".home-flood-alert{");
  const red = css.indexOf(".home-flood-alert{");
  assert.ok(light > red);
  assert.match(css.slice(light), /background:#fffaf5/);
  assert.match(min, /\.home-flood-alert\{\s*background:#fffaf5/);
  assert.match(css, /\.bg-chip\.warn\{[^}]*color:#9a3412/);
  assert.match(css, /\.bg-chip\.ok\{[^}]*color:#14532d/);
  assert.match(css, /\.bg-bar-fill\{background:#c41e3a\}/);
});

test("the update page is a section under the site header and has no screenshots", function () {
  assert.match(page, /<h1 data-i18n="brand">रसुवा–भोटेकोशी बाढी<\/h1>/);
  assert.match(page, /<h1 class="bg-section-h" data-i18n="budhi_h">बुढीगण्डकी बाढी अपडेट<\/h1>/);
  assert.match(page, /data-budhi-page/);
  assert.match(page, /data-budhi-updated/);
  assert.match(page, /budhi-gandaki\.js/);
  const section = sliceBetween(page, 'class="wrap bg-page"', "<footer>");
  assert.doesNotMatch(section, /<img/i);
  assert.doesNotMatch(section, /budhi-gandaki-aarughat|bg-hero/);
  assert.match(page, /href="budhi-gandaki\.html"[^>]*data-i18n="nav_budhi"/);
  for (const html of [notices, weather]) {
    const item = sliceBetween(html, 'id="budhi-gandaki"', "</article>");
    assert.match(item, /href="budhi-gandaki\.html"/);
    assert.doesNotMatch(item, /<img/i);
    assert.doesNotMatch(item, /budhi-gandaki-aarughat/);
  }
  assert.equal(existsSync(new URL("../img/alerts/budhi-gandaki-aarughat-0750.webp", import.meta.url)), false);
});

test("readings, timeline, impact, contacts and photos live in one JSON file", function () {
  assert.equal(data.aarughat.latest.level_m, 8.43);
  assert.equal(data.aarughat.danger_m, 5);
  assert.equal(data.aarughat.warning_m, 4.5);
  assert.equal(data.aarughat.latest.trend, "RISING");
  assert.equal(data.aarughat.history[0].level_m, 5.01);
  assert.equal(data.aarughat.latest.note_en, "No new reading from the Aarughat station since 8:40 AM");
  assert.deepEqual(data.downstream.map(function (s) { return s.level_m; }), [3.95, 3.85, 3.34]);
  assert.deepEqual(data.downstream.map(function (s) { return s.trend; }), ["STEADY", "STEADY", "STEADY"]);
  assert.equal(data.downstream.length, 3);
  assert.deepEqual(data.downstream.map(function (s) { return s.status; }), ["BELOW", "BELOW", "BELOW"]);
  assert.match(data.impact[0].ne, /४ जना सम्पर्कविहीन/);
  assert.equal(data.impact[0].prominent, true);
  assert.doesNotMatch(data.impact.map(function (item) { return item.en; }).join(" "), /\bdead\b|\bkilled\b/i);
  assert.match(data.rescue.map(function (item) { return item.en; }).join(" "), /Sudan Gurung/);
  assert.ok(data.sources.some(function (s) { return s.href.indexOf("ehimalayatimes.com/2026/10/489376") >= 0; }));
  assert.equal(JSON.stringify(data).indexOf("20-22"), -1);
  assert.equal(data.photos.length, 3);
  for (const photo of data.photos) {
    assert.match(photo.src, /^img\/budhi\/aerial-[123]\.webp$/);
    const file = new URL("../" + photo.src, import.meta.url);
    assert.ok(statSync(file).size < 200 * 1024, photo.src);
  }
  assert.ok(data.timeline.length >= 7);
  assert.match(data.impact.map(function (item) { return item.en; }).join(" "), /No official casualty figure yet/);
  assert.deepEqual(data.contacts.filter(function (c) { return c.home; }).map(function (c) { return c.num; }), ["1234", "102", "100", "9856061190", "9856057777"]);
  assert.equal(data.rescue.length, 3);
  assert.match(js, /Current status/);
  assert.match(js, /See all →/);
  assert.match(js, /तल्लोतटीय नदी/);
  assert.match(data.contact_source, /nepalpolice\.gov\.np\/about-us\/information-officer/);
  assert.match(js, /data\/budhi-gandaki\.json/);
  assert.match(js, /data-budhi-page/);
  const home = sliceBetween(js, "function homeHtml", "function downRows");
  assert.doesNotMatch(home, /contact_source/);
  assert.match(docs, /aarughat\.latest/);
  assert.match(docs, /timeline/);
  const aarughat = rivers.stations.find(function (s) { return s.station_id === 445; });
  assert.equal(aarughat.level_m, 8.43);
  assert.equal(aarughat.danger_m, 5);
  assert.equal(aarughat.steady, "RISING");
  const enBlock = i18n.slice(i18n.indexOf('"budhi_k": "Flood alert"'), i18n.indexOf("};window.I18N_LISTS"));
  assert.match(enBlock, /"budhi_h": "Budhi Gandaki Flood Update"/);
  assert.match(enBlock, /"nav_budhi": "Budhi Gandaki Flood Update"/);
  assert.equal(/\bwarning\b/i.test(enBlock), false);
  assert.match(i18n, /Flood alert: big flood coming down the Budhi Gandaki from Chumnubri-6/);
  assert.match(damage, /lat:28\.441949, lng:84\.9177789, kind:"alert"/);
  assert.match(damage, /lat:27\.81427, lng:84\.78218, kind:"alert"/);
  assert.equal(JSON.parse(flood).present.above.length, 0);
});
