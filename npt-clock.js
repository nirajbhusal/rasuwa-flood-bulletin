/* Nepal time (UTC+5:45) and Bikram Sambat for the header clock.
   Month lengths: remotemerge/nepali-date-converter years.ts.
   Anchor: १ बैशाख २०८३ = 14 April 2026. 25 Sep 2026 = ९ असोज २०८३. */
(function () {
  "use strict";
  var NPT = (5 * 60 + 45) * 60 * 1000;
  var DIG = "०१२३४५६७८९";
  var WD_NE = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"];
  var WD_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MO_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
  var MO_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var BS = {
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2087: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]
  };
  var ANCHOR = Date.UTC(2026, 3, 14);
  var INCIDENT = Date.UTC(2026, 7, 26);

  function dig(n) {
    return String(n).replace(/[0-9]/g, function (d) { return DIG[d]; });
  }
  function npt(now) {
    var t = new Date((now == null ? Date.now() : now) + NPT);
    return {
      y: t.getUTCFullYear(),
      m: t.getUTCMonth() + 1,
      d: t.getUTCDate(),
      wd: t.getUTCDay(),
      hh: t.getUTCHours(),
      mm: t.getUTCMinutes(),
      ss: t.getUTCSeconds(),
      ms: t.getUTCMilliseconds()
    };
  }
  function toBS(y, m, d) {
    var delta = Math.round((Date.UTC(y, m - 1, d) - ANCHOR) / 86400000);
    var year = 2083;
    var month = 0;
    if (delta >= 0) {
      while (true) {
        var len = BS[year];
        if (!len) return null;
        if (delta < len[month]) break;
        delta -= len[month];
        month += 1;
        if (month > 11) { month = 0; year += 1; }
      }
    } else {
      while (delta < 0) {
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
        var prev = BS[year];
        if (!prev) return null;
        delta += prev[month];
      }
    }
    return { year: year, month: month, day: delta + 1 };
  }
  function clock(hh, mm) {
    var h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    var mm2 = mm < 10 ? "0" + mm : String(mm);
    return { h: String(h12), mm: mm2, ap: hh < 12 ? "AM" : "PM" };
  }
  function render() {
    var p = npt();
    var bs = toBS(p.y, p.m, p.d);
    var c = clock(p.hh, p.mm);
    var el = document.getElementById("brand-now");
    if (el && bs) {
      var neHm = dig(c.h) + ":" + dig(c.mm);
      var enHm = c.h + ":" + c.mm + " " + c.ap;
      var ne = WD_NE[p.wd] + ", " + MO_NE[bs.month] + " " + dig(bs.day) + ", " + dig(bs.year) + " · " + neHm + " बजे";
      var en = WD_EN[p.wd] + ", " + p.d + " " + MO_EN[p.m - 1] + " " + p.y + " · " + enHm + " NPT";
      el.innerHTML =
        '<span class="npt-ne" lang="ne">' + WD_NE[p.wd] + ", " + MO_NE[bs.month] + " " + dig(bs.day) + ", " + dig(bs.year) +
        ' · <span class="npt-hm" data-pad="१२:५९">' + neHm + "</span> बजे</span>" +
        '<span class="npt-sep" aria-hidden="true"> · </span>' +
        '<span class="npt-en" lang="en">' + WD_EN[p.wd] + ", " + p.d + " " + MO_EN[p.m - 1] + " " + p.y +
        ' · <span class="npt-hm" data-pad="12:59 PM">' + enHm + "</span> NPT</span>";
      el.setAttribute("datetime",
        p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0") +
        "T" + String(p.hh).padStart(2, "0") + ":" + String(p.mm).padStart(2, "0") + ":00+05:45");
      el.setAttribute("aria-label", ne + ". " + en);
    }
    var dayEl = document.getElementById("incident-day");
    if (dayEl) {
      var n = Math.round((Date.UTC(p.y, p.m - 1, p.d) - INCIDENT) / 86400000);
      if (n < 0) n = 0;
      var enMode = document.documentElement.lang === "en";
      dayEl.textContent = enMode
        ? (n === 1 ? "1 day since the flood" : n + " days since the flood")
        : ("बाढी भएको " + dig(n) + " दिन");
    }
  }
  function arm() {
    var p = npt();
    var wait = (60 - p.ss) * 1000 - p.ms + 30;
    if (wait < 250) wait += 60000;
    window.setTimeout(function () {
      render();
      arm();
    }, wait);
  }
  function start() {
    render();
    arm();
  }
  if (window.__addLangHook) window.__addLangHook(render);
  else {
    window.__langHookQ = window.__langHookQ || [];
    window.__langHookQ.push(render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__nptToBS = toBS;
  window.__nptClock = clock;
  window.__nptParts = npt;
})();
