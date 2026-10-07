import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
function read(rel) {
  return readFileSync(new URL(rel, root), "utf8");
}

const URLS = [
  "https://kathmandupost.com/national/2026/10/06/dashain-bus-ticket-bookings-to-open-on-october-9",
  "https://english.onlinekhabar.com/dashain-advance-ticket-booking-to-open-from-october-9-two-drivers-mandatory-on-long-routes.html",
  "https://ktmvalley.nepalpolice.gov.np/news/1068/",
  "https://www.nepalpolice.gov.np/notices/1141/",
  "https://www.nepalpolice.gov.np/",
  "https://navigate.dor.gov.np/app/road-closure-report",
  "https://bussewa.com.np/",
  "https://gomygo.com/",
  "https://sajhayatayat.com.np/",
  "https://dotm.gov.np/",
  "https://www.techpana.com/2026/159445/dashain-travel-helpdesks-in-15-locations-in-kathmandu",
  "https://xraynepal.com/content/4846",
  "https://bizpati.com/2026/10/222266/",
  "https://buddhaair.com/",
  "https://yetiairlines.com/",
  "https://shreeairlines.com/",
  "https://nepalairlines.com.np/domestic"
];

test("festival travel card keeps the checked facts and plain links", function () {
  const js = read("festival.js");
  const css = read("bulletin.css");
  const min = read("bulletin.min.css");
  const start = js.indexOf("function travelFacts(");
  const end = js.indexOf("function paintHome(");
  const travel = js.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(travel, /असोज २३ \(९ अक्टोबर २०२६\)/);
  assert.match(travel, /घटस्थापनादेखि कोजाग्रत पूर्णिमासम्म/);
  assert.match(travel, /नयाँ बसपार्क \(गोंगबु\)/);
  assert.match(travel, /दुई चालक/);
  assert.match(travel, /नाङ्लेभार/);
  assert.match(travel, /टेलिकम तथा एनसेल/);
  assert.match(travel, /Nanglebhar/);
  assert.match(travel, /Nepal Telecom and Ncell/);
  assert.match(travel, /9 October 2026/);
  assert.match(travel, /Ghatasthapana through Kojagrat Purnima/);
  assert.match(travel, /two drivers are required/);
  assert.match(travel, /General advice — not a government order/);
  assert.match(travel, /सामान्य सल्लाह — सरकारी आदेश होइन/);
  assert.match(travel, /Sources checked 7 Oct 2026 \/ Asoj 2083/);
  assert.match(travel, /festival\.html#yatra/);
  assert.match(travel, /id="yatra"/);
  assert.doesNotMatch(travel, /softwarica/i);
  assert.doesNotMatch(travel, /\bwarning\b/i);
  assert.doesNotMatch(travel, /Rs\.?\s*\d/);
  assert.doesNotMatch(travel, /<img/i);
  for (const url of URLS) assert.ok(travel.includes(url), url);
  assert.match(css, /\.fest-travel\{[^}]*background:#fff6ea/);
  assert.match(min, /\.fest-travel\{[^}]*background:#fff6ea/);
  assert.equal(read("festival.html").includes("कोजाग्रत पूर्णिमा"), false);
});
