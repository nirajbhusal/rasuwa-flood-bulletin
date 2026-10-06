import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flood = JSON.parse(readFileSync(new URL("../data/flood-bulletin.json", import.meta.url), "utf8"));
const js = readFileSync(new URL("../flood-bulletin.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../home-status.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../bulletin.css", import.meta.url), "utf8");
const min = readFileSync(new URL("../bulletin.min.css", import.meta.url), "utf8");

test("FloodEWS sheets sit beside the Asoj 19 bulletin", function () {
  assert.equal(flood.source.x_url, "https://x.com/DHM_FloodEWS/status/2106939037697359940");
  assert.deepEqual(flood.source.sheets, []);
  assert.equal(JSON.stringify(flood).includes("flood-bulletin-2083"), false);
  assert.equal(flood.present.above.length, 0);
  assert.equal(flood.present.near.length, 0);
  assert.match(flood.present.text.en, /below the alert level/);
  assert.equal(/\bwarning\b/i.test(flood.present.text.en), false);
  assert.match(js, /sheetLinks/);
  assert.match(js, /FloodEWS post/);
  assert.match(js, /alert\.active !== true/);
  assert.match(home, /All rivers below the alert level/);
  assert.match(css, /\.fld-sheets\{/);
  assert.match(min, /\.fld-sheets\{/);
});
