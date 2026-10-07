import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
function read(rel) {
  return readFileSync(new URL(rel, root), "utf8");
}

const URLS = [
  "https://ktmvalley.nepalpolice.gov.np/news/1068/",
  "https://www.nepalpolice.gov.np/notices/1141/",
  "https://navigate.dor.gov.np/app/road-closure-report",
  "https://bussewa.com.np/",
  "https://gomygo.com/",
  "https://dotm.gov.np/",
  "https://www.techpana.com/2026/159445/dashain-travel-helpdesks-in-15-locations-in-kathmandu",
  "https://buddhaair.com/",
  "https://yetiairlines.com/",
  "https://shreeairlines.com/",
  "https://nepalairlines.com.np/domestic"
];

test("festival travel card is a short guide with a few links", function () {
  const js = read("festival.js");
  const css = read("bulletin.css");
  const min = read("bulletin.min.css");
  const start = js.indexOf("function travelPlaces(");
  const end = js.indexOf("function paintHome(");
  const travel = js.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(travel, /असोज २३ \(९ अक्टोबर\)/);
  assert.match(travel, /नालेभार/);
  assert.match(travel, /नयाँ बसपार्क \(गोंगबु\) खुलिसकेको छ/);
  assert.match(travel, /दुई चालक/);
  assert.match(travel, /१०३ वा १००/);
  assert.match(travel, /Nalebhar/);
  assert.match(travel, /Asoj 23 \(9 October\)/);
  assert.match(travel, /two drivers/);
  assert.match(travel, /call 103 or 100/);
  assert.match(travel, /Going home for Dashain/);
  assert.match(travel, /दशैंमा घर जाँदै/);
  assert.doesNotMatch(travel, /दसैं|दसैँ|दसौं/);
  assert.match(travel, /festival\.html#yatra/);
  assert.match(travel, /id="yatra"/);
  assert.doesNotMatch(travel, /सरकारी आदेश होइन/);
  assert.doesNotMatch(travel, /General advice/);
  assert.doesNotMatch(travel, /Sources checked/);
  assert.doesNotMatch(travel, /स्रोत जाँच/);
  assert.doesNotMatch(travel, /बैठक/);
  assert.doesNotMatch(travel, /Reported plan/);
  assert.doesNotMatch(travel, /रिपोर्ट गरिएको/);
  assert.doesNotMatch(travel, /kathmandupost\.com/);
  assert.doesNotMatch(travel, /onlinekhabar\.com/);
  assert.doesNotMatch(travel, /xraynepal\.com/);
  assert.doesNotMatch(travel, /bizpati\.com/);
  assert.doesNotMatch(travel, /softwarica/i);
  assert.doesNotMatch(travel, /\bwarning\b/i);
  assert.doesNotMatch(travel, /Rs\.?\s*\d/);
  assert.doesNotMatch(travel, /<img/i);
  for (const url of URLS) assert.ok(travel.includes(url), url);
  assert.match(css, /\.fest-travel\{[^}]*background:#fff6ea/);
  assert.match(min, /\.fest-travel\{[^}]*background:#fff6ea/);
  assert.match(css, /\.fest-travel-lead\{/);
  assert.match(min, /\.fest-travel-lead\{/);
  assert.equal(read("festival.html").includes("कोजाग्रत पूर्णिमा"), false);
  assert.equal(read("festival.html").includes("सरकारी आदेश होइन"), false);
});

test("share thumbnail is the 1200×630 Dashain header", function () {
  const png = readFileSync(new URL("og-header.png", root));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length > 200000, "og-header.png is still the small casualty card");
  const share = readFileSync(new URL("img/share/share-og-1200x630.png", root));
  assert.equal(Buffer.compare(png, share), 0);
  const index = read("index.html");
  assert.match(index, /og-header\.png\?v=dashain-sh/);
  assert.match(index, /og:image:alt" content="रसुवा–भोटेकोशी बाढी बुलेटिन · दशैं"/);
  assert.match(index, /twitter:image:alt" content="रसुवा–भोटेकोशी बाढी बुलेटिन · दशैं"/);
  assert.doesNotMatch(index, /दसैं|दसैँ|दसौं/);
  const header = read("scripts/og-header.html");
  assert.match(header, /दशैं · Dashain/);
  assert.deepEqual(
    [..."दशैं"].map((ch) => ch.codePointAt(0)),
    [0x0926, 0x0936, 0x0948, 0x0902]
  );
  assert.equal(header.includes("दशैं"), true);
  assert.doesNotMatch(header, /दसैं|दसैँ|दसौं/);
  const bad = /दसैं|दसैँ|दसौं/;
  for (const name of readdirSync(fileURLToPath(root))) {
    if (!name.endsWith(".html")) continue;
    const html = read(name);
    assert.doesNotMatch(html, bad, name);
    if (!html.includes('property="og:image"')) continue;
    assert.match(html, /og-header\.png\?v=dashain-sh/, name);
    assert.match(html, /og:image:alt" content="[^"]*दशैं"/, name);
    assert.match(html, /twitter:image:alt" content="[^"]*दशैं"/, name);
  }
  assert.doesNotMatch(read("festival.js"), bad);
  assert.doesNotMatch(read("embed/dashboard.html"), bad);
  assert.doesNotMatch(read("api/index.html"), bad);
  const pages = read(".github/workflows/pages.yml");
  assert.match(pages, /python scripts\/stamp_build\.py --src \. --out _site\n/);
  assert.doesNotMatch(pages, /stamp_build\.py[^\n]*--render-og/);
});
