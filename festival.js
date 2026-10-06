/* Dashain–Tihar–Chhath 2083. Dates and साइत times come from data/festival.json unchanged. */
(function () {
  "use strict";

  var PENDING = {
    "laxmi-puja": 1,
    "bhai-tika": 1,
    "govardhan-mha-puja": 1,
    "chhath": 1
  };
  var HIDE_AFTER = "2026-11-16";
  var TIKA_ID = "vijaya-dashami";
  var NOTICE = "https://giwmscdnone.gov.np/media/pdf_upload/Dashain%202083_dzoktsj.pdf";
  var RAJPATRA = "https://www.moha.gov.np/page/government-and-public-holidays-in-2083";

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function en() { return lang() === "en"; }
  function dev(n) {
    var s = String(n);
    if (en()) return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function nptParts(date) {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    var o = {};
    fmt.formatToParts(date).forEach(function (p) {
      if (p.type !== "literal") o[p.type] = p.value;
    });
    return o;
  }
  function nptToday(date) {
    var p = nptParts(date || new Date());
    return p.year + "-" + p.month + "-" + p.day;
  }
  function nptNowMs() { return Date.now(); }
  function atNpt(day, hm) {
    return Date.parse(day + "T" + hm + ":00+05:45");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }
  function nameOf(ev) { return en() ? ev.name_en : ev.name_ne; }
  function bsOf(ev) { return en() ? ev.bs_date_en : ev.bs_date_ne; }
  function weekOf(ev) { return en() ? ev.weekday_en : ev.weekday_ne; }
  function adLabel(iso) {
    var p = iso.split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = String(Number(p[2]));
    var mon = months[Number(p[1]) - 1];
    return en() ? (d + " " + mon + " " + p[0]) : (dev(Number(p[2])) + " " + mon + " " + dev(p[0]));
  }
  function clockLabel(hm) {
    if (!hm) return "";
    var bits = hm.split(":");
    var h = Number(bits[0]);
    var m = bits[1];
    if (en()) {
      var ap = h >= 12 ? "PM" : "AM";
      var h12 = h % 12 || 12;
      return h12 + ":" + m + " " + ap;
    }
    return dev(h) + ":" + dev(m);
  }
  function pendingText() {
    return en() ? "Time not yet announced" : "साइत आउन बाँकी";
  }
  function saitLine(ev) {
    if (ev.sait_time_24h) {
      var label = en() ? ev.sait_label_en : ev.sait_label_ne;
      return label || clockLabel(ev.sait_time_24h);
    }
    if (PENDING[ev.id]) return pendingText();
    return "";
  }
  function nextWithSait(events, now) {
    var i;
    for (i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev.sait_time_24h) continue;
      if (atNpt(ev.ad_date, ev.sait_time_24h) > now) return ev;
    }
    return null;
  }
  function nextEvent(events, today) {
    var i;
    for (i = 0; i < events.length; i++) {
      if (events[i].ad_date >= today) return events[i];
    }
    return null;
  }
  function countdownParts(target, now) {
    var diff = Math.max(0, target - now);
    var totalSec = Math.floor(diff / 1000);
    var mins = Math.floor(totalSec / 60);
    return {
      days: Math.floor(mins / (60 * 24)),
      hours: Math.floor((mins % (60 * 24)) / 60),
      minutes: mins % 60,
      seconds: totalSec % 60,
      totalSec: totalSec
    };
  }
  function countText(parts) {
    if (parts.totalSec < 60) {
      if (parts.totalSec <= 0) return en() ? "Starting shortly" : "अब केही बेरमा";
      return en() ? (parts.seconds + "s") : (dev(parts.seconds) + " सेकेन्ड");
    }
    if (en()) return parts.days + "d " + parts.hours + "h " + parts.minutes + "m";
    return dev(parts.days) + " दिन " + dev(parts.hours) + " घण्टा " + dev(parts.minutes) + " मिनेट";
  }
  function saitPhrase(ev) {
    if (!ev || !ev.sait_time_24h) return "";
    var when = adLabel(ev.ad_date) + " · " + clockLabel(ev.sait_time_24h) + " NPT";
    if (ev.id === TIKA_ID) return (en() ? "Tika auspicious time" : "टीका साइत") + " · " + when;
    return (en() ? nameOf(ev) + " auspicious time" : nameOf(ev) + " साइत") + " · " + when;
  }
  function homeSaitLine(list, now) {
    var tika = tikaEvent(list);
    if (tika && tika.sait_time_24h && atNpt(tika.ad_date, tika.sait_time_24h) > now) return saitPhrase(tika);
    return saitPhrase(nextWithSait(list, now));
  }
  function tikaEvent(events) {
    var i;
    for (i = 0; i < events.length; i++) if (events[i].id === TIKA_ID) return events[i];
    return null;
  }
  function holidayRanges() {
    return [
      {
        ne: "घटस्थापना",
        en: "Ghatasthapana",
        when_ne: "असोज २५",
        when_en: "Asoj 25 · 11 Oct"
      },
      {
        ne: "दशैं बिदा",
        en: "Dashain holiday",
        when_ne: "असोज ३१ – कात्तिक ६",
        when_en: "Asoj 31 – Kartik 6 · 17–23 Oct"
      },
      {
        ne: "तिहार बिदा",
        en: "Tihar holiday",
        when_ne: "कात्तिक २२ – २६",
        when_en: "Kartik 22–26 · 8–12 Nov"
      },
      {
        ne: "छठ पर्व",
        en: "Chhath",
        when_ne: "कात्तिक २९",
        when_en: "Kartik 29 · 15 Nov"
      }
    ];
  }

  var events = null;
  var songs = null;
  var timer = 0;
  var paintedKey = "";

  function viewKey(now) {
    var today = nptToday(new Date(now));
    var sait = nextWithSait(events, now);
    var upcoming = nextEvent(events, today);
    return [lang(), today, sait ? sait.id : "", upcoming ? upcoming.id : ""].join("|");
  }

  function paintHome() {
    var host = document.getElementById("festival-home");
    if (!host || !events) return;
    var today = nptToday();
    if (today >= HIDE_AFTER) {
      host.hidden = true;
      host.replaceChildren();
      return;
    }
    var upcoming = nextEvent(events, today);
    if (!upcoming) {
      host.hidden = true;
      host.replaceChildren();
      return;
    }
    var now = nptNowMs();
    var sait = nextWithSait(events, now);
    host.hidden = false;
    var count = "";
    if (sait) count = countText(countdownParts(atNpt(sait.ad_date, sait.sait_time_24h), now));
    var saitBits = homeSaitLine(events, now);
    var see = en() ? "See all" : "सबै हेर्नुहोस्";
    var kicker = en() ? "Festivals" : "चाडपर्व";
    host.innerHTML =
      '<a class="fest-home-row" href="festival.html">' +
        '<span class="fest-home-k">' + esc(kicker) + '</span>' +
        '<span class="fest-home-name">' + esc(nameOf(sait || upcoming)) + '</span>' +
        (count ? '<span class="fest-home-count" data-fest-count>' + esc(count) + '</span>' : '') +
        (saitBits ? '<span class="fest-home-tika">' + esc(saitBits) + '</span>' : '') +
        '<span class="fest-home-more">' + esc(see) + '</span>' +
      '</a>';
  }

  function heroTitle(today) {
    if (today >= "2026-11-12") return en() ? "Chhath is coming" : "छठ आउँदैछ";
    if (today >= "2026-10-26") return en() ? "Tihar is coming" : "तिहार आउँदैछ";
    return en() ? "Dashain is coming" : "दशैं आउँदैछ";
  }

  function paintPage() {
    var root = document.getElementById("fest-page");
    if (!root || !events) return;
    var today = nptToday();
    var now = nptNowMs();
    var sait = nextWithSait(events, now);
    var tika = tikaEvent(events);
    var parts = sait ? countdownParts(atNpt(sait.ad_date, sait.sait_time_24h), now) : null;
    var hero = '<section class="fest-hero ds-card">' +
      '<p class="fest-kicker">' + esc(en() ? "Dashain · Tihar · Chhath 2083" : "दशैं · तिहार · छठ २०८३") + '</p>' +
      '<h1>' + esc(heroTitle(today)) + '</h1>';
    if (sait && parts) {
      hero += '<p class="fest-next">' + esc(nameOf(sait)) + '</p>' +
        '<p class="fest-count" data-fest-count>' + esc(countText(parts)) + '</p>' +
        '<p class="fest-when">' + esc(bsOf(sait) + " · " + weekOf(sait) + " · " + adLabel(sait.ad_date) + " · " + clockLabel(sait.sait_time_24h) + " NPT") + '</p>';
    } else {
      hero += '<p class="fest-next">' + esc(en() ? "The published साइत times have passed." : "प्रकाशित साइत बितिसके।") + '</p>';
    }
    if (tika) {
      hero += '<p class="fest-tika-line"><span class="fest-tika-dot" aria-hidden="true"></span>' +
        esc((en() ? "Main Tika auspicious time" : "मुख्य टीका साइत") + " · " + nameOf(tika) + " · " + clockLabel(tika.sait_time_24h) + " NPT · " + adLabel(tika.ad_date)) +
        '</p>';
    }
    hero += '<div class="fest-hero-art" aria-hidden="true">' +
      '<img src="assets/festival/kite-changa.svg" alt="" class="fest-art-kite">' +
      '<img src="assets/festival/jamara.svg" alt="" class="fest-art-jamara">' +
      '<img src="assets/festival/marigold-garland.svg" alt="" class="fest-art-flower">' +
      '</div></section>';

    var rows = events.map(function (ev) {
      var state = ev.ad_date < today ? "is-past" : (ev.ad_date === today ? "is-today" : "");
      if (ev.id === TIKA_ID) state += " is-tika";
      var holiday = ev.public_holiday
        ? '<span class="fest-badge">' + esc(en() ? "Public holiday" : "सार्वजनिक बिदा") + '</span>'
        : "";
      var saitHtml = saitLine(ev);
      return '<li class="fest-day ' + state + '">' +
        '<div class="fest-day-when"><strong>' + esc(bsOf(ev)) + '</strong><span class="fest-day-week">' + esc(weekOf(ev)) + '</span><span class="fest-day-ad">· ' + esc(adLabel(ev.ad_date)) + '</span></div>' +
        '<div class="fest-day-body"><h3>' + esc(nameOf(ev)) + holiday + '</h3>' +
        (saitHtml ? '<p class="fest-sait">' + esc(saitHtml) + '</p>' : '') +
        '<p>' + esc(en() ? ev.desc_en : ev.desc_ne) + '</p></div></li>';
    }).join("");

    var ranges = holidayRanges().map(function (r) {
      return '<li><strong>' + esc(en() ? r.en : r.ne) + '</strong><span>' + esc(en() ? r.when_en : r.when_ne) + '</span></li>';
    }).join("");

    var songCards = (songs || []).map(function (s) {
      var title = en() ? s.title_en : s.title_ne;
      return '<li class="fest-song"><a href="' + esc(s.youtube_url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="fest-song-k">' + esc(s.festival) + '</span>' +
        '<strong>' + esc(title) + '</strong>' +
        '<span>' + esc(s.artist) + '</span>' +
        '<em>YouTube</em></a></li>';
    }).join("");

    root.innerHTML = hero +
      '<section class="fest-block"><h2>' + esc(en() ? "Day by day" : "दिनदिनको तालिका") + '</h2>' +
      '<ol class="fest-timeline">' + rows + '</ol></section>' +
      '<section class="fest-block"><h2>' + esc(en() ? "Official holidays" : "आधिकारिक बिदा") + '</h2>' +
      '<ul class="fest-ranges">' + ranges + '</ul>' +
      '<p class="fest-note">' + esc(en()
        ? "National public holidays are from Nepal Rajpatra (MoHA notice of 2083 holidays). Phalgunanda Jayanti on Kartik 25 is a holiday for Kirat followers only."
        : "राष्ट्रिय सार्वजनिक बिदा नेपाल राजपत्र (गृह मन्त्रालयको २०८३ बिदा सूचना) बाट। कात्तिक २५ को फाल्गुनन्द जयन्ती किरात धर्मावलम्बीका लागि मात्र बिदा हो।") + '</p></section>' +
      '<section class="fest-block"><h2>' + esc(en() ? "Dashain–Tihar songs" : "दशैं–तिहारका गीत") + '</h2>' +
      '<p class="fest-note">' + esc(en()
        ? "Official YouTube links only. This site does not host or play the audio."
        : "आधिकारिक युट्युब लिंक मात्र। यो साइटले गीत राख्दैन र बजाउँदैन।") + '</p>' +
      '<ul class="fest-songs">' + songCards + '</ul></section>' +
      '<footer class="fest-sources"><p>' +
        (en()
          ? 'साइत times: <a href="' + NOTICE + '" target="_blank" rel="noopener">Nepal Panchang Nirnayak Bikas Samiti</a> notice. Holidays: <a href="' + RAJPATRA + '" target="_blank" rel="noopener">Nepal Rajpatra</a> via the Ministry of Home Affairs. All times are Nepal Time (UTC+5:45).'
          : 'साइत: <a href="' + NOTICE + '" target="_blank" rel="noopener">नेपाल पञ्चाङ्ग निर्णायक विकास समिति</a>को विज्ञप्ति। बिदा: <a href="' + RAJPATRA + '" target="_blank" rel="noopener">नेपाल राजपत्र</a> (गृह मन्त्रालय)। सबै समय नेपाल समय (UTC+५:४५)।') +
      '</p></footer>';
  }

  function paint() {
    paintHome();
    paintPage();
    paintedKey = events ? viewKey(nptNowMs()) : "";
  }
  function tick() {
    if (!events) return;
    var now = nptNowMs();
    var key = viewKey(now);
    if (key !== paintedKey) {
      paint();
      return;
    }
    var sait = nextWithSait(events, now);
    var text = sait ? countText(countdownParts(atNpt(sait.ad_date, sait.sait_time_24h), now)) : "";
    var nodes = document.querySelectorAll("[data-fest-count]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent !== text) nodes[i].textContent = text;
    }
  }

  function start(fest, songDoc) {
    events = fest || [];
    songs = songDoc || [];
    paint();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  var needHome = document.getElementById("festival-home");
  var needPage = document.getElementById("fest-page");
  if (!needHome && !needPage) return;

  Promise.all([
    fetch("data/festival.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("fest"); return r.json(); }),
    fetch("data/songs.json", { cache: "no-store" }).then(function (r) { if (!r.ok) return []; return r.json(); }).catch(function () { return []; })
  ]).then(function (rows) {
    start(rows[0], rows[1]);
  }).catch(function () {
    if (needHome) needHome.hidden = true;
  });

  if (typeof MutationObserver === "function") {
    var last = lang();
    new MutationObserver(function () {
      var now = lang();
      if (now === last) return;
      last = now;
      paint();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
})();
