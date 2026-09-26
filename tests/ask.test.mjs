import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");

const wx = JSON.parse(readFileSync(new URL("../data/weather-alert.json", import.meta.url), "utf8"));
const flood = JSON.parse(readFileSync(new URL("../data/flood-bulletin.json", import.meta.url), "utf8"));
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
    now: "2026-09-26",
    wx: wx,
    wxnow: wxnow,
    flood: flood,
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
  ["आजको मौसम के छ?", "ne", { intent: "weather_today", number: true, has: ["असोज १०", "सुन्तला", "बागमती"], not: ["रातो"] }],
  ["What is today's weather?", "en", { intent: "weather_today", number: true, has: ["Asoj 10", "orange", "Bagmati", "Rasuwa"], not: ["red"] }],
  ["aaja mausam", "ne", { intent: "weather_today", number: true, has: ["सुन्तला", "असोज १०"], not: ["रातो"] }],
  ["भोलिको मौसम?", "ne", { intent: "weather_day", number: true, has: ["असोज ११", "पहेँलो"] }],
  ["mausam asoj 10", "en", { intent: "weather_day", number: true, has: ["Asoj 10", "orange"] }],
  ["Rasuwa weather", "en", { intent: "weather_place", number: true, has: ["Rasuwa", "orange", "Asoj 10"], not: ["red"] }],
  ["Rasuwa weather tomorrow", "en", { intent: "weather_place", number: true, has: ["Rasuwa", "yellow", "Asoj 11"] }],
  ["Gandaki weather today", "en", { intent: "weather_place", number: true, has: ["Gandaki", "red", "Asoj 10"] }],
  ["Kathmandu maximum today", "en", { intent: "weather_city", number: true, has: ["Kathmandu", "17.8", "16.2", "DHM"] }],
  ["काठमाडौँको तापक्रम", "ne", { intent: "weather_city", number: true, has: ["काठमाडौँ", "17.8", "16.2"] }],
  ["Trishuli at Dhunche", "en", { intent: "weather_river", number: true, has: ["2.99", "warning"] }],
  ["बेत्रावतीको नदी तह", "ne", { intent: "weather_river", has: ["ताजा रिडिङ छैन"] }],
  ["सिन्धुपाल्चोकको मौसम", "ne", { intent: "weather_place", number: true, has: ["सिन्धुपाल्चोक"], not: ["खोलानाला", "विद्यालय"] }],
  ["nuwakot mausam", "ne", { intent: "weather_place", number: true, has: ["नुवाकोट"] }],
  ["सडक अहिले कस्तो छ?", "ne", { intent: "roads", number: true, has: ["२५", "बन्द", "ताप्लेजुङ", "बैतडी"] }],
  ["sadak khulyo", "ne", { intent: "roads", number: true, has: ["२५", "बन्द"] }],
  ["bato", "ne", { intent: "roads", number: true, has: ["२५", "धादिङ"] }],
  ["Is the road to Dhading open?", "en", { intent: "roads", has: ["Dhading", "closed"], not: ["NH17", "Jarekhet"] }],
  ["which districts have roads closed", "en", { intent: "roads", number: true, has: ["25", "Taplejung", "Baitadi", "6"] }],
  ["कुन जिल्लामा सडक बन्द छ?", "ne", { intent: "roads", number: true, has: ["२५", "सिन्धुपाल्चोक", "रुकुम पूर्व"] }],
  ["Is the Rasuwa road open?", "en", { intent: "roads", has: ["Rasuwa", "NH42", "closed"] }],
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
  assert.match(ans.text, /Asoj 10/);
  assert.match(ans.text, /orange/);
  assert.equal(ans.text.includes("red"), false);
  assert.equal(/<[a-z]/i.test(ans.text), false);
});

test("Nepal Police road notice answers night bans and Rasuwa", function () {
  const police = JSON.parse(readFileSync(new URL("../data/police_roads_2083-06-10.json", import.meta.url), "utf8"));
  assert.equal(police.id, "nepal-police-highways-2083-06-10-0700");
  assert.equal(police.rows.length, 44);
  assert.equal(police.counts.total, 44);
  assert.equal(police.counts.full_block, 25);
  assert.equal(police.counts.night_ban, 18);
  assert.equal(police.counts.one_way, 0);
  assert.equal(police.counts.restricted, 1);
  assert.equal(police.counts.districts, 30);
  assert.equal(police.counts.provinces, 5);
  assert.equal(police.rows.some(function (r) { return r.id === "dhading-jwang" || r.id === "palpa-kaligandaki"; }), false);
  const bhim = police.rows.find(function (r) { return r.id === "makwanpur-bhimphedi"; });
  assert.equal(bhim.closed_time, "०८:३");
  assert.equal(bhim.closed_iso, null);
  ["khotang-midhill", "udayapur-katari"].forEach(function (id) {
    const row = police.rows.find(function (r) { return r.id === id; });
    assert.equal(row.closed_time, null);
    assert.equal(row.closed_iso, null);
  });
  function askPolice(q, lang) {
    return Ask.answer(q, {
      lang: lang,
      now: "2026-09-25",
      roads: roads,
      police: police,
      t: tFor(lang)
    });
  }
  const night = askPolice("which roads are closed at night", "en");
  assert.equal(night.intent, "roads_night");
  assert.ok(night.text.length <= 400, night.text.length + " " + night.text);
  ["Solukhumbu", "Bhojpur", "Ilam", "Khotang", "Udayapur", "Kavre", "Nuwakot", "Makwanpur", "Sindhuli", "Dolakha", "Sindhupalchok", "Manang", "Kaski", "Mustang", "Parbat", "Myagdi", "Nawalparasi E", "Dang"].forEach(function (name) {
    assert.ok(night.text.includes(name), name + " missing in " + night.text);
  });
  assert.equal(/until Until/.test(night.text), false);
  assert.ok(night.text.endsWith("."), night.text);
  const nightNe = askPolice("रातमा कुन सडक बन्द छ", "ne");
  assert.equal(nightNe.intent, "roads_night");
  assert.ok(nightNe.text.includes("दाङ"), nightNe.text);
  assert.ok(nightNe.text.endsWith("।"), nightNe.text);
  assert.ok(nightNe.text.length <= 400, nightNe.text.length + " " + nightNe.text);
  const ras = askPolice("Is the Rasuwa road open?", "en");
  assert.match(ras.text, /fully blocked/);
  assert.match(ras.text, /2083\/05\/10/);
  const pasang = askPolice("Is the Pasang Lhamu highway open?", "en");
  assert.match(pasang.text, /fully blocked/);
  assert.match(pasang.text, /until further notice/);
  const still = ask("which districts have roads closed", "en");
  assert.match(still.text, /Taplejung/);
  assert.equal(still.text.includes("night bans"), false);
});

test("NDRRMA vehicle movement answers travel by district", function () {
  const vehicle = JSON.parse(readFileSync(new URL("../data/ndrrma_vehicle_2083-06-09.json", import.meta.url), "utf8"));
  const police = JSON.parse(readFileSync(new URL("../data/police_roads_2083-06-10.json", import.meta.url), "utf8"));
  assert.equal(vehicle.districts.length, 77);
  assert.equal(vehicle.counts.red + vehicle.counts.orange + vehicle.counts.yellow, 77);
  function askVehicle(q, lang) {
    return Ask.answer(q, {
      lang: lang,
      now: "2026-09-25",
      roads: roads,
      police: police,
      vehicle: vehicle,
      t: tFor(lang)
    });
  }
  const ras = askVehicle("Can I travel in Rasuwa today?", "en");
  assert.equal(ras.intent, "roads_travel");
  assert.match(ras.text, /Close at night/);
  assert.match(ras.text, /fully blocked/);
  assert.ok(ras.text.length <= 400, ras.text);
  const jhapa = askVehicle("Can I travel in Jhapa tomorrow?", "en");
  assert.match(jhapa.text, /Stay alert/);
  assert.equal(/fully blocked|Close at night/.test(jhapa.text), false);
  const okha = askVehicle("can I travel in Okhaldhunga today", "en");
  assert.match(okha.text, /Stay alert/);
  const ne = askVehicle("रसुवा जान मिल्छ?", "ne");
  assert.match(ne.text, /रातको समयमा बन्द/);
  assert.match(ne.text, /पूर्ण अवरोध/);
  const plain = ask("which districts have roads closed", "en");
  assert.match(plain.text, /Taplejung/);
  assert.equal(plain.text.includes("Stay alert"), false);
});

test("NDRRMA road notice answers name the closed districts", function () {
  const roadCases = [
    ["सडक अहिले कस्तो छ?", "ne", { intent: "roads", number: true, has: ["२५", "बन्द", "ताप्लेजुङ", "बैतडी"] }],
    ["which districts have roads closed", "en", { intent: "roads", number: true, has: ["25", "Taplejung", "Baitadi", "6"] }],
    ["Is the road to Dhading open?", "en", { intent: "roads", has: ["Dhading", "closed"], not: ["NH17", "Jarekhet"] }],
    ["Is the Rasuwa road open?", "en", { intent: "roads", has: ["Rasuwa", "NH42", "closed"] }],
    ["कुन जिल्लामा सडक बन्द छ?", "ne", { intent: "roads", number: true, has: ["२५", "रुकुम पूर्व", "रुकुम पश्चिम"] }]
  ];
  roadCases.forEach(function (row) { assertAnswer(row[0], row[1], row[2]); });
});

test("DAO notice districts match the district GeoJSON", function () {
  const geo = JSON.parse(readFileSync(new URL("../data/nepal-districts.geojson", import.meta.url), "utf8"));
  const ids = new Set(geo.features.map(function (f) { return f.properties.id; }));
  const notice = roads.dao_notice;
  let n = 0;
  const provs = new Set();
  notice.provinces.forEach(function (p) {
    provs.add(p.id);
    p.districts.forEach(function (d) {
      n += 1;
      assert.ok(ids.has(d.id), d.id);
      const feat = geo.features.find(function (f) { return f.properties.id === d.id; });
      assert.equal(feat.properties.en, d.en, d.id);
    });
  });
  assert.equal(n, 25);
  assert.equal(provs.size, 6);
  assert.equal(notice.counts.districts, 25);
  assert.equal(notice.counts.provinces, 6);
  assert.equal(notice.published.bs, "२०८३/०६/०९");
  assert.equal(roads.roads.length >= 10, true);
});

test("flood forecast answers use the DHM bulletin", function () {
  assertAnswer("कुन नदी सतर्कता नजिक छ?", "ne", { intent: "flood_rivers", has: ["कोशी", "नारायणी", "बागमती", "पश्चिम राप्ती", "बबई"] });
  assertAnswer("Which rivers are near the warning level?", "en", { intent: "flood_rivers", has: ["Koshi", "Narayani", "Bagmati", "West Rapti", "Babai"] });
  assertAnswer("above warning", "en", { intent: "flood_rivers", has: ["Koshi", "Narayani", "above the warning level"] });
  assertAnswer("सतर्कता तह माथि", "ne", { intent: "flood_rivers", has: ["कोशी", "नारायणी", "सतर्कता तह माथि"] });
  assertAnswer("पश्चिम राप्ती", "ne", { intent: "flood_rivers", has: ["पश्चिम राप्ती", "बबई"] });
  assertAnswer("बबई", "ne", { intent: "flood_rivers", has: ["बबई", "बागमती"] });
  assertAnswer("रसुवामा आकस्मिक बाढी?", "ne", { intent: "flood_place", has: ["रसुवा", "मध्यम"] });
  assertAnswer("Rasuwa flash flood tomorrow", "en", { intent: "flood_place", has: ["Rasuwa", "medium"] });
  assertAnswer("Kaski flash flood today", "en", { intent: "flood_place", has: ["Kaski", "high"] });
  assertAnswer("Humla flash flood today", "en", { intent: "flood_place", has: ["Humla", "high"] });
  assertAnswer("त्रिशुली बेत्रावतीको पूर्वानुमान", "ne", { intent: "flood_trishuli", has: ["बेत्रावती", "उल्लेख्य बढ्ने", "सामान्य घटबढ"] });
  assertAnswer("आज आकस्मिक बाढी कहाँ छ?", "ne", { intent: "flood_flash", has: ["गोरखा", "कैलाली"] });
  assertAnswer("असोज १२ आकस्मिक बाढी", "ne", { intent: "flood_flash", has: ["कर्णाली"] });
  assertAnswer("flash flood Asoj 12", "en", { intent: "flood_flash", has: ["Karnali"] });
  const tomorrowFlash = assertAnswer("flash flood tomorrow", "en", { intent: "flood_flash", has: ["no district is at high", "45"] });
  assert.equal(/0 districts/.test(tomorrowFlash.text), false);
  assertAnswer("Trishuli at Dhunche", "en", { intent: "weather_river", has: ["2.99", "warning"] });
  assertAnswer("Rasuwa weather", "en", { intent: "weather_place", has: ["Rasuwa"] });
  const today = new Set(flood.flash.today.high.concat(flood.flash.today.medium));
  const tomorrow = new Set(flood.flash.tomorrow.high.concat(flood.flash.tomorrow.medium));
  assert.equal(flood.flash.today.high.length, 27);
  assert.equal(flood.flash.today.medium.length, 31);
  assert.equal(today.size, 58);
  assert.equal(flood.flash.tomorrow.high.length, 0);
  assert.equal(flood.flash.tomorrow.medium.length, 45);
  assert.equal(flood.flash.tomorrow.text_medium.length, 41);
  assert.equal(tomorrow.size, 45);
  assert.equal(flood.stations.length, 36);
  assert.equal(flood.stations[12].river, "त्रिशुली");
  assert.equal(flood.stations[12].station, "बेत्रावती");
  assert.deepEqual(flood.stations[12].days, ["Y", "Y", "Gb", "Gd", "Gd"]);
  assert.equal(flood.stations[11].station, "देवघाट");
  assert.deepEqual(flood.stations[11].days, ["O", "O", "Yb", "Gd", "Gd"]);
  assert.equal(flood.levels.Yb.tone, "yellow");
  assert.equal(flood.levels.Yb.ne, "सामान्य बढ्ने");
  assert.equal(flood.levels.Gn.tone, "green");
  assert.equal(flood.levels.Gn.ne, "उल्लेख्य बढ्ने");
  let mismatch = 0;
  flood.stations.forEach(function (st) {
    st.days.forEach(function (code) {
      if (flood.levels[code] && flood.levels[code].mismatch) mismatch += 1;
    });
  });
  assert.equal(mismatch, 9);
  assert.equal(flood.rasuwa.today, "medium");
  assert.equal(flood.rasuwa.tomorrow, "medium");
  assert.equal(flood.source.label.en, "DHM · Asoj 10, 2083 · 8:00 AM");
  const unloaded = Ask.answer("कुन नदी सतर्कता नजिक छ?", { lang: "ne", now: "2026-09-26", t: tFor("ne") });
  assert.equal(unloaded.text, "बाढी पूर्वानुमान अहिले लोड भएको छैन।");
  const unloadedEn = Ask.answer("Which rivers are near the warning level?", { lang: "en", now: "2026-09-26", t: tFor("en") });
  assert.equal(unloadedEn.text, "The flood forecast is not loaded.");
});

test("heaviest rain answers from top_rain", function () {
  const row = {
    station: { ne: "अर्चले", en: "Archale" },
    district: { ne: "पाल्पा", en: "Palpa" },
    province: "lumbini",
    rain24: 222,
    obs_at: "2026-09-25T13:25:00+05:45",
    source: "hydrology"
  };
  const base = {
    now: "2026-09-25",
    wx: wx,
    wxnow: { nepal_now: { top_rain: [row, { source: "model", rain24: 900, station: { en: "ModelHill", ne: "ModelHill" }, district: { en: "Palpa", ne: "पाल्पा" } }] } }
  };
  const en = Ask.answer("where did it rain the most", Object.assign({ lang: "en", t: tFor("en") }, base));
  assert.equal(en.intent, "weather_top_rain");
  assert.match(en.text, /Archale, Palpa/);
  assert.match(en.text, /222 mm/);
  assert.match(en.text, /1:25 PM/);
  assert.equal(/ECMWF|ModelHill|model/i.test(en.text), false);
  assert.ok(en.text.length <= 400);
  const ne = Ask.answer("कहाँ सबैभन्दा धेरै पानी पर्‍यो?", Object.assign({ lang: "ne", t: tFor("ne") }, base));
  assert.equal(ne.intent, "weather_top_rain");
  assert.ok(ne.text.includes("अर्चले"), ne.text);
  assert.ok(ne.text.includes("पाल्पा"), ne.text);
  assert.ok(ne.text.includes("२२२"), ne.text);
  assert.ok(ne.text.includes("दिउँसो"), ne.text);
  const live = wxnow.nepal_now.top_rain;
  assert.ok(Array.isArray(live) && live.length >= 1 && live.length <= 3);
  assert.equal(live[0].source === "model", false);
  assert.equal(typeof live[0].rain24, "number");
});

test("follow-ups stay on the same subject", function () {
  const wxAns = ask("आजको मौसम के छ?", "ne");
  assert.ok(wxAns.followups.some(function (f) { return /भोलि/.test(f.ne); }));
  const road = ask("सडक अहिले कस्तो छ?", "ne");
  assert.ok(road.followups.some(function (f) { return /पासाङ|अरनिको/.test(f.ne); }));
  const miss = ask("कति जना बेपत्ता छन्?", "ne");
  assert.ok(miss.followups.some(function (f) { return /मृतक|नाम/.test(f.ne); }));
});
