import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");

/** Official Nepal Panchanga Nirnayak Bikas Samiti notice, मिति २०८३/०६/२०. */
const RITES = [
  "नवरात्रारम्भ, घटस्थापना",
  "झण्डा फेर्ने (पश्चिम मोहडा)",
  "श्री पचलीभैरव यात्रा",
  "फूलपाती, श्री तुलजाभवानी यात्रा",
  "स्थिरासन",
  "महाष्टमी, कालरात्रि",
  "महानवमी",
  "विजया दशमी, देवी विसर्जन",
  "टीका (पश्चिम मोहडा, टीका लगाइमाग्ने पश्चिम फर्किने)",
  "श्री तुलजाभवानी यात्रा",
  "खड्गयात्रा",
  "अखिलबलिपूर्ति, कोजाग्रतपूजा",
];

const FORBIDDEN = ["महा अष्टमी", "महाअष्टमी", "विजयादशमी", "कोजाग्रत पूर्णिमा"];

test("Dashain rite names match the Samiti notice spelling", () => {
  const jsonText = read("data/festival.json");
  const html = read("festival.html");
  const data = JSON.parse(jsonText);
  const events = Array.isArray(data) ? data : data.events;
  assert.equal(data.bgm.provider, "youtube");
  assert.equal(data.bgm.id, "oic6eXNWX5E");
  const shown = [];
  for (const ev of events) {
    shown.push(ev.name_ne);
    for (const line of ev.lines || []) shown.push(line.ne);
  }
  for (const name of RITES) {
    assert.ok(jsonText.includes(name), "festival.json missing " + name);
    assert.ok(html.includes(name), "festival.html missing " + name);
    assert.ok(shown.includes(name), "shown name_ne/lines missing " + name);
  }
  const script = read("festival.js");
  assert.match(script, /youtube-nocookie\.com\/embed\//);
  assert.doesNotMatch(script, /mangal-dhun\.mp3/);
  assert.doesNotMatch(html, /iframe_api/);
  for (const bad of FORBIDDEN) {
    assert.equal(html.includes(bad), false, "festival.html contains " + bad);
    for (const name of shown) {
      assert.equal(name.includes(bad), false, name + " contains " + bad);
    }
  }
});
