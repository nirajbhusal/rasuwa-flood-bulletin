/* Dashain–Tihar–Chhath 2083. Rite names and साइत times come from data/festival.json. */
(function () {
  "use strict";

  var PENDING = { "laxmi-puja": 1, "bhai-tika": 1, "govardhan-mha-puja": 1, "chhath": 1 };
  var HIDE_AFTER = "2026-11-16";
  var TIKA_ID = "vijaya-dashami";
  var TIKA_TIME = "10:26";
  var NOTICE = "https://giwmscdnone.gov.np/media/pdf_upload/Dashain%202083_dzoktsj.pdf";
  var NOTICE_IMG = "assets/npns-dashain-2083-notice.jpg";
  var RAJPATRA = "https://www.moha.gov.np/page/government-and-public-holidays-in-2083";
  var events = null;
  var songs = null;
  var bgm = null;
  var timer = 0;
  var paintedKey = "";
  var ytPlayer = null;
  var bgmOn = false;
  var bgmApiQueued = false;
  var bgmWant = false;

  function lang() { return document.documentElement.lang === "en" ? "en" : "ne"; }
  function en() { return lang() === "en"; }
  function dev(n) {
    var s = String(n);
    if (en()) return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function nptParts(date) {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { if (p.type !== "literal") o[p.type] = p.value; });
    return o;
  }
  function nptToday(date) {
    var p = nptParts(date || new Date());
    return p.year + "-" + p.month + "-" + p.day;
  }
  function nptNowMs() { return Date.now(); }
  function atNpt(day, hm) { return Date.parse(day + "T" + hm + ":00+05:45"); }
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
      return (h % 12 || 12) + ":" + m + " " + ap;
    }
    return dev(h) + ":" + dev(m);
  }
  function pendingText() { return en() ? "Time not yet announced" : "साइत आउन बाँकी"; }
  function ritesOf(ev) {
    if (ev.lines && ev.lines.length) return ev.lines;
    return [{ ne: ev.name_ne, en: ev.name_en, time_24h: ev.sait_time_24h || null }];
  }
  function riteName(ln) { return en() ? ln.en : ln.ne; }
  function riteWhen(ln) {
    if (en() && ln.time_en) return ln.time_en;
    if (!en() && ln.time_ne) return ln.time_ne;
    return ln.time_24h ? clockLabel(ln.time_24h) : "";
  }
  function riteTitle(ln) {
    var when = riteWhen(ln);
    return when ? (riteName(ln) + " — " + when) : riteName(ln);
  }
  function moments(list) {
    var out = [];
    list.forEach(function (ev) {
      ritesOf(ev).forEach(function (ln) {
        if (!ln.time_24h) return;
        out.push({
          ev: ev,
          id: ev.id + "@" + ln.time_24h,
          time: ln.time_24h,
          ne: ln.ne,
          en: ln.en,
          tika: ev.id === TIKA_ID && ln.time_24h === TIKA_TIME
        });
      });
    });
    out.sort(function (a, b) { return atNpt(a.ev.ad_date, a.time) - atNpt(b.ev.ad_date, b.time); });
    return out;
  }
  function nextMoment(list, now) {
    var rows = moments(list);
    var i;
    for (i = 0; i < rows.length; i++) {
      if (atNpt(rows[i].ev.ad_date, rows[i].time) > now) return rows[i];
    }
    return null;
  }
  function tikaMoment(list) {
    var rows = moments(list);
    var i;
    for (i = 0; i < rows.length; i++) if (rows[i].tika) return rows[i];
    return null;
  }
  function momentName(m) { return m ? (en() ? m.en : m.ne) : ""; }
  function nextEvent(list, today) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].ad_date >= today) return list[i];
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
  function soonText() { return en() ? "Starting shortly" : "अब केही बेरमा"; }
  function flipLabels() {
    return en() ? ["Day", "Hr", "Min", "Sec"] : ["दिन", "घण्टा", "मिनेट", "सेकेन्ड"];
  }
  function flipHtml() {
    var labs = flipLabels();
    var keys = ["d", "h", "m", "s"];
    var html = '<div class="fest-flip" role="timer">';
    var i;
    for (i = 0; i < keys.length; i++) {
      html += '<span class="fest-flip-cell' + (keys[i] === "s" ? " is-sec" : "") + '"><b data-fest-' + keys[i] + '>0</b><i>' + labs[i] + '</i></span>';
    }
    return html + '</div><p class="fest-soon" data-fest-soon hidden></p>';
  }
  function fillFlip(parts) {
    var map = { d: parts.days, h: parts.hours, m: parts.minutes, s: parts.seconds };
    ["d", "h", "m", "s"].forEach(function (k) {
      var text = dev(map[k]);
      document.querySelectorAll("[data-fest-" + k + "]").forEach(function (n) {
        if (n.textContent !== text) n.textContent = text;
      });
    });
    var soon = parts.totalSec <= 0 ? soonText() : "";
    document.querySelectorAll("[data-fest-soon]").forEach(function (n) {
      n.hidden = !soon;
      if (n.textContent !== soon) n.textContent = soon;
    });
  }
  function tikaLine(list, now) {
    var m = tikaMoment(list);
    if (!m || atNpt(m.ev.ad_date, m.time) <= now) return "";
    var when = adLabel(m.ev.ad_date) + " · " + clockLabel(m.time) + " NPT";
    var label = en() ? "Tika auspicious time" : "टीका साइत";
    return label + " · " + momentName(m) + " · " + when;
  }
  function mainTikaLine(list) {
    var m = tikaMoment(list);
    if (!m) return "";
    var label = en() ? "Main Tika auspicious time" : "मुख्य टीका साइत";
    return label + " · " + momentName(m) + " · " + clockLabel(m.time) + " NPT · " + adLabel(m.ev.ad_date);
  }

  function svg(inner) {
    return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  var ICONS = {
    "ghatasthapana": svg('<path d="M18 40h28l-4 16H22z" fill="#b5541c"/><rect x="16" y="36" width="32" height="6" rx="2" fill="#8c3b12"/><circle cx="32" cy="28" r="6" fill="#f4e1b5"/><path d="M32 36c-1-8-6-16-12-24M32 36c0-8 2-16 4-26M32 36c2-8 8-16 14-22" fill="none" stroke="#d4c25a" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="50" r="3" fill="#e63946"/>'),
    "jhanda-ferne": svg('<path d="M16 6v52" stroke="#6b3a1a" stroke-width="3"/><path d="M18 8h28l-8 10 8 10H18z" fill="#c41e3a"/>'),
    "pachali-bhairav": svg('<path d="M32 6v34M20 16h24M24 10l8 8 8-8" fill="none" stroke="#7a1028" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="50" r="8" fill="#f4c430"/><circle cx="32" cy="50" r="3" fill="#c41e3a"/>'),
    "fulpati": svg('<path d="M16 36h32l-4 18H20z" fill="#8c3b12"/><circle cx="24" cy="28" r="6" fill="#e63946"/><circle cx="36" cy="24" r="7" fill="#f4c430"/><circle cx="44" cy="32" r="5" fill="#fff"/><circle cx="28" cy="18" r="4" fill="#f7b4c8"/>'),
    "maha-ashtami": svg('<path d="M36 10a16 16 0 1 0 0 36 12 12 0 1 1 0-36z" fill="#2a2150"/><circle cx="46" cy="18" r="2" fill="#f4c430"/>'),
    "maha-navami": svg('<path d="M18 50l26-36 4 4L24 52z" fill="#c0c6d0"/><path d="M40 14l8 6-6 2z" fill="#f4c430"/><rect x="14" y="50" width="16" height="6" rx="2" fill="#6b3a1a"/>'),
    "vijaya-dashami": svg('<ellipse cx="32" cy="40" rx="22" ry="8" fill="#e6c15a"/><ellipse cx="32" cy="36" rx="16" ry="6" fill="#fff6e0"/><circle cx="32" cy="34" r="5" fill="#e63946"/><path d="M32 20c-2 6-1 10 0 14" stroke="#d4c25a" stroke-width="2"/>'),
    "ekadashi": svg('<path d="M18 44c8-18 20-18 28 0" fill="#3d8a4a"/><path d="M32 44V18" stroke="#2f6b38" stroke-width="2"/>'),
    "dwadashi": svg('<path d="M32 50C30 36 24 24 16 12M32 50c0-14 2-26 6-38M32 50c4-14 12-24 20-34" fill="none" stroke="#d4c25a" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="54" r="4" fill="#e63946"/>'),
    "kojagrat-purnima": svg('<circle cx="32" cy="32" r="16" fill="#f6e7a8"/><circle cx="38" cy="28" r="12" fill="#fff"/>'),
    "kag-tihar": svg('<path d="M10 36c8-4 14-2 18 2 2-8 8-14 16-16-2 8 0 14 4 18-8 2-16 8-22 8-6 4-12 2-16-2z" fill="#222"/>'),
    "kukur-tihar": svg('<path d="M12 40c0-10 8-16 16-16s12 4 14 10c6 0 10 4 10 8H12z" fill="#c47a3a"/><circle cx="22" cy="30" r="3" fill="#3a2414"/><path d="M18 18l4 8M30 16l-2 10" stroke="#c47a3a" stroke-width="3"/>'),
    "laxmi-puja": svg('<path d="M20 40h24l-4 12H24z" fill="#b5541c"/><ellipse cx="32" cy="40" rx="8" ry="3" fill="#f4c430"/><path d="M32 38c0-10 8-14 8-20 0 8-4 12-8 14-4-2-8-6-8-14 0 6 8 10 8 20z" fill="#ffb703"/>'),
    "gai-puja": svg('<path d="M8 36c4-10 14-12 20-8 6-6 16-4 20 4 4 2 6 8 4 12H10c-2-2-2-6-2-8z" fill="#f4f0e6"/><circle cx="18" cy="28" r="2" fill="#333"/><path d="M14 20c2 4 4 6 6 6M40 18c-2 4-2 8-1 10" stroke="#e6d7b8" stroke-width="2"/>'),
    "govardhan-mha-puja": svg('<circle cx="32" cy="32" r="18" fill="none" stroke="#c41e3a" stroke-width="2"/><circle cx="32" cy="32" r="10" fill="none" stroke="#f4c430" stroke-width="2"/><circle cx="32" cy="32" r="3" fill="#7a1028"/>'),
    "bhai-tika": svg('<circle cx="22" cy="24" r="8" fill="#f3c7a5"/><circle cx="42" cy="26" r="7" fill="#e8b48e"/><circle cx="32" cy="40" r="5" fill="#e63946"/><path d="M14 50c4-8 10-10 16-8 4 6 12 6 18-2" fill="none" stroke="#7a1028" stroke-width="2"/>'),
    "chhath": svg('<circle cx="40" cy="22" r="10" fill="#f4c430"/><path d="M14 48c6-8 12-12 18-12h20" fill="none" stroke="#3d7eae" stroke-width="3"/><path d="M22 48l6-14 6 14" fill="#e7f4fb" stroke="#3d7eae"/>')
  };
  function icon(id) { return '<span class="fest-ico">' + (ICONS[id] || ICONS.ghatasthapana) + "</span>"; }

  function sceneSvg() {
    return '<svg class="fest-scene-svg" viewBox="0 0 960 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="festSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec8ea"/><stop offset=".55" stop-color="#f6d7a2"/><stop offset="1" stop-color="#e7b15a"/></linearGradient></defs>' +
      '<rect width="960" height="280" fill="url(#festSky)"/>' +
      '<ellipse cx="140" cy="48" rx="46" ry="16" fill="#fff" opacity=".85"/><ellipse cx="168" cy="46" rx="28" ry="14" fill="#fff"/>' +
      '<ellipse cx="760" cy="36" rx="40" ry="14" fill="#fff" opacity=".8"/>' +
      '<path d="M0 210 L80 150 L140 188 L210 120 L280 176 L360 96 L430 168 L520 110 L600 180 L690 100 L780 170 L860 130 L960 188 V280 H0Z" fill="#9eb8c9"/>' +
      '<path d="M360 96 L392 150 H328Z" fill="#fff"/><path d="M690 100 L724 156 H656Z" fill="#fff"/>' +
      '<path d="M0 230 C160 210 220 250 400 228 C560 210 700 250 960 220 V280 H0Z" fill="#2f6a3a"/>' +
      '<path d="M0 250 C180 236 320 262 520 244 C700 230 820 258 960 240 V280 H0Z" fill="#245832"/>' +
      '<g fill="#c41e3a" stroke="#7a1020" stroke-width="1"><path d="M120 70l18 28h-36z"/><path d="M250 40l16 26h-32z"/><path d="M540 48l20 32h-40z"/><path d="M700 78l14 22h-28z"/><path d="M820 36l18 28h-36z"/></g>' +
      '<g stroke="#6b3a1a" stroke-width="1" fill="none"><path d="M120 98 C100 140 90 180 80 220"/><path d="M250 66 C270 120 280 170 290 220"/><path d="M540 80 C520 130 510 180 500 230"/><path d="M700 100 C720 150 730 190 740 230"/><path d="M820 64 C800 120 790 170 780 220"/></g>' +
      '<g><rect x="70" y="214" width="36" height="22" rx="3" fill="#8c3b12"/><path d="M88 214 C86 196 80 184 74 176 M88 214 C88 196 92 182 96 172 M88 214 C92 198 100 186 108 178" fill="none" stroke="#e6d36a" stroke-width="2"/><circle cx="88" cy="226" r="3" fill="#e63946"/></g>' +
      '<g><rect x="860" y="206" width="40" height="24" rx="3" fill="#8c3b12"/><path d="M880 206 C876 186 868 172 860 162 M880 206 C880 184 886 170 892 158 M880 206 C886 186 898 174 908 164" fill="none" stroke="#e6d36a" stroke-width="2"/><circle cx="880" cy="220" r="3" fill="#e63946"/></g>' +
      '<ellipse cx="470" cy="236" rx="28" ry="8" fill="#e6c15a"/><circle cx="470" cy="230" r="6" fill="#e63946"/>' +
      '<g stroke="#6b3a1a" stroke-width="3" fill="none"><path d="M600 248 V188 H760 V248"/><path d="M640 188 V236"/><path d="M720 188 V236"/><path d="M628 236 h24"/><path d="M708 236 h24"/></g>' +
      '<g stroke="#2f6b32" stroke-width="3" fill="none"><path d="M300 250 V170"/><path d="M300 190 H250"/><path d="M250 190 q-20 28 0 48"/><path d="M300 210 H340"/><path d="M340 210 q18 24 0 44"/></g>' +
      '<path d="M248 214 q-16 8-8 20 q10-2 14-8z" fill="#3d8a4a"/>' +
      '</svg>';
  }
  function homeSceneSvg() {
    return '<svg class="fest-home-svg" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="homeSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec8ea"/><stop offset=".62" stop-color="#f6d7a2"/><stop offset="1" stop-color="#e7b15a"/></linearGradient></defs>' +
      '<rect width="360" height="180" fill="url(#homeSky)"/>' +
      '<ellipse cx="48" cy="28" rx="28" ry="10" fill="#fff" opacity=".9"/>' +
      '<path d="M0 118 L40 78 L70 100 L110 62 L150 96 L190 58 L230 100 L270 70 L310 104 L360 80 V180 H0Z" fill="#9eb8c9"/>' +
      '<path d="M190 58 l12 22 h-24z" fill="#fff"/>' +
      '<path d="M0 142 C80 128 140 156 220 138 C280 126 320 150 360 136 V180 H0Z" fill="#2f6a3a"/>' +
      '<g fill="#c41e3a"><path d="M46 34 l10 16 h-20z"/><path d="M120 22 l9 14 h-18z"/><path d="M250 30 l11 16 h-22z"/></g>' +
      '<g stroke="#6b3a1a" fill="none" stroke-width="1"><path d="M46 50 C36 78 30 100 24 124"/><path d="M120 36 C132 70 138 100 146 126"/><path d="M250 46 C236 80 228 108 220 130"/></g>' +
      '<g><rect x="18" y="132" width="22" height="14" rx="2" fill="#8c3b12"/><path d="M29 132 C28 120 24 112 18 106 M29 132 C30 120 36 112 42 106" stroke="#e6d36a" fill="none" stroke-width="1.4"/><circle cx="29" cy="140" r="2" fill="#e63946"/></g>' +
      '<ellipse cx="300" cy="148" rx="16" ry="5" fill="#e6c15a"/><circle cx="300" cy="144" r="4" fill="#e63946"/>' +
      '</svg>';
  }
  function dividerSvg() {
    return '<div class="fest-divider" aria-hidden="true"><svg viewBox="0 0 280 28" width="280" height="28"><path d="M20 22 C22 12 18 6 12 2 M28 22 C28 12 34 6 42 2 M36 22 C42 12 50 8 58 4" fill="none" stroke="#d4c25a" stroke-width="2" stroke-linecap="round"/><circle cx="140" cy="14" r="5" fill="#c41e3a"/><circle cx="140" cy="14" r="8" fill="none" stroke="#f4c430" stroke-width="1.5"/><path d="M210 22 C214 12 222 6 232 2 M222 22 C228 12 238 8 250 4" fill="none" stroke="#e07a2f" stroke-width="2"/></svg></div>';
  }

  function holidayRanges() {
    return [
      { ne: "नवरात्रारम्भ, घटस्थापना", en: "Start of Navaratri, Ghatasthapana", when_ne: "असोज २५", when_en: "Asoj 25 · 11 Oct" },
      { ne: "दशैं बिदा", en: "Dashain holiday", when_ne: "असोज ३१ – कात्तिक ६", when_en: "Asoj 31 – Kartik 6 · 17–23 Oct" },
      { ne: "तिहार बिदा", en: "Tihar holiday", when_ne: "कात्तिक २२ – २६", when_en: "Kartik 22–26 · 8–12 Nov" },
      { ne: "छठ पर्व", en: "Chhath", when_ne: "कात्तिक २९", when_en: "Kartik 29 · 15 Nov" }
    ];
  }
  function heroTitle(today) {
    if (today >= "2026-11-12") return en() ? "Chhath is coming" : "छठ आउँदैछ";
    if (today >= "2026-10-26") return en() ? "Tihar is coming" : "तिहार आउँदैछ";
    return en() ? "Dashain is coming" : "दशैं आउँदैछ";
  }
  function songArt(i) {
    var kite = i % 2 === 0;
    var src = kite ? "assets/festival/kite-changa.svg" : "assets/festival/diyo.svg";
    return '<img class="fest-song-art" alt="" src="' + src + '">';
  }
  function bgmId() {
    var id = bgm && bgm.provider === "youtube" && bgm.id ? String(bgm.id) : "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  }
  function bgmQuery() {
    try { return new URLSearchParams(location.search).get("bgm") || ""; } catch (e) { return ""; }
  }
  function bgmAllowed(where) {
    if (!bgmId() || bgmQuery() === "0") return false;
    if (bgmQuery() === "1") return true;
    var today = nptToday();
    if (today >= "2026-10-26") return false;
    if (today >= "2026-10-11") return true;
    return where === "page";
  }
  function musicBtn(where) {
    if (!bgmAllowed(where)) return "";
    var label = en() ? "♫ Mangal Dhun" : "♫ मङ्गल धुन";
    var credit = en() ? "Source: YouTube" : "स्रोत: YouTube";
    var href = "https://www.youtube.com/watch?v=" + bgmId();
    return '<span class="fest-bgm">' +
      '<button type="button" class="fest-music" data-fest-music data-fest-bgm-where="' + where + '">' + label + '</button>' +
      '<button type="button" class="fest-bgm-pop" data-fest-bgm-pop hidden>' + (en() ? "Player" : "प्लेयर") + '</button>' +
      '<span class="fest-music-credit"><a href="' + href + '" target="_blank" rel="noopener noreferrer">' + credit + '</a></span>' +
      '</span>';
  }
  function noticeLink() {
    var label = en() ? "View official notice" : "आधिकारिक सूचना हेर्नुहोस्";
    return '<a class="fest-notice" href="' + NOTICE_IMG + '" target="_blank" rel="noopener">' + esc(label) + "</a>";
  }

  function viewKey(now) {
    var today = nptToday(new Date(now));
    var m = nextMoment(events, now);
    var upcoming = nextEvent(events, today);
    return [lang(), today, m ? m.id : "", upcoming ? upcoming.id : ""].join("|");
  }

  function hmPlain(hm) { return en() ? hm : dev(hm); }
  function homeEventName(m, upcoming) {
    var ev = m ? m.ev : upcoming;
    if (ev && ev.id === "ghatasthapana") return en() ? "Ghatasthapana (Navaratrarambha)" : "घटस्थापना (नवरात्रारम्भ)";
    if (m) return momentName(m);
    return nameOf(ev);
  }
  function homeWhen(ev, hm) {
    if (!ev || !hm) return "";
    return bsOf(ev) + " · " + weekOf(ev) + " · " + adLabel(ev.ad_date) + " · " + hmPlain(hm) + " NPT";
  }
  function homeTikaStrip(now) {
    var m = tikaMoment(events);
    if (!m || atNpt(m.ev.ad_date, m.time) <= now) return "";
    var when = hmPlain(m.time) + " NPT · " + adLabel(m.ev.ad_date);
    if (en()) return "Main Tika auspicious time · Vijaya Dashami (Dashain Tika) · " + when;
    return "मुख्य टीका साइत · विजया दशमी (दशैंको टीका) · " + when;
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
    var m = nextMoment(events, now);
    var shown = m ? m.ev : upcoming;
    var hm = m ? m.time : (shown.sait_time_24h || "");
    host.hidden = false;
    var see = en() ? "See all →" : "सबै हेर्नुहोस् →";
    var kicker = en() ? "Dashain · Tihar · Chhath 2083" : "दशैं · तिहार · छठ २०८३";
    var tika = homeTikaStrip(now);
    host.innerHTML =
      '<div class="fest-home-card">' +
        '<div class="fest-home-scene" aria-hidden="true">' + homeSceneSvg() + '</div>' +
        '<div class="fest-home-copy">' +
          '<p class="fest-home-k">' + esc(kicker) + '</p>' +
          '<p class="fest-home-h">' + esc(heroTitle(today)) + '</p>' +
          '<p class="fest-home-name">' + esc(homeEventName(m, upcoming)) + '</p>' +
          (m ? flipHtml() : '') +
          (hm ? '<p class="fest-home-when">' + esc(homeWhen(shown, hm)) + '</p>' : '') +
          (tika ? '<p class="fest-home-tika">' + esc(tika) + '</p>' : '') +
          '<div class="fest-home-actions">' + musicBtn("home") +
            '<a class="fest-home-more" href="festival.html">' + esc(see) + '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (m) fillFlip(countdownParts(atNpt(shown.ad_date, m.time), now));
  }

  function paintPage() {
    var root = document.getElementById("fest-page");
    if (!root || !events) return;
    var today = nptToday();
    var now = nptNowMs();
    var m = nextMoment(events, now);
    var parts = m ? countdownParts(atNpt(m.ev.ad_date, m.time), now) : null;
    var hero = '<section class="fest-hero ds-card"><div class="fest-scene">' + sceneSvg() + '</div><div class="fest-hero-copy">' +
      '<p class="fest-kicker">' + esc(en() ? "Dashain · Tihar · Chhath 2083" : "दशैं · तिहार · छठ २०८३") + '</p>' +
      '<h1>' + esc(heroTitle(today)) + '</h1>';
    if (m && parts) {
      hero += '<p class="fest-next">' + esc(momentName(m)) + '</p>' + flipHtml() +
        '<p class="fest-when">' + esc(bsOf(m.ev) + " · " + weekOf(m.ev) + " · " + adLabel(m.ev.ad_date) + " · " + clockLabel(m.time) + " NPT") + '</p>';
    } else {
      hero += '<p class="fest-next">' + esc(en() ? "The published साइत times have passed." : "प्रकाशित साइत बितिसके।") + '</p>';
    }
    var tika = mainTikaLine(events);
    if (tika) {
      hero += '<p class="fest-tika-line"><span class="fest-tika-dot" aria-hidden="true"></span>' + esc(tika) + '</p>';
    }
    var vday = null;
    var vi;
    for (vi = 0; vi < events.length; vi++) if (events[vi].id === TIKA_ID) vday = events[vi];
    if (vday && vday.prasad_ne) {
      hero += '<p class="fest-prasad">' + esc(en() ? vday.prasad_en : vday.prasad_ne) + '</p>';
    }
    hero += '<div class="fest-hero-actions">' + musicBtn("page") + noticeLink() + '</div></div></section>';

    var rows = events.map(function (ev) {
      var state = ev.ad_date < today ? "is-past" : (ev.ad_date === today ? "is-today" : "");
      if (ev.id === TIKA_ID) state += " is-tika";
      var holiday = ev.public_holiday
        ? '<span class="fest-badge">' + esc(en() ? "Public holiday" : "सार्वजनिक बिदा") + "</span>"
        : "";
      var riteHtml = ritesOf(ev).map(function (ln, idx) {
        return '<h3>' + esc(riteTitle(ln)) + (idx === 0 ? holiday : "") + "</h3>";
      }).join("");
      var pending = "";
      if (PENDING[ev.id] && !ev.sait_time_24h) pending = '<p class="fest-sait">' + esc(pendingText()) + "</p>";
      var note = en() ? ev.note_en : ev.note_ne;
      var noteHtml = note ? '<p class="fest-day-note"><span>' + esc(en() ? "Note" : "दृष्टव्य") + "</span> " + esc(note) + "</p>" : "";
      var prasad = (ev.prasad_ne) ? '<p class="fest-prasad">' + esc(en() ? ev.prasad_en : ev.prasad_ne) + "</p>" : "";
      return '<li class="fest-day ' + state + '">' +
        '<div class="fest-day-when"><strong>' + esc(bsOf(ev)) + '</strong><span class="fest-day-week">' + esc(weekOf(ev)) + '</span><span class="fest-day-ad">· ' + esc(adLabel(ev.ad_date)) + "</span></div>" +
        icon(ev.id) +
        '<div class="fest-day-body">' + riteHtml + pending + noteHtml + prasad +
        "<p>" + esc(en() ? ev.desc_en : ev.desc_ne) + "</p></div></li>";
    }).join("");

    var ranges = holidayRanges().map(function (r) {
      return "<li><strong>" + esc(en() ? r.en : r.ne) + "</strong><span>" + esc(en() ? r.when_en : r.when_ne) + "</span></li>";
    }).join("");
    var songCards = (songs || []).map(function (s, i) {
      var title = en() ? s.title_en : s.title_ne;
      return '<li class="fest-song"><a href="' + esc(s.youtube_url) + '" target="_blank" rel="noopener noreferrer">' +
        songArt(i) +
        '<span class="fest-song-k">' + esc(s.festival) + "</span><strong>" + esc(title) + "</strong><span>" + esc(s.artist) + "</span><em>YouTube</em></a></li>";
    }).join("");

    root.innerHTML = hero +
      dividerSvg() +
      '<section class="fest-block"><h2>' + esc(en() ? "Day by day" : "दिनदिनको तालिका") + "</h2>" +
      '<ol class="fest-timeline">' + rows + "</ol></section>" +
      dividerSvg() +
      '<section class="fest-block"><h2>' + esc(en() ? "Official holidays" : "आधिकारिक बिदा") + "</h2>" +
      '<ul class="fest-ranges">' + ranges + "</ul>" +
      '<p class="fest-note">' + esc(en()
        ? "National public holidays are from Nepal Rajpatra (MoHA notice of 2083 holidays). Phalgunanda Jayanti on Kartik 25 is a holiday for Kirat followers only."
        : "राष्ट्रिय सार्वजनिक बिदा नेपाल राजपत्र (गृह मन्त्रालयको २०८३ बिदा सूचना) बाट। कात्तिक २५ को फाल्गुनन्द जयन्ती किरात धर्मावलम्बीका लागि मात्र बिदा हो।") + "</p></section>" +
      dividerSvg() +
      '<section class="fest-block"><h2>' + esc(en() ? "Dashain–Tihar songs" : "दशैं–तिहारका गीत") + "</h2>" +
      '<p class="fest-note">' + esc(en()
        ? "Official YouTube links only. This site does not host or play the audio."
        : "आधिकारिक युट्युब लिंक मात्र। यो साइटले गीत राख्दैन र बजाउँदैन।") + "</p>" +
      '<ul class="fest-songs">' + songCards + "</ul></section>" +
      '<footer class="fest-sources"><p>' +
        (en()
          ? 'साइत times: <a href="' + NOTICE + '" target="_blank" rel="noopener">Nepal Panchang Nirnayak Bikas Samiti</a> notice. '
          : 'साइत: <a href="' + NOTICE + '" target="_blank" rel="noopener">नेपाल पञ्चाङ्ग निर्णायक विकास समिति</a>को विज्ञप्ति। ') +
        noticeLink() +
        (en()
          ? ' Holidays: <a href="' + RAJPATRA + '" target="_blank" rel="noopener">Nepal Rajpatra</a> via the Ministry of Home Affairs. All times are Nepal Time (UTC+5:45).'
          : ' बिदा: <a href="' + RAJPATRA + '" target="_blank" rel="noopener">नेपाल राजपत्र</a> (गृह मन्त्रालय)। सबै समय नेपाल समय (UTC+५:४५)।') +
      "</p></footer>";
    if (m && parts) fillFlip(parts);
  }

  function paintMusic() {
    document.querySelectorAll("[data-fest-music]").forEach(function (b) {
      var where = b.getAttribute("data-fest-bgm-where") || "page";
      var show = bgmAllowed(where);
      b.hidden = !show;
      if (!show) return;
      b.textContent = bgmOn
        ? (en() ? "Pause Mangal Dhun" : "♫ मङ्गल धुन रोक्नुहोस्")
        : (en() ? "♫ Mangal Dhun" : "♫ मङ्गल धुन");
      b.setAttribute("aria-pressed", bgmOn ? "true" : "false");
    });
    document.querySelectorAll("[data-fest-bgm-pop]").forEach(function (b) { b.hidden = !ytPlayer && !bgmOn; });
  }
  function rememberBgm(on) {
    try { sessionStorage.setItem("fest-bgm", on ? "1" : "0"); } catch (e) {}
  }
  function ensureDock() {
    var dock = document.getElementById("fest-bgm-dock");
    if (dock) return dock;
    dock = document.createElement("div");
    dock.id = "fest-bgm-dock";
    dock.className = "fest-bgm-dock is-collapsed";
    dock.setAttribute("aria-hidden", "true");
    dock.innerHTML = '<div class="fest-bgm-bar"><span>♫</span><button type="button" data-fest-bgm-collapse>' +
      (en() ? "Hide" : "लुकाउनुहोस्") + '</button></div><div id="fest-bgm-mount"></div>';
    document.body.appendChild(dock);
    return dock;
  }
  function loadYT(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    var queue = window.__festYTQ || (window.__festYTQ = []);
    queue.push(cb);
    if (bgmApiQueued) return;
    bgmApiQueued = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === "function") prev();
      var q = window.__festYTQ || [];
      window.__festYTQ = [];
      q.forEach(function (fn) { try { fn(); } catch (e) {} });
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }
  function toggleMusic() {
    var id = bgmId();
    if (!id) return;
    if (!ytPlayer) {
      if (document.getElementById("fest-bgm-frame")) {
        bgmWant = !bgmOn;
        bgmOn = bgmWant;
        rememberBgm(bgmOn);
        paintMusic();
        return;
      }
      ensureDock();
      var mount = document.getElementById("fest-bgm-mount");
      if (!mount) return;
      var iframe = document.createElement("iframe");
      iframe.id = "fest-bgm-frame";
      iframe.title = "Mangal Dhun";
      iframe.allow = "autoplay; encrypted-media";
      iframe.src = "https://www.youtube-nocookie.com/embed/" + id +
        "?autoplay=1&loop=1&playlist=" + id + "&enablejsapi=1&rel=0&modestbranding=1&playsinline=1";
      mount.appendChild(iframe);
      bgmOn = true;
      bgmWant = true;
      rememberBgm(true);
      paintMusic();
      loadYT(function () {
        ytPlayer = new window.YT.Player("fest-bgm-frame", {
          host: "https://www.youtube-nocookie.com",
          events: {
            onReady: function (e) {
              try { e.target.setVolume(40); } catch (err) {}
              try {
                if (bgmWant) e.target.playVideo();
                else e.target.pauseVideo();
              } catch (err2) {}
            },
            onStateChange: function (e) {
              var YT = window.YT;
              if (!YT || !YT.PlayerState) return;
              if (e.data === YT.PlayerState.PLAYING) bgmOn = true;
              else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) bgmOn = false;
              rememberBgm(bgmOn);
              paintMusic();
            }
          }
        });
      });
      return;
    }
    if (bgmOn) {
      try { ytPlayer.pauseVideo(); } catch (e) {}
      bgmOn = false;
    } else {
      try { ytPlayer.setVolume(40); ytPlayer.playVideo(); } catch (e2) {}
      bgmOn = true;
    }
    bgmWant = bgmOn;
    rememberBgm(bgmOn);
    paintMusic();
  }
  function toggleDock(open) {
    var dock = document.getElementById("fest-bgm-dock");
    if (!dock) return;
    dock.classList.toggle("is-collapsed", !open);
    dock.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function paint() {
    paintHome();
    paintPage();
    paintMusic();
    paintedKey = events ? viewKey(nptNowMs()) : "";
  }
  function tick() {
    if (!events) return;
    var now = nptNowMs();
    var key = viewKey(now);
    if (key !== paintedKey) { paint(); return; }
    var m = nextMoment(events, now);
    if (!m) return;
    fillFlip(countdownParts(atNpt(m.ev.ad_date, m.time), now));
  }
  function start(doc, songDoc) {
    var fest = doc;
    bgm = null;
    if (doc && !Array.isArray(doc) && doc.events) {
      fest = doc.events;
      bgm = doc.bgm || null;
    }
    events = fest || [];
    songs = songDoc || [];
    paint();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var pop = t.closest("[data-fest-bgm-pop]");
    if (pop) {
      e.preventDefault();
      if (!ytPlayer && !document.getElementById("fest-bgm-frame")) toggleMusic();
      toggleDock(true);
      return;
    }
    if (t.closest("[data-fest-bgm-collapse]")) {
      e.preventDefault();
      toggleDock(false);
      return;
    }
    var b = t.closest("[data-fest-music]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    toggleMusic();
  });

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
