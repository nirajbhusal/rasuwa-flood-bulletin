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
  var N = {
    pokhara: { x: 40, y: 48, ne: "पोखरा", en: "Pokhara", ly: -14 },
    mugling: { x: 175, y: 48, ne: "मुग्लिङ", en: "Mugling", ly: -14 },
    galaudi: { x: 255, y: 48, ne: "गलौँदी (गजुरी)", en: "Galaudi (Gajuri)", ly: 26 },
    ktm: { x: 330, y: 48, ne: "काठमाडौँ", en: "Kathmandu", ly: -14 },
    narayanghat: { x: 175, y: 140, ne: "नारायणघाट", en: "Narayanghat", ly: 26 },
    butwal: { x: 40, y: 140, ne: "बुटवल", en: "Butwal", ly: 26 }
  };
  var COLORS = { open: "#15803d", night: "#d97706", closed: "#dc2626", none: "#94a3b8" };
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
  function icon(st, x, y) {
    var c = COLORS[st];
    var g = '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#fff" stroke="' + c + '" stroke-width="2.5"/>';
    if (st === "open") g += '<path d="M' + (x - 4) + " " + y + " l3 3 l5 -6" + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (st === "night") g += '<path d="M' + x + " " + (y - 5) + " v5 l3.5 2" + '" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>';
    else if (st === "closed") g += '<path d="M' + (x - 4) + " " + (y - 4) + " l8 8 M" + (x + 4) + " " + (y - 4) + " l-8 8" + '" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round"/>';
    else g += '<text x="' + x + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + c + '">?</text>';
    return g;
  }
  function svg(list) {
    var out = ['<svg class="rv-svg" viewBox="0 0 370 180" role="img" aria-label="' + esc(t("राजमार्ग स्थितिको नक्सा", "Highway status map")) + '">'];
    list.forEach(function (s) {
      var A = N[s.a], B = N[s.b];
      var dash = s.st === "none" ? ' stroke-dasharray="6 6"' : (s.st === "night" ? ' stroke-dasharray="14 5"' : "");
      out.push('<g class="rv-seg" data-seg="' + s.id + '" tabindex="0" role="button" aria-label="' + esc(s.name + ": " + words(s.st)) + '">' +
        "<title>" + esc(s.name + " · " + words(s.st)) + "</title>" +
        '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="transparent" stroke-width="26"/>' +
        '<line class="rv-line" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + COLORS[s.st] + '" stroke-width="8" stroke-linecap="round"' + dash + "/>" +
        icon(s.st, (A.x + B.x) / 2, (A.y + B.y) / 2) + "</g>");
    });
    Object.keys(N).forEach(function (k) {
      var n = N[k];
      out.push('<circle cx="' + n.x + '" cy="' + n.y + '" r="7" fill="#fff" stroke="#1e293b" stroke-width="3"/>' +
        '<text class="rv-lab" x="' + n.x + '" y="' + (n.y + n.ly) + '" text-anchor="middle">' + esc(t(n.ne, n.en)) + "</text>");
    });
    out.push("</svg>");
    return out.join("");
  }
  function legend() {
    return '<ul class="rv-legend">' + ["open", "night", "closed", "none"].map(function (st) {
      return '<li><svg viewBox="0 0 40 20" width="40" height="20" aria-hidden="true"><line x1="2" y1="10" x2="38" y2="10" stroke="' + COLORS[st] + '" stroke-width="6" stroke-linecap="round"' +
        (st === "none" ? ' stroke-dasharray="5 5"' : st === "night" ? ' stroke-dasharray="10 4"' : "") + "/>" + icon(st, 20, 10).replace(/r="9"/, 'r="7"') + "</svg><span>" + esc(words(st)) + "</span></li>";
    }).join("") + "</ul>";
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
      '<div class="rv-head"><span class="rv-k">' + esc(t("मार्ग नक्सा", "Route map")) + '</span>' +
      (g !== "open" ? '<span class="rv-flag rv-' + g + '">' + esc(t("गलौँदी", "Galaudi") + ": " + words(g)) + "</span>" : "") + "</div>" +
      svg(list) + legend() +
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
