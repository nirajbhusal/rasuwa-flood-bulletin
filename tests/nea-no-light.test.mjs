import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ask = require("../ask-answers.js");

const data = JSON.parse(readFileSync(new URL("../data/nea_no_light_numbers.json", import.meta.url), "utf8"));
const nea = JSON.parse(readFileSync(new URL("../data/nea_electricity.json", import.meta.url), "utf8"));
const electricityHtml = readFileSync(new URL("../electricity.html", import.meta.url), "utf8");
const electricityJs = readFileSync(new URL("../electricity.js", import.meta.url), "utf8");
const askPanel = readFileSync(new URL("../ask-panel.js", import.meta.url), "utf8");

test("NEA no-light directory counts and dial fields", () => {
  assert.equal(data.entries.length, data.total_entries);
  assert.equal(data.total_entries, 676);
  const officeSum = data.offices.reduce((n, office) => n + office.entry_count, 0);
  assert.equal(officeSum, data.total_entries);
  const provinceSum = Object.values(data.counts_by_province).reduce((n, v) => n + v, 0);
  assert.equal(provinceSum, data.total_entries);
  assert.equal(data.source_url.startsWith("https://nea.org.np/"), true);
  assert.equal(data.source_url_np.startsWith("https://nea.org.np/"), true);
  let numbers = 0;
  data.entries.forEach((entry) => {
    assert.ok(Array.isArray(entry.numbers) && entry.numbers.length >= 1, entry.name_en);
    assert.equal(entry.dial.length, entry.numbers.length, entry.name_en);
    entry.dial.forEach((dial) => assert.match(dial, /^\d+$/, entry.name_en + " " + dial));
    assert.equal(entry.number_kind_derived, undefined);
    numbers += entry.numbers.length;
  });
  assert.equal(numbers, data.total_numbers);
  assert.equal(JSON.stringify(data).includes("number_kind_derived"), false);
});

test("Rasuwa district is not a directory row", () => {
  const ghat = data.entries.filter((entry) => /rasuwaghat/i.test(entry.name_en));
  assert.equal(ghat.length, 1);
  assert.equal(ghat[0].province_en, "Koshi");
  assert.equal(ghat[0].office_id, 286);
  data.entries.forEach((entry) => {
    const name = String(entry.name_en || "").replace(/no\s*light/ig, " ").replace(/\s+/g, " ").trim().toLowerCase();
    assert.notEqual(name, "rasuwa");
    assert.notEqual(name, "dhunche");
  });
});

test("electricity page points at the directory section", () => {
  assert.match(electricityHtml, /id="nolight"/);
  assert.match(electricityHtml, /नो लाइट टेलिफोन निर्देशिका/);
  assert.match(electricityHtml, /h_elec_nolight/);
  assert.match(electricityJs, /data\/nea_no_light_numbers\.json/);
  assert.match(electricityJs, /tel:" \+ dial/);
  assert.match(electricityJs, /function nlRasuwaQuery/);
  assert.equal(electricityJs.includes("number_kind"), false);
  assert.equal(electricityJs.includes("tel_hrefs_as_published"), false);
  assert.ok(electricityHtml.indexOf('id="helplines"') < electricityHtml.indexOf('id="nolight"'));
  assert.match(askPanel, /nea_no_light_numbers\.json/);
});

function ask(q, lang) {
  return Ask.answer(q, { lang: lang, nea: nea, nolight: data, now: "2026-09-26" });
}

test("Ask reads directory rows and does not treat Rasuwaghat as Rasuwa", () => {
  const tri = ask("no light number for Trishuli", "en");
  assert.equal(tri.intent, "electricity_nolight");
  assert.match(tri.text, /Trishuli No light/);
  assert.match(tri.text, /010-560176/);
  assert.equal(tri.text.includes("Rasuwaghat"), false);
  assert.ok(tri.phones.some((row) => row.nums.some((n) => n.dial === "010560176" && n.display === "010-560176")));
  assert.equal(tri.href, "electricity.html#nolight");

  const triNe = ask("त्रिशुलीको नो लाइट नम्बर", "ne");
  assert.match(triNe.text, /त्रिशुली/);
  assert.ok(triNe.phones.some((row) => row.nums.some((n) => n.dial === "010560176")));

  const ras = ask("Rasuwa no light", "en");
  assert.match(ras.text, /no Rasuwa-specific entry/);
  assert.match(ras.text, /Trishuli/);
  assert.match(ras.text, /Debighat/);
  assert.match(ras.text, /Tupche/);
  assert.match(ras.text, /Belkot/);
  assert.match(ras.text, /Kathmandu/);
  assert.match(ras.text, /1150/);
  assert.equal(ras.text.includes("Rasuwaghat"), false);
  assert.equal(ras.text.includes("9862929384"), false);
  assert.equal(JSON.stringify(ras.phones).includes("9862929384"), false);
  assert.equal(/rasuwaghat/i.test(JSON.stringify(ras.phones)), false);
  assert.ok(ras.phones.some((row) => row.nums.some((n) => n.dial === "1150")));

  const dhunche = ask("dhunche no light number", "en");
  assert.match(dhunche.text, /no Rasuwa-specific entry/);
  assert.equal(dhunche.text.includes("Rasuwaghat"), false);

  const ghat = ask("Rasuwaghat no light", "en");
  assert.match(ghat.text, /Rasuwaghat No Light/);
  assert.match(ghat.text, /Koshi/);
  assert.match(ghat.text, /9862929384/);
  assert.equal(/no Rasuwa-specific entry/.test(ghat.text), false);
  assert.ok(ghat.phones.some((row) => row.nums.some((n) => n.dial === "9862929384")));

  const odd = ask("no light number for Anarmani", "en");
  assert.match(odd.text, /023–530294/);
  assert.ok(odd.phones.some((row) => row.nums.some((n) => n.dial === "023530294" && n.display === "023–530294")));

  const miss = ask("no light number for Zzyzx", "en");
  assert.match(miss.text, /not in NEA's no-light directory/);
  assert.equal(miss.phones, undefined);

  const generic = ask("what is the no light number", "en");
  assert.match(generic.text, /1150/);
  assert.equal(generic.text.includes("Rasuwaghat"), false);
  assert.equal(generic.href, "electricity.html#helplines");
});
