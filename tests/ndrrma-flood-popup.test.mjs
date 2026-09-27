import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const FloodPopup = require("../flood-popup.js");

const ndrrma = JSON.parse(readFileSync(new URL("../data/ndrrma_flood_alerts.json", import.meta.url), "utf8"));
const popupJs = readFileSync(new URL("../flood-popup.js", import.meta.url), "utf8");
const popupCss = readFileSync(new URL("../flood-popup.css", import.meta.url), "utf8");
const openAlert = readFileSync(new URL("../open-alert.js", import.meta.url), "utf8");
const pages = [
  "index.html", "weather.html", "notices.html", "names.html", "markets.html", "gov.html",
  "electricity.html", "donate.html", "damage.html", "contact.html", "about.html",
  "response.html", "photos.html", "supply.html"
];

const now = Date.parse("2026-09-27T04:00:00Z");
const MIN = 60 * 1000;

test("the published Narayani alert stays active with its popup switched off", function () {
  const live = ndrrma.alerts[0];
  assert.equal(live.id, "narayani-2083-06-11-0800");
  assert.equal(live.active, true);
  assert.equal(live.popup, false);
  assert.equal(FloodPopup.shouldShow(live, now, null), false);
  assert.equal(FloodPopup.newestPopup(ndrrma), null);
});

test("flood popup is suppressed for one hour and only while the alert is active", function () {
  const alert = Object.assign({}, ndrrma.alerts[0], { popup: true });
  assert.equal(FloodPopup.shouldShow(alert, now, null), true);
  assert.equal(FloodPopup.shouldShow(alert, now, ""), true);
  assert.equal(FloodPopup.shouldShow(alert, now, String(now - 59 * MIN)), false);
  assert.equal(FloodPopup.shouldShow(alert, now, String(now - 61 * MIN)), true);
  assert.equal(FloodPopup.shouldShow(Object.assign({}, alert, { active: false }), now, null), false);
  assert.equal(FloodPopup.shouldShow(Object.assign({}, alert, { popup: false }), now, null), false);
  assert.equal(FloodPopup.storageKey(alert.id), "ndrrmaFloodPopup:" + alert.id);
});

test("popup copy comes from the newest active alert", function () {
  const alert = Object.assign({}, ndrrma.alerts[0], { popup: true });
  const view = FloodPopup.present(alert);
  const newerOff = {
    id: "later-off",
    active: false,
    popup: true,
    issued_npt: "2026-09-28T08:00:00+05:45"
  };
  const doc = { alerts: [alert] };
  assert.equal(FloodPopup.newestPopup(doc).id, alert.id);
  assert.equal(FloodPopup.newestPopup({ alerts: [newerOff, alert] }).id, alert.id);
  assert.equal(view.headlineNe, "विशेष बाढी चेतावनी — नारायणी नदी खतराको तह पार गरेको छ");
  assert.equal(view.headlineEn, "Special flood alert: Narayani River has crossed the danger level");
  assert.equal(view.levels, "current 11 m / danger 11 m / expected peak ~13.0 m");
  assert.equal(view.districts, "Chitwan, Nawalparasi East, Nawalparasi West");
  assert.equal(view.action, "तुरुन्तः उच्च तथा सुरक्षित स्थानमा जानुहोस्। / Move to high, safe ground now.");
  assert.equal(view.detailsLabel, "विवरण · Details");
  assert.equal(view.href, "weather.html#ndrrma-flood-alert");
  assert.equal(/\bwarning\b/i.test(view.headlineEn + " " + view.levels + " " + view.districts), false);
});

test("popup is a separate include and does not restore the old weather alert", function () {
  assert.match(openAlert, /Opening weather alert removed/);
  assert.equal(popupJs.includes(".open-alert"), false);
  assert.match(popupCss, /border-top:\s*4px solid #c41e3a/);
  assert.match(popupCss, /z-index:\s*400/);
  pages.forEach(function (name) {
    const html = readFileSync(new URL("../" + name, import.meta.url), "utf8");
    assert.match(html, /<link rel="stylesheet" href="flood-popup\.css\?v=[^"]+">/);
    assert.match(html, /<script defer src="flood-popup\.js\?v=[^"]+"><\/script>/);
  });
});
