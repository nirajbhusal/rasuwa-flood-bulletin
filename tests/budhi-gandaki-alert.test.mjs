import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const notices = readFileSync(new URL("../notices.html", import.meta.url), "utf8");
const weather = readFileSync(new URL("../weather.html", import.meta.url), "utf8");
const damage = readFileSync(new URL("../damage.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const flood = readFileSync(new URL("../data/flood-bulletin.json", import.meta.url), "utf8");

const enHeadline = "Flood alert: big flood coming down the Budhi Gandaki from Chumnubri-6. Stay away from the river all the way to the Trishuli confluence until it passes; move to high ground.";

function sliceBetween(text, start, end) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}

test("homepage red alert sits above the Prithvi card and links to the river page", function () {
  const budhi = index.indexOf('id="budhi-alert"');
  const prithvi = index.indexOf('id="prithvi-alert"');
  const festival = index.indexOf('id="festival-home"');
  assert.ok(budhi > 0 && budhi < prithvi && prithvi < festival);
  assert.match(index, /class="home-flood-alert"/);
  assert.match(index, /href="weather\.html#budhi-gandaki"/);
  assert.match(index, /href="tel:1234"/);
  assert.match(index, /href="tel:100"/);
  assert.match(index, /गोरखा, तनहुँ, चितवन, नवलपरासी पूर्व\/पश्चिमका नदी किनारका बासिन्दा सतर्क रहनुहोस्/);
  assert.match(index, /चुमनुब्रीमा ३५ घर बगाएको समाचार छ/);
  assert.match(index, /DHM · असोज २५, बिहान ६:४०/);
  const card = sliceBetween(index, 'id="budhi-alert"', 'id="prithvi-alert"');
  assert.doesNotMatch(card, /<img/i);
  assert.doesNotMatch(card, /open-alert/);
});

test("alerts page and river outlook lead with the full Budhi Gandaki item", function () {
  const noticeItem = notices.indexOf('id="budhi-gandaki"');
  const roads = notices.indexOf('id="roads"');
  assert.ok(noticeItem > 0 && noticeItem < roads);
  const weatherItem = weather.indexOf('id="budhi-gandaki"');
  const outlook = weather.indexOf('id="flood-section"');
  assert.ok(weatherItem > 0 && weatherItem < outlook);
  for (const html of [notices, weather]) {
    assert.match(html, /नजाऔं/);
    assert.match(html, /खोर्लाबेसी/);
    assert.match(html, /मच्छेखोला/);
    assert.match(html, /आरुघाट/);
    assert.match(html, /नवलपरासी पूर्व/);
    assert.match(html, /35/);
    assert.match(html, /https:\/\/www\.ratopati\.com\/story\/598741\/flood-in-budhigandaki-35-houses-in-chumanubri-washed-away/);
    assert.match(html, /https:\/\/nagariknews\.nagariknetwork\.com\/social-affairs\/flood-in-budhigandaki-35-houses-in-chumanubri-washed-away-62-56\.html/);
    assert.match(html, /https:\/\/www\.onlinekhabar\.com\/2026\/10\/2036590\/chumanumbri-administrative-officer-says-the-situation-is-chaotic-the-flood-keeps-coming-and-going/);
    assert.match(html, /https:\/\/x\.com\/DHM_FloodEWS\/status\/2109094184741372357/);
    assert.doesNotMatch(sliceBetween(html, 'id="budhi-gandaki"', "</article>"), /<img/i);
  }
});

test("English uses alert, and the flood map gains Lokpa and Benighat pins", function () {
  assert.ok(i18n.includes(enHeadline));
  const enBlock = i18n.slice(i18n.indexOf('"budhi_k": "Flood alert"'), i18n.indexOf("};window.I18N_LISTS"));
  assert.equal(/\bwarning\b/i.test(enBlock), false);
  assert.match(damage, /lat:28\.441949, lng:84\.9177789, kind:"alert"/);
  assert.match(damage, /lat:27\.81427, lng:84\.78218, kind:"alert"/);
  assert.match(css, /\.home-flood-alert\{/);
  assert.match(min, /\.home-flood-alert\{/);
  assert.equal(JSON.parse(flood).present.above.length, 0);
});
