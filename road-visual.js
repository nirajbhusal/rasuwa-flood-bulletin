/* Schematic road status for the corridors on the homepage roads card.
   Only routes and facts already on the card. Galaudi closure is reported
   (DAO Dhading notice via Kantipur, Nagarik, Nepal Samaya) and time-aware. */
(function () {
  "use strict";
  var CLOSE_FROM = Date.parse("2026-10-12T23:00:00+05:45");
  var CLOSE_TO = Date.parse("2026-10-13T05:00:00+05:45");
  var DIG = "०१२३४५६७८९";
  function en() { return document.documentElement.lang === "en"; }
  function t(ne, e) { return en() ? e : ne; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function galaudiState(now) {
    if (now >= CLOSE_TO) return "open";
    if (now >= CLOSE_FROM) return "closed";
    return "night";
  }
  // Landscape schematic: west (Pokhara) left, east (Kathmandu) right, Narayanghat/Butwal below.
  var N = {
    pokhara: { x: 80, y: 120, ne: "पोखरा", en: "Pokhara" },
    mugling: { x: 330, y: 120, ne: "मुग्लिङ", en: "Mugling" },
    galaudi: { x: 500, y: 120, ne: "गलौँदी (गजुरी)", en: "Galaudi (Gajuri)" },
    ktm: { x: 750, y: 120, ne: "काठमाडौँ", en: "Kathmandu" },
    narayanghat: { x: 330, y: 280, ne: "नारायणघाट", en: "Narayanghat" },
    butwal: { x: 80, y: 280, ne: "बुटवल", en: "Butwal" }
  };
  var COLORS = { open: "#15803d", night: "#b45309", closed: "#b91c1c", none: "#94a3b8" };
  var SOFT = { open: "#dcfce7", night: "#fef3c7", closed: "#fee2e2", none: "#f1f5f9" };
  var MARK = { open: "✔", night: "◷", closed: "✕", none: "?" };
  function words(st) {
    if (st === "open") return t("खुला", "Open");
    if (st === "night") return t("आज राति बन्द", "Closed tonight");
    if (st === "closed") return t("अहिले बन्द", "Closed now");
    return t("यो कार्डमा स्थिति छैन", "No status on this card");
  }
  function segs(now) {
    var g = galaudiState(now);
    var conf = t("असोज २५, दिउँसो ४:४५ NPT मा प्रयोगकर्ताले पुष्टि गरेको", "user-confirmed, Asoj 25, 4:45 PM NPT");
    var gNote = g === "open"
      ? t("दुवैतर्फी (two-way) खुलेको · ", "Open (two-way) · ") + conf
      : t("गलौँदी (गजुरी–५) मा मर्मतका लागि असोज २६ राति ११ बजेदेखि असोज २७ बिहान ५ बजेसम्म सबै सवारी बन्द · रिपोर्ट गरिएको (जिल्ला प्रशासन कार्यालय धादिङको सूचना उद्धृत गर्दै कान्तिपुर, नागरिक, नेपाल समय)। अरू समय दुवैतर्फी खुला।",
          "Galaudi (Gajuri-5): all traffic stopped for repairs from 11 PM Asoj 26 to 5 AM Asoj 27 · reported (Kantipur, Nagarik, Nepal Samaya citing a DAO Dhading notice). Open two-way otherwise.");
    return [
      { id: "ktm-galaudi", a: "ktm", b: "galaudi", st: g, name: t("काठमाडौँ–गजुरी", "Kathmandu–Gajuri"), note: gNote },
      { id: "galaudi-mugling", a: "galaudi", b: "mugling", st: g, name: t("गजुरी–मुग्लिङ", "Gajuri–Mugling"), note: gNote },
      { id: "mugling-pokhara", a: "mugling", b: "pokhara", st: "open", name: t("मुग्लिङ–पोखरा", "Mugling–Pokhara"), note: t("खुला · ", "Open · ") + conf },
      { id: "mugling-narayanghat", a: "mugling", b: "narayanghat", st: "none", name: t("मुग्लिङ–नारायणघाट", "Mugling–Narayanghat"), note: t("यो खण्डको स्थिति कार्डमा छैन; जोड देखाउन मात्र।", "This stretch has no status on the card; shown only to connect the map.") },
      { id: "narayanghat-butwal", a: "narayanghat", b: "butwal", st: "open", name: t("नारायणघाट–बुटवल", "Narayanghat–Butwal"), note: t("खुला · ", "Open · ") + conf }
    ];
  }
  function icon(st, x, y, r) {
    r = r || 11;
    var c = COLORS[st], k = r / 11;
    var g = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="' + c + '" stroke-width="3"/>';
    if (st === "open") g += '<path d="M' + (x - 5 * k) + " " + y + " l" + 3.5 * k + " " + 3.5 * k + " l" + 6.5 * k + " " + (-7.5 * k) + '" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (st === "night") g += '<path d="M' + x + " " + (y - 6 * k) + " v" + 6 * k + " l" + 4 * k + " " + 2.5 * k + '" fill="none" stroke="' + c + '" stroke-width="2.8" stroke-linecap="round"/>';
    else if (st === "closed") g += '<path d="M' + (x - 5 * k) + " " + (y - 5 * k) + " l" + 10 * k + " " + 10 * k + " M" + (x + 5 * k) + " " + (y - 5 * k) + " l" + (-10 * k) + " " + 10 * k + '" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>';
    else g += '<text x="' + x + '" y="' + (y + 5 * k) + '" text-anchor="middle" font-size="' + 14 * k + '" font-weight="800" fill="' + c + '">?</text>';
    return g;
  }
  function textW(str, size) {
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0x0900 && c <= 0x097f) { if (!/[\u093e-\u094d\u0901-\u0903\u0962\u0963]/.test(str[i])) n += 0.62; }
      else n += 0.56;
    }
    return n * size;
  }
  function pill(x, y, s, small) {
    var size = small ? 13 : 15;
    var label = s.name + "  " + MARK[s.st] + " " + words(s.st);
    var w = Math.round(textW(label, size) + 26), h = small ? 26 : 30;
    return '<g class="rv-pill' + (small ? " is-quiet" : "") + '"><rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + h / 2 + '" fill="' + SOFT[s.st] + '" stroke="' + COLORS[s.st] + '" stroke-width="' + (small ? 1.5 : 2) + '"/>' +
      '<text x="' + x + '" y="' + (y + size * 0.36) + '" text-anchor="middle" font-size="' + size + '" font-weight="800" fill="' + (s.st === "none" ? "#475569" : COLORS[s.st]) + '">' + esc(label) + "</text></g>";
  }
  var PILL_AT = {
    "ktm-galaudi": [640, 28], "galaudi-mugling": [415, 70], "mugling-pokhara": [205, 70],
    "mugling-narayanghat": [480, 200], "narayanghat-butwal": [205, 236]
  };
  function svg(list) {
    var out = ['<svg class="rv-svg" viewBox="0 0 830 330" role="img" aria-label="' + esc(t("राजमार्ग स्थितिको नक्सा", "Highway status map")) + '">'];
    list.forEach(function (s) {
      var A = N[s.a], B = N[s.b];
      var quiet = s.st === "none";
      var dash = quiet ? ' stroke-dasharray="4 10"' : (s.st === "night" ? ' stroke-dasharray="18 7"' : "");
      out.push('<g class="rv-seg' + (quiet ? " is-quiet" : "") + '" data-seg="' + s.id + '" tabindex="0" role="button" aria-label="' + esc(s.name + ": " + words(s.st)) + '">' +
        "<title>" + esc(s.name + " · " + words(s.st)) + "</title>" +
        '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="transparent" stroke-width="34"/>' +
        '<line class="rv-line" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + COLORS[s.st] + '" stroke-width="' + (quiet ? 5 : 10) + '" stroke-linecap="round"' + dash + "/>" +
        icon(s.st, (A.x + B.x) / 2, (A.y + B.y) / 2, quiet ? 9 : 12) +
        pill(PILL_AT[s.id][0], PILL_AT[s.id][1], s, quiet) + "</g>");
    });
    Object.keys(N).forEach(function (k) {
      var n = N[k];
      out.push('<circle cx="' + n.x + '" cy="' + n.y + '" r="9" fill="#fff" stroke="#0f172a" stroke-width="4"/>' +
        '<text class="rv-lab" x="' + n.x + '" y="' + (n.y + 38) + '" text-anchor="middle">' + esc(t(n.ne, n.en)) + "</text>");
    });
    out.push('<g class="rv-compass" aria-hidden="true"><text x="18" y="28" font-size="13" font-weight="800" fill="#64748b">' + esc(t("← पश्चिम", "← West")) + '</text>' +
      '<text x="812" y="322" text-anchor="end" font-size="13" font-weight="800" fill="#64748b">' + esc(t("पूर्व →", "East →")) + "</text></g>");
    out.push("</svg>");
    return out.join("");
  }
  // Mobile: one row per route, top (east) to bottom, so nothing has to shrink.
  function rows(list) {
    return '<ol class="rv-rows">' + list.map(function (s) {
      return '<li class="rv-row rv-' + s.st + '"><button type="button" class="rv-seg rv-row-btn" data-seg="' + s.id + '">' +
        '<span class="rv-row-bar" aria-hidden="true"></span>' +
        '<span class="rv-row-name">' + esc(s.name) + "</span>" +
        '<span class="rv-row-pill"><span aria-hidden="true">' + MARK[s.st] + "</span> " + esc(words(s.st)) + "</span></button></li>";
    }).join("") + "</ol>";
  }
  function legend() {
    return '<ul class="rv-legend">' + ["open", "night", "closed", "none"].map(function (st) {
      return '<li class="rv-lg-' + st + '"><svg viewBox="0 0 46 24" width="46" height="24" aria-hidden="true"><line x1="3" y1="12" x2="43" y2="12" stroke="' + COLORS[st] + '" stroke-width="' + (st === "none" ? 4 : 8) + '" stroke-linecap="round"' +
        (st === "none" ? ' stroke-dasharray="3 7"' : st === "night" ? ' stroke-dasharray="12 5"' : "") + "/>" + icon(st, 23, 12, 9) + "</svg><span>" + esc(words(st)) + "</span></li>";
    }).join("") + "</ul>";
  }
  function summary(g) {
    if (g === "night") return t("तीन मुख्य मार्ग खुला · गलौँदी आज राति ११ बजेदेखि बिहान ५ बजेसम्म बन्द", "Three main routes are open · Galaudi closes tonight from 11 PM to 5 AM");
    if (g === "closed") return t("गलौँदी (काठमाडौँ–मुग्लिङ) अहिले बन्द, बिहान ५ बजेसम्म · अरू दुई मार्ग खुला", "Galaudi (Kathmandu–Mugling) is closed now until 5 AM · the other two routes are open");
    return t("तीन मुख्य मार्ग खुला", "Three main routes are open");
  }
  function banner(g) {
    if (g === "open") return "";
    var big = g === "night"
      ? t("गलौँदी: आज राति बन्द · राति ११ बजे – बिहान ५ बजे", "Galaudi: closed tonight · 11 PM – 5 AM")
      : t("गलौँदी: अहिले बन्द · बिहान ५ बजे खुल्ने", "Galaudi: closed now · reopens 5 AM");
    return '<div class="rv-banner rv-' + g + '" role="status"><svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">' + icon(g, 14, 14, 11) + "</svg>" +
      '<div><strong>' + esc(big) + "</strong><span>" + esc(t("असोज २६ राति ११ बजे – असोज २७ बिहान ५ बजे NPT · मर्मत · रिपोर्ट गरिएको", "Asoj 26, 11 PM – Asoj 27, 5 AM NPT · repairs · reported")) + "</span></div></div>";
  }
  var picked = "";
  function render(root) {
    var now = Date.now();
    var list = segs(now);
    var g = galaudiState(now);
    var cur = null;
    list.forEach(function (s) { if (s.id === picked) cur = s; });
    if (!cur) cur = list[0];
    root.innerHTML =
      '<p class="rv-summary">' + esc(summary(g)) + "</p>" + banner(g) +
      '<div class="rv-map">' + svg(list) + "</div>" + rows(list) + legend() +
      '<p class="rv-detail" aria-live="polite"><strong>' + esc(cur.name) + " · " + esc(words(cur.st)) + "</strong><br>" + esc(cur.note) + "</p>" +
      '<p class="rv-asof">' + esc(t("स्थिति: असोज २५, दिउँसो ४:४५ NPT · पछिल्लो जाँच असोज २६, बिहान ८:२० · गलौँदी बन्द: रिपोर्ट गरिएको", "As of Asoj 25, 4:45 PM NPT · last checked Asoj 26, 8:20 AM · Galaudi closure: reported")) + "</p>";
    root.querySelectorAll(".rv-seg").forEach(function (el) {
      if (el.getAttribute("data-seg") === cur.id) el.classList.add("is-picked");
    });
    // The text closure item expires with the closure.
    document.querySelectorAll(".home-road-sched").forEach(function (li) { li.hidden = g === "open"; });
  }
  function all() { document.querySelectorAll("[data-road-visual]").forEach(render); }
  document.addEventListener("click", function (e) {
    var seg = e.target.closest && e.target.closest("[data-road-visual] .rv-seg");
    if (!seg) return;
    picked = seg.getAttribute("data-seg");
    all();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var seg = e.target.closest && e.target.closest("[data-road-visual] .rv-seg");
    if (!seg) return;
    e.preventDefault();
    picked = seg.getAttribute("data-seg");
    all();
    var again = document.querySelector('[data-road-visual] .rv-seg[data-seg="' + picked + '"]');
    if (again) again.focus();
  });
  function start() { all(); setInterval(all, 30000); }
  if (window.__addLangHook) window.__addLangHook(all);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
