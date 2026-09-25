import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");

const wx = JSON.parse(readFileSync(new URL("../data/weather-alert.json", import.meta.url), "utf8"));
const wxnow = JSON.parse(readFileSync(new URL("../data/weather/now.json", import.meta.url), "utf8"));
const roads = JSON.parse(readFileSync(new URL("../data/roads-dor.json", import.meta.url), "utf8"));
const dash = JSON.parse(readFileSync(new URL("../api/dashboard.json", import.meta.url), "utf8"));
const gallery = JSON.parse(readFileSync(new URL("../data/gallery-path.json", import.meta.url), "utf8"));
const i18n = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
const neBlock = i18n.slice(i18n.indexOf('"ne":'), i18n.indexOf('"en":'));
const enBlock = i18n.slice(i18n.indexOf('"en":'));

function grab(block, key) {
  const re = new RegExp('"' + key + '": "((?:\\\\.|[^"\\\\])*)"');
  const m = block.match(re);
  return m ? JSON.parse('"' + m[1] + '"') : "";
}
function tFor(lang) {
  return function t(key) {
    const block = lang === "en" ? enBlock : neBlock;
    return grab(block, key) || grab(neBlock, key) || "";
  };
}
const lpg = {
  d25: { mt: "3,077.9", cyl: "216,754", label: "2083/05/25" },
  d26: { mt: "1,822.3", cyl: "128,332", label: "2083/05/26" }
};

function ask(q, lang) {
  return Ask.answer(q, {
    lang: lang,
    now: "2026-09-25",
    wx: wx,
    wxnow: wxnow,
    roads: roads,
    dash: dash,
    gallery: gallery,
    lpg: lpg,
    t: tFor(lang)
  });
}

function assertAnswer(q, lang, expect) {
  const ans = ask(q, lang);
  assert.equal(ans.intent, expect.intent, q + " intent " + ans.intent + " text " + ans.text);
  assert.ok(ans.text && ans.text.length <= 400, q + " length " + ans.text.length);
  assert.equal(/<[a-z!/]/i.test(ans.text), false, q + " html " + ans.text);
  assert.equal(ans.text.includes("खोलानाला"), false);
  assert.equal(ans.text.includes("img/"), false);
  assert.equal(/changelog|disclaimer/i.test(ans.text), false);
  if (expect.number) assert.match(ans.text, /\d|[०-९]/, q + " " + ans.text);
  if (expect.has) {
    expect.has.forEach(function (bit) {
      assert.ok(ans.text.includes(bit), q + " missing “" + bit + "” in " + ans.text);
    });
  }
  if (expect.not) {
    expect.not.forEach(function (bit) {
      assert.equal(ans.text.includes(bit), false, q + " unexpectedly has " + bit);
    });
  }
  return ans;
}

const cases = [
  ["आजको मौसम के छ?", "ne", { intent: "weather_today", number: true, has: ["असोज ९", "रातो", "बागमती"] }],
  ["What is today's weather?", "en", { intent: "weather_today", number: true, has: ["Asoj 9", "red", "Bagmati", "Rasuwa"] }],
  ["aaja mausam", "ne", { intent: "weather_today", number: true, has: ["रातो"] }],
  ["भोलिको मौसम?", "ne", { intent: "weather_day", number: true, has: ["असोज १०"] }],
  ["mausam asoj 10", "en", { intent: "weather_day", number: true, has: ["Asoj 10"] }],
  ["Rasuwa weather", "en", { intent: "weather_place", number: true, has: ["Rasuwa", "red"] }],
  ["Kathmandu maximum today", "en", { intent: "weather_city", number: true, has: ["Kathmandu", "20.2", "16.2", "DHM"] }],
  ["काठमाडौँको तापक्रम", "ne", { intent: "weather_city", number: true, has: ["काठमाडौँ", "20.2", "16.2"] }],
  ["Trishuli at Dhunche", "en", { intent: "weather_river", number: true, has: ["3.15", "3.2", "warning"] }],
  ["बेत्रावतीको नदी तह", "ne", { intent: "weather_river", has: ["ताजा रिडिङ छैन"] }],
  ["सिन्धुपाल्चोकको मौसम", "ne", { intent: "weather_place", number: true, has: ["सिन्धुपाल्चोक"], not: ["खोलानाला", "विद्यालय"] }],
  ["nuwakot mausam", "ne", { intent: "weather_place", number: true, has: ["नुवाकोट"] }],
  ["सडक अहिले कस्तो छ?", "ne", { intent: "roads", number: true, has: ["NH42", "बन्द"] }],
  ["sadak khulyo", "ne", { intent: "roads", number: true, has: ["बन्द"] }],
  ["bato", "ne", { intent: "roads", number: true, has: ["NH42"] }],
  ["Is the Pasang Lhamu highway open?", "en", { intent: "roads_nh42", number: true, has: ["NH42", "closed"] }],
  ["Araniko highway status", "en", { intent: "roads_araniko", number: true, has: ["NH34", "open"] }],
  ["कति जना बेपत्ता छन्?", "ne", { intent: "rescue_missing", number: true, has: ["५,७८६", "असोज"] }],
  ["kati jana missing", "en", { intent: "rescue_missing", number: true, has: ["5,786"] }],
  ["how many dead", "en", { intent: "rescue_dead", number: true, has: ["1,451"] }],
  ["उद्धार कति भयो?", "ne", { intent: "rescue_rescued", number: true, has: ["१३,७८४"] }],
  ["kati jana", "ne", { intent: "rescue_overview", number: true, has: ["५,७८६"] }],
  ["कसरी दान गर्ने?", "ne", { intent: "donate", number: true, has: ["NCHL", "फोनपे"] }],
  ["राहत कोष कति छ?", "ne", { intent: "fund", number: true, has: ["९ अर्ब"] }],
  ["paisa", "en", { intent: "fund", number: true, has: ["9.99"] }],
  ["rahat", "ne", { intent: "fund", number: true }],
  ["helpline", "en", { intent: "helpline", number: true, has: ["1234", "1155"] }],
  ["नाम कसरी खोज्ने?", "ne", { intent: "names", has: ["नाम"], not: ["कसरी खोज्ने?"] }],
  ["एलपीजी कति आयो?", "ne", { intent: "lpg", number: true, has: ["१,८२२.३"] }],
  ["what caused the flood", "en", { intent: "cause", number: true, has: ["Langtang Lirung", "Lhende", "ice"] }],
  ["बाढी किन आयो?", "ne", { intent: "cause", number: true, has: ["लाङटाङ", "लेन्दे"] }],
  ["फोटो कहाँ छन्?", "ne", { intent: "gallery", has: ["ग्यालरी", "लेन्दे"] }],
  ["what is this bulletin", "en", { intent: "about", has: ["Rasuwa"] }],
  ["asdf qwerty pizza", "en", { intent: "fallback", has: ["don't have that yet"] }]
];

test("composed answers for Nepali, English, and Romanized questions", function () {
  assert.ok(cases.length >= 25);
  cases.forEach(function (row) {
    assertAnswer(row[0], row[1], row[2]);
  });
});

test("fallback offers three suggested questions and no page fragment", function () {
  const ans = ask("asdf qwerty pizza", "ne");
  assert.equal(ans.intent, "fallback");
  assert.equal(ans.text, "यसबारे अहिले जानकारी छैन।");
  assert.equal(ans.suggest, true);
  assert.equal(ans.chips.length, 3);
  assert.equal(ans.href, "");
});

test("missing weather file is stated plainly", function () {
  const ans = Ask.answer("आजको मौसम के छ?", { lang: "en", now: "2026-09-25", wx: null, t: tFor("en") });
  assert.match(ans.text, /isn't available/);
  assert.equal(ans.href, "weather.html");
  assert.equal(/\d/.test(ans.text), false);
});

test("fuzzy weather typo still composes a sentence", function () {
  const ans = ask("wether today", "en");
  assert.equal(ans.intent, "weather_today");
  assert.match(ans.text, /Asoj 9/);
  assert.equal(/<[a-z]/i.test(ans.text), false);
});

test("follow-ups stay on the same subject", function () {
  const wxAns = ask("आजको मौसम के छ?", "ne");
  assert.ok(wxAns.followups.some(function (f) { return /भोलि/.test(f.ne); }));
  const road = ask("सडक अहिले कस्तो छ?", "ne");
  assert.ok(road.followups.some(function (f) { return /पासाङ|अरनिको/.test(f.ne); }));
  const miss = ask("कति जना बेपत्ता छन्?", "ne");
  assert.ok(miss.followups.some(function (f) { return /मृतक|नाम/.test(f.ne); }));
});
