import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const notices = readFileSync(new URL("../notices.html", import.meta.url), "utf8");
const weather = readFileSync(new URL("../weather.html", import.meta.url), "utf8");
const damage = readFileSync(new URL("../damage.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const flood = readFileSync(new URL("../data/flood-bulletin.json", import.meta.url), "utf8");
const rivers = JSON.parse(readFileSync(new URL("../dhm-rivers.json", import.meta.url), "utf8"));

const enHeadline = "Budhi Gandaki at Aarughat above danger level (5.01 m vs 5.0 m) and rising. Stay away from the river down to the Trishuli confluence until it passes; move to high ground.";
const enEarlier = "Flood alert: big flood coming down the Budhi Gandaki from Chumnubri-6. Stay away from the river all the way to the Trishuli confluence until it passes; move to high ground.";
const shot = "img/alerts/budhi-gandaki-aarughat-0750.webp";

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
  assert.match(index, /DHM \/ NDRRMA · असोज २५, बिहान ८:००/);
  assert.match(index, /Aarughat ५\.०१ मि\. \(खतरा ५\.० मि\.\) · बढ्दो · ७:५० बिहान/);
  const card = sliceBetween(index, 'id="budhi-alert"', 'id="prithvi-alert"');
  assert.match(card, /बुढीगण्डकी आरुघाटमा खतरा तह पार र बढ्दो/);
  assert.match(card, /असोज २५, बिहान ६:४०: बुढीगण्डकी नदीको चुमनुम्वी/);
  assert.match(card, /बुढीगण्डकी प्रभावित क्षेत्रमा उद्धार, राहत र सुरक्षित स्थानान्तरणका लागि हेलिकप्टर परिचालन गरिएका छन्।/);
  assert.match(card, /href="tel:1234"/);
  assert.match(card, /href="tel:102"/);
  assert.match(card, /href="tel:100"/);
  assert.match(card, /href="tel:\+9779856061190"/);
  assert.match(card, /href="tel:\+9779856057778"/);
  assert.match(card, /https:\/\/nepalpolice\.gov\.np\/about-us\/information-officer\//);
  assert.match(card, /https:\/\/x\.com\/ndrrma_nepal\/status\/2109108937933152746/);
  assert.match(card, new RegExp("src=\"" + shot.replace(/\./g, "\\.") + "\""));
  assert.match(card, /alt="DHM River Watch: Budhi Gandaki at Aarughat 5\.01 m, danger level 5\.0 m, rising, 7:50 AM 11 Oct 2026"/);
  assert.match(card, /loading="eager"/);
  assert.match(css, /\.home-flood-alert-fig img\{[^}]*width:100%/);
  assert.match(min, /\.home-flood-alert-fig img\{[^}]*width:100%/);
  assert.equal((card.match(/<img\b/gi) || []).length, 1);
  assert.doesNotMatch(card, /loading="lazy"/);
  assert.doesNotMatch(card, /9867173694|9856057777|9856057780/);
  assert.doesNotMatch(card, /open-alert/);
  assert.ok(statSync(new URL("../" + shot, import.meta.url)).size < 150 * 1024);
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
    const item = sliceBetween(html, 'id="budhi-gandaki"', "</article>");
    assert.match(item, /आरुघाट \(स्टेसन ४४५\) ७:५० बिहान: ५\.०१ मि\., खतरा तह ५\.० मि\., बढ्दो/);
    assert.match(item, /बाढीले खतरा तह पार गरेको र बढ्दो क्रममा रहेकाले/);
    assert.match(item, /https:\/\/x\.com\/ndrrma_nepal\/status\/2109108937933152746/);
    assert.match(item, /बुढीगण्डकी प्रभावित क्षेत्रमा उद्धार, राहत र सुरक्षित स्थानान्तरणका लागि हेलिकप्टर परिचालन गरिएका छन्।/);
    assert.doesNotMatch(item, /budhi-gandaki-aarughat/);
    assert.match(item, /href="tel:\+9779867173694"/);
    assert.match(item, /href="tel:\+9779856057777"/);
    assert.match(item, /href="tel:\+9779856057780"/);
    assert.match(item, /https:\/\/nepalpolice\.gov\.np\/about-us\/information-officer\//);
    assert.doesNotMatch(item, /<img/i);
  }
});

test("English uses alert, and the flood map gains Lokpa and Benighat pins", function () {
  assert.ok(i18n.includes(enHeadline));
  assert.ok(i18n.includes(enEarlier));
  assert.ok(i18n.includes("Aarughat 5.01 m (danger 5.0 m) · rising · 7:50 AM"));
  assert.ok(i18n.includes("DHM / NDRRMA · Asoj 25, 8:00 AM"));
  const aarughat = rivers.stations.find(function (s) { return s.station_id === 445; });
  assert.equal(aarughat.level_m, 5.01);
  assert.equal(aarughat.danger_m, 5);
  assert.equal(aarughat.steady, "RISING");
  assert.equal(aarughat.name, "Budhi Gandaki at Aarughat");
  const enBlock = i18n.slice(i18n.indexOf('"budhi_k": "Flood alert"'), i18n.indexOf("};window.I18N_LISTS"));
  assert.match(i18n, /Helicopters deployed for rescue, relief and evacuation in Budhi Gandaki-affected areas\./);
  assert.equal(/\bwarning\b/i.test(enBlock), false);
  assert.match(damage, /lat:28\.441949, lng:84\.9177789, kind:"alert"/);
  assert.match(damage, /lat:27\.81427, lng:84\.78218, kind:"alert"/);
  assert.match(css, /\.home-flood-alert\{/);
  assert.match(min, /\.home-flood-alert\{/);
  assert.equal(JSON.parse(flood).present.above.length, 0);
});
