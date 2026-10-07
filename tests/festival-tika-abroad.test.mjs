import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");

const ROWS = [
  ["Nepal", "10:26 AM", "Kartik 04 / Oct 21"],
  ["Delhi, India", "09:11 AM", "Oct 21"],
  ["Thimphu, Bhutan", "10:14 AM", "Oct 21"],
  ["Tokyo, Japan", "10:17 AM", "Oct 21"],
  ["Kuala Lumpur, Malaysia", "10:47 AM", "Oct 21"],
  ["Bangkok, Thailand", "10:07 AM", "Oct 21"],
  ["Seoul, South Korea", "11:13 AM", "Oct 21"],
  ["Singapore", "10:31 AM", "Oct 21"],
  ["Hong Kong", "10:27 AM", "Oct 21"],
  ["Yangon, Myanmar", "09:57 AM", "Oct 21"],
  ["Abu Dhabi, UAE", "10:31 AM", "Oct 21"],
  ["Doha, Qatar", "09:41 AM", "Oct 21"],
  ["Tel Aviv, Israel", "11:13 AM", "Oct 20"],
  ["Saudi Arabia", "10:01 AM", "Oct 21"],
  ["Sydney, Australia", "09:21 AM", "Oct 21"],
  ["Melbourne, Australia", "09:30 AM", "Oct 21"],
  ["Brisbane, Australia", "08:25 AM", "Oct 21"],
  ["Adelaide, Australia", "09:15 AM", "Oct 21"],
  ["Canberra, Australia", "09:07 AM", "Oct 21"],
  ["Tasmania, Australia", "08:55 AM", "Oct 21"],
  ["Perth, Australia", "08:54 AM", "Oct 21"],
  ["Darwin, Australia", "09:31 AM", "Oct 21"],
  ["Wellington, New Zealand", "09:23 AM", "Oct 21"],
  ["Lisbon, Portugal", "09:41 AM", "Oct 20"],
  ["London, UK", "10:55 AM", "Oct 20"],
  ["Paris, France", "11:31 AM", "Oct 20"],
  ["Oslo, Norway", "11:50 AM", "Oct 20"],
  ["Geneva, Switzerland", "10:31 AM", "Oct 20"],
  ["New York, USA", "10:11 AM", "Oct 20"],
  ["Frankfort, Kentucky, USA", "10:47 AM", "Oct 20"],
  ["Owensboro, Kentucky, USA", "11:45 AM", "Oct 20"],
  ["Texas, USA", "10:27 AM", "Oct 20"],
  ["Washington DC, USA", "10:21 AM", "Oct 20"],
  ["California, USA", "09:51 AM", "Oct 20"],
  ["Toronto, Canada", "10:41 AM", "Oct 20"],
  ["Vancouver, Canada", "10:55 AM", "Oct 20"],
];

const REGIONS = ["South Asia", "East/Southeast Asia", "Middle East", "Australia & NZ", "Europe", "North America"];

test("abroad Tika times keep the given place, time, and date", () => {
  const js = read("festival.js");
  const start = js.indexOf("var TIKA_ABROAD");
  const end = js.indexOf("function travelHtml(");
  assert.ok(start >= 0 && end > start);
  const block = js.slice(start, end);
  let cursor = 0;
  for (const [place, time, date] of ROWS) {
    const token = `"${place}", "${time}", "${date}"`;
    const at = block.indexOf(token, cursor);
    assert.ok(at > cursor, "missing or reordered " + token);
    cursor = at + token.length;
  }
  cursor = 0;
  for (const region of REGIONS) {
    const at = block.indexOf('"' + region + '"', cursor);
    assert.ok(at > cursor, region);
    cursor = at;
  }
  assert.equal(ROWS.length, 36);
  assert.match(block, /id="tika-abroad"/);
  assert.match(block, /विदेशमा बस्नुहुनेहरूका लागि दशैं टीका साइत/);
  assert.match(block, /Dashain Tika time abroad/);
  assert.match(block, /Times are the local auspicious time in each place/);
  assert.match(block, /Dates vary because of time zones/);
  assert.doesNotMatch(block, /<img|<svg|स्रोत|Source/i);
  assert.doesNotMatch(block, /दसैं|दसैँ|दसौं/);
  const word = "दशैं";
  assert.deepEqual(
    [...word].map((ch) => ch.codePointAt(0)),
    [0x0926, 0x0936, 0x0948, 0x0902]
  );
  assert.ok(block.includes(word));
});

test("abroad section follows the main Tika line and the home card links to it", () => {
  const js = read("festival.js");
  const page = js.slice(js.indexOf("function paintPage("), js.indexOf("function paintMusic("));
  const hero = page.indexOf("mainTikaLine");
  const abroad = page.indexOf("abroadHtml()");
  const travel = page.indexOf("travelHtml()");
  assert.ok(hero >= 0 && abroad > hero && travel > abroad);
  assert.match(js, /festival\.html#tika-abroad/);
  assert.match(js, /विदेशमा टीका साइत →/);
  const css = read("bulletin.css");
  const min = read("bulletin.min.css");
  assert.match(css, /\.fest-abroad\{[^}]*background:#fff6ea/);
  assert.match(min, /\.fest-abroad\{[^}]*background:#fff6ea/);
  assert.match(css, /#tika-abroad\{scroll-margin-top/);
  assert.match(min, /#festival-home \.fest-home-abroad\{/);
});
