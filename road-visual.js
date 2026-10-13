/* Schematic road status map for the homepage roads card (v3).
   Roughly geographic network schematic. A route is coloured only when its status
   is verified (official source, or 2+ outlets marked reported); otherwise it is
   grey dashed "स्थिति पुष्टि भएन". Checked Asoj 27, 12:45 PM NPT. */
(function () {
  "use strict";
  var DIG = "०१२३४५६७८९";
  function en() { return document.documentElement.lang === "en"; }
  function t(ne, e) { return en() ? e : ne; }
  function num(n) { return en() ? String(n) : String(n).replace(/\d/g, function (d) { return DIG[d]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // x: west → east, y: north → south. lx/ly/an: label position.
  var N = {
    dhangadhi: { x: 40, y: 170, lx: 40, ly: 146, an: "start", ne: "धनगढी", en: "Dhangadhi" },
    nepalgunj: { x: 170, y: 250, lx: 170, ly: 284, an: "middle", ne: "नेपालगन्ज", en: "Nepalgunj" },
    butwal: { x: 300, y: 330, lx: 300, ly: 364, an: "middle", ne: "बुटवल", en: "Butwal" },
    baglung: { x: 270, y: 110, lx: 270, ly: 86, an: "middle", ne: "बागलुङ", en: "Baglung" },
    palpa: { x: 310, y: 255, lx: 324, ly: 262, an: "start", ne: "पाल्पा (तानसेन)", en: "Palpa (Tansen)" },
    pokhara: { x: 380, y: 170, lx: 380, ly: 146, an: "middle", ne: "पोखरा", en: "Pokhara" },
    mugling: { x: 500, y: 230, lx: 486, ly: 264, an: "end", ne: "मुग्लिङ", en: "Mugling" },
    narayanghat: { x: 500, y: 330, lx: 500, ly: 364, an: "middle", ne: "नारायणघाट", en: "Narayanghat" },
    galaudi: { x: 590, y: 230, lx: 590, ly: 208, an: "middle", ne: "गलौँदी", en: "Galaudi" },
    ktm: { x: 690, y: 230, lx: 708, ly: 237, an: "start", ne: "काठमाडौँ", en: "Kathmandu" },
    dhunche: { x: 690, y: 90, lx: 690, ly: 66, an: "middle", ne: "धुन्चे (रसुवा)", en: "Dhunche (Rasuwa)" },
    kodari: { x: 830, y: 150, lx: 846, ly: 156, an: "start", ne: "कोदारी", en: "Kodari" },
    hetauda: { x: 620, y: 330, lx: 636, ly: 354, an: "start", ne: "हेटौँडा", en: "Hetauda" },
    pathlaiya: { x: 620, y: 420, lx: 620, ly: 454, an: "middle", ne: "पथलैया", en: "Pathlaiya" },
    sindhuli: { x: 790, y: 330, lx: 806, ly: 336, an: "start", ne: "सिन्धुली", en: "Sindhuli" },
    bardibas: { x: 790, y: 420, lx: 790, ly: 454, an: "middle", ne: "बर्दिबास", en: "Bardibas" },
    itahari: { x: 900, y: 420, lx: 900, ly: 454, an: "middle", ne: "इटहरी", en: "Itahari" },
    kakarbhitta: { x: 1030, y: 420, lx: 1040, ly: 454, an: "end", ne: "काँकडभिट्टा", en: "Kakarbhitta" }
  };
  var COLORS = { open: "#15803d", oneway: "#1d4ed8", night: "#b45309", closed: "#b91c1c", none: "#94a3b8" };
  var MARK = { open: "✔", oneway: "→", night: "◷", closed: "✕", none: "?" };
  function words(st) {
    if (st === "open") return t("खुला", "Open");
    if (st === "oneway") return t("एकतर्फी", "One-way");
    if (st === "night") return t("आज राति बन्द", "Closed tonight");
    if (st === "closed") return t("अहिले बन्द", "Closed now");
    return t("स्थिति पुष्टि भएन", "Status not confirmed");
  }
  // Sources (times NPT).
  var S = {
    pol: { ne: "नेपाल प्रहरी: बाटो अवरुद्ध सूचना, असोज २७ बिहान ११:२० सम्म", en: "Nepal Police: road blockage notice, to 11:20 AM Asoj 27", u: "https://www.nepalpolice.gov.np/notices/1141/" },
    rp: { ne: "रातोपाटी: संघीय सडक सुपरिवेक्षण तथा अनुगमन कार्यालय, काठमाडौँ (असोज २७)", en: "Ratopati: Federal Road Supervision and Monitoring Office, Kathmandu (Oct 13)", u: "https://english.ratopati.com/story/83506/travelers-have-started-leaving-for-dashain-what-is-the-condition-of-which-roads" },
    ok: { ne: "अनलाइनखबर (असोज २७, बिहान ९:२४; प्रहरीको बिहान ६ बजेको विवरण)", en: "Onlinekhabar (Oct 13, 9:24 AM; Nepal Police 6 AM notice)", u: "https://english.onlinekhabar.com/flood-disrupts-highways-five-districts.html" },
    op: { ne: "अनलाइनपाना (प्रहरीको बिहान ६ बजेको विवरण)", en: "Onlinepana (Nepal Police 6 AM notice)", u: "https://www.onlinepana.com/content/417910/" },
    eco: { ne: "Ecosphere News: असोज २६ बिहान ७:२० को राजमार्ग अपडेट", en: "Ecosphere News: 7:20 AM highway update, Oct 12", u: "https://www.ecospherenews.com/detail/2603" },
    dor: { ne: "सडक विभाग NAVIGATE", en: "DoR NAVIGATE", u: "https://navigate.dor.gov.np/dashboard" }
  };
  function openNote(what) {
    return t("खुला · रिपोर्ट गरिएको: असोज २६ बिहान ७:२० को अपडेटमा " + what + " खुला भनिएको, र नेपाल प्रहरीको असोज २७ बिहान ११:२० सम्मको अवरोध सूचीमा यो सडक छैन (त्यहाँ आरुघाट मात्र अवरुद्ध)।",
      "Open · reported: listed open (" + what + ") in the 7:20 AM Oct 12 update, and not on Nepal Police's blockage notice to 11:20 AM Asoj 27 (only Aarughat is listed).");
  }
  function todayNote(what) {
    return t("दुवैतर्फी खुला · रिपोर्ट गरिएको: संघीय सडक सुपरिवेक्षण तथा अनुगमन कार्यालय, काठमाडौँका प्रमुखका अनुसार " + what + " दुवैतर्फी चलिरहेको (रातोपाटी, असोज २७), र नेपाल प्रहरीको असोज २७ बिहान ११:२० सम्मको अवरोध सूचीमा छैन।",
      "Open two-way · reported: the Federal Road Supervision and Monitoring Office, Kathmandu says " + what + " is running two-way (Ratopati, Oct 13), and it is not on Nepal Police's blockage notice to 11:20 AM Asoj 27.");
  }
  var UNV = function (extra) {
    return t("पछिल्लो २४–४८ घण्टामा आधिकारिक वा दुई स्वतन्त्र स्रोतबाट स्थिति पुष्टि भएन।", "No official or two-outlet confirmation in the last 24–48 hours.") + (extra ? " " + extra : "");
  };
  function routes() {
    return [
      { id: "prithvi", segs: [["ktm", "galaudi"], ["galaudi", "mugling"]], st: "open", name: t("काठमाडौँ–गजुरी–मुग्लिङ (पृथ्वी)", "Kathmandu–Gajuri–Mugling (Prithvi)"),
        note: todayNote(t("नागढुङ्गा–नौबिसे", "Nagdhunga–Naubise")) + " " + t("गलौँदीको असोज २६–२७ को रात्रि बन्द सकियो।", "The Galaudi night closure of Asoj 26–27 is over."), src: ["rp", "pol"] },
      { id: "mugling-pokhara", segs: [["mugling", "pokhara"]], st: "open", name: t("मुग्लिङ–पोखरा", "Mugling–Pokhara"), note: openNote("Mugling–Pokhara–Kushma"), src: ["eco", "pol"] },
      { id: "mugling-narayanghat", segs: [["mugling", "narayanghat"]], st: "open", name: t("मुग्लिङ–नारायणघाट", "Mugling–Narayanghat"), note: todayNote(t("मुग्लिन–नारायणगढ", "Muglin–Narayangadh")), src: ["rp", "pol"] },
      { id: "narayanghat-butwal", segs: [["narayanghat", "butwal"]], st: "open", name: t("नारायणघाट–बुटवल", "Narayanghat–Butwal"), note: openNote("Narayangarh–Butwal"), src: ["eco", "pol"] },
      { id: "ktm-hetauda", segs: [["ktm", "hetauda"]], st: "oneway", name: t("काठमाडौँ–हेटौँडा (त्रिभुवन राजपथ)", "Kathmandu–Hetauda (Tribhuvan Rajpath)"),
        note: t("एकतर्फी · रिपोर्ट गरिएको: धुनिबेँसी–९ खत्रीपौवाको पहिरोका कारण राजपथ एकतर्फी (नेपाल प्रहरीको असोज २७ बिहान ६ बजेको विवरण उद्धृत गर्दै अनलाइनखबर, अनलाइनपाना)। कान्ति लोकपथ दुवैतर्फी चलिरहेको (रातोपाटी, संघीय सडक कार्यालय)।",
          "One-way · reported: Rajpath one-way after the landslide at Khatripauwa, Dhunibesi-9 (Onlinekhabar, Onlinepana citing Nepal Police's 6 AM Oct 13 notice). Kanti Lokpath is running two-way (Ratopati, federal road office)."), src: ["ok", "op", "rp"] },
      { id: "bp", segs: [["ktm", "sindhuli"], ["sindhuli", "bardibas"]], st: "open", name: t("काठमाडौँ–सिन्धुली–बर्दिबास (बीपी)", "Kathmandu–Sindhuli–Bardibas (BP)"), note: todayNote(t("बीपी राजमार्ग", "the BP Highway")), src: ["rp", "pol"] },
      { id: "narayanghat-hetauda", segs: [["narayanghat", "hetauda"]], st: "none", name: t("नारायणघाट–हेटौँडा", "Narayanghat–Hetauda"), note: UNV(""), src: [] },
      { id: "hetauda-pathlaiya", segs: [["hetauda", "pathlaiya"]], st: "open", name: t("हेटौँडा–पथलैया", "Hetauda–Pathlaiya"), note: openNote("Hetauda–Pathlaiya–Janakpur"), src: ["eco", "pol"] },
      { id: "pasang-lhamu", segs: [["ktm", "dhunche"]], st: "none", name: t("काठमाडौँ–धुन्चे (पासाङ ल्हामु)", "Kathmandu–Dhunche (Pasang Lhamu)"), note: UNV(t("सडक विभाग NAVIGATE: NH42 (गल्छी–त्रिशूली–रसुवागढी) भदौ १० देखि बन्द देखाउँछ।", "DoR NAVIGATE lists NH42 (Galchi–Trishuli–Rasuwagadhi) closed since Aug 26.")), src: ["dor"] },
      { id: "araniko", segs: [["ktm", "kodari"]], st: "none", name: t("काठमाडौँ–कोदारी (अरनिको)", "Kathmandu–Kodari (Araniko)"), note: UNV(""), src: [] },
      { id: "pokhara-baglung", segs: [["pokhara", "baglung"]], st: "none", name: t("पोखरा–बागलुङ", "Pokhara–Baglung"), note: UNV(t("(यो खण्डभन्दा पर बेनी–जोमसोम बैसारीमा र कालीगण्डकी करिडोर जन्तीमा एकतर्फी।)", "(Beyond this stretch, Beni–Jomsom at Baisari and the Kaligandaki Corridor at Janti are one-way.)")), src: ["ok"] },
      { id: "butwal-palpa", segs: [["butwal", "palpa"]], st: "open", name: t("बुटवल–पाल्पा (सिद्धार्थ)", "Butwal–Palpa (Siddhartha)"), note: openNote("Butwal–Palpa"), src: ["eco", "pol"] },
      { id: "butwal-nepalgunj", segs: [["butwal", "nepalgunj"]], st: "open", name: t("बुटवल–नेपालगन्ज (पूर्व–पश्चिम)", "Butwal–Nepalgunj (East–West)"), note: openNote("Butwal–Nepalgunj"), src: ["eco", "pol"] },
      { id: "nepalgunj-dhangadhi", segs: [["nepalgunj", "dhangadhi"]], st: "open", name: t("नेपालगन्ज–धनगढी (पूर्व–पश्चिम)", "Nepalgunj–Dhangadhi (East–West)"), note: openNote("Nepalgunj–Dhangadhi"), src: ["eco", "pol"] },
      { id: "pathlaiya-bardibas", segs: [["pathlaiya", "bardibas"]], st: "open", name: t("पथलैया–बर्दिबास (पूर्व–पश्चिम)", "Pathlaiya–Bardibas (East–West)"), note: openNote("Hetauda–Pathlaiya–Janakpur"), src: ["eco", "pol"] },
      { id: "bardibas-itahari", segs: [["bardibas", "itahari"]], st: "open", name: t("बर्दिबास–इटहरी (पूर्व–पश्चिम)", "Bardibas–Itahari (East–West)"), note: openNote("Bardibas–Koshi Barrage–Itahari"), src: ["eco", "pol"] },
      { id: "itahari-kakarbhitta", segs: [["itahari", "kakarbhitta"]], st: "open", name: t("इटहरी–काँकडभिट्टा (पूर्व–पश्चिम)", "Itahari–Kakarbhitta (East–West)"), note: openNote("Itahari–Damak–Kakarbhitta"), src: ["eco", "pol"] }
    ];
  }
  function icon(st, x, y, r) {
    r = r || 10;
    var c = COLORS[st], k = r / 11;
    var g = '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff" stroke="' + c + '" stroke-width="3"/>';
    if (st === "open") g += '<path d="M' + (x - 5 * k) + " " + y + " l" + 3.5 * k + " " + 3.5 * k + " l" + 6.5 * k + " " + (-7.5 * k) + '" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (st === "oneway") g += '<path d="M' + (x - 5 * k) + " " + y + " h" + 9 * k + " m" + (-4 * k) + " " + (-4 * k) + " l" + 4 * k + " " + 4 * k + " l" + (-4 * k) + " " + 4 * k + '" fill="none" stroke="' + c + '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';
    else if (st === "night") g += '<path d="M' + x + " " + (y - 6 * k) + " v" + 6 * k + " l" + 4 * k + " " + 2.5 * k + '" fill="none" stroke="' + c + '" stroke-width="2.8" stroke-linecap="round"/>';
    else if (st === "closed") g += '<path d="M' + (x - 5 * k) + " " + (y - 5 * k) + " l" + 10 * k + " " + 10 * k + " M" + (x + 5 * k) + " " + (y - 5 * k) + " l" + (-10 * k) + " " + 10 * k + '" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>';
    else g += '<text x="' + x + '" y="' + (y + 5 * k) + '" text-anchor="middle" font-size="' + 14 * k + '" font-weight="800" fill="' + c + '">?</text>';
    return g;
  }
  function dash(st) { return st === "none" ? ' stroke-dasharray="4 9"' : st === "night" ? ' stroke-dasharray="16 6"' : ""; }
  function svg(list) {
    var out = ['<svg class="rv-svg" viewBox="0 0 1060 480" role="img" aria-label="' + esc(t("नेपालका मुख्य राजमार्गको स्थिति नक्सा", "Status map of Nepal's main highways")) + '">'];
    // Unverified first so coloured routes draw on top.
    list.slice().sort(function (a, b) { return (a.st === "none" ? 0 : 1) - (b.st === "none" ? 0 : 1); }).forEach(function (r) {
      var quiet = r.st === "none";
      var g = '<g class="rv-seg' + (quiet ? " is-quiet" : "") + '" data-seg="' + r.id + '" tabindex="0" role="button" aria-label="' + esc(r.name + ": " + words(r.st)) + '"><title>' + esc(r.name + " · " + words(r.st)) + "</title>";
      r.segs.forEach(function (s) {
        var A = N[s[0]], B = N[s[1]];
        g += '<line x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="transparent" stroke-width="28"/>' +
          '<line class="rv-line" x1="' + A.x + '" y1="' + A.y + '" x2="' + B.x + '" y2="' + B.y + '" stroke="' + COLORS[r.st] + '" stroke-width="' + (quiet ? 5 : 9) + '" stroke-linecap="round"' + dash(r.st) + "/>" +
          icon(r.st, (A.x + B.x) / 2, (A.y + B.y) / 2, quiet ? 8 : 10);
      });
      out.push(g + "</g>");
    });
    Object.keys(N).forEach(function (k) {
      var n = N[k];
      out.push('<circle cx="' + n.x + '" cy="' + n.y + '" r="' + (k === "ktm" ? 10 : 7) + '" fill="#fff" stroke="#0f172a" stroke-width="' + (k === "ktm" ? 4.5 : 3.5) + '"/>' +
        '<text class="rv-lab' + (k === "ktm" ? " is-cap" : "") + '" x="' + n.lx + '" y="' + n.ly + '" text-anchor="' + n.an + '">' + esc(t(n.ne, n.en)) + "</text>");
    });
    out.push('<g class="rv-compass" aria-hidden="true"><text x="10" y="470" font-size="14" font-weight="800" fill="#64748b">' + esc(t("← पश्चिम", "← West")) + '</text>' +
      '<text x="1050" y="470" text-anchor="end" font-size="14" font-weight="800" fill="#64748b">' + esc(t("पूर्व →", "East →")) + "</text></g></svg>");
    return out.join("");
  }
  function rows(list) {
    return '<ol class="rv-rows">' + list.map(function (r) {
      return '<li class="rv-row rv-' + r.st + '"><button type="button" class="rv-seg rv-row-btn" data-seg="' + r.id + '">' +
        '<span class="rv-row-bar" aria-hidden="true"></span><span class="rv-row-name">' + esc(r.name) + "</span>" +
        '<span class="rv-row-pill"><span aria-hidden="true">' + MARK[r.st] + "</span> " + esc(words(r.st)) + "</span></button></li>";
    }).join("") + "</ol>";
  }
  function legend() {
    return '<ul class="rv-legend">' + ["open", "oneway", "closed", "none"].map(function (st) {
      return '<li class="rv-lg-' + st + '"><svg viewBox="0 0 46 24" width="46" height="24" aria-hidden="true"><line x1="3" y1="12" x2="43" y2="12" stroke="' + COLORS[st] + '" stroke-width="' + (st === "none" ? 4 : 8) + '" stroke-linecap="round"' + dash(st).replace("4 9", "3 7").replace("16 6", "12 5") + "/>" + icon(st, 23, 12, 9) + "</svg><span>" + esc(words(st)) + "</span></li>";
    }).join("") + "</ul>";
  }
  function summary(list) {
    var c = { open: 0, oneway: 0, closed: 0, none: 0 };
    list.forEach(function (r) { c[r.st]++; });
    var parts = [num(c.open) + t(" मार्ग खुला (पुष्टि)", " routes open (verified)")];
    if (c.oneway) parts.push(num(c.oneway) + t(" एकतर्फी", " one-way"));
    parts.push(num(c.closed) + t(" बन्द", " closed"));
    parts.push(num(c.none) + t(" को स्थिति पुष्टि भएन", " not confirmed"));
    return parts.join(" · ");
  }
  function srcHtml(keys) {
    if (!keys.length) return "";
    return '<span class="rv-src">' + esc(t("स्रोत: ", "Sources: ")) + keys.map(function (k) {
      return '<a href="' + S[k].u + '" target="_blank" rel="noopener">' + esc(t(S[k].ne, S[k].en)) + "</a>";
    }).join(" · ") + "</span>";
  }
  var picked = "";
  function render(root) {
    var list = routes();
    var oldMap = root.querySelector(".rv-map");
    var keep = oldMap ? oldMap.scrollLeft : -1;
    var cur = list.filter(function (r) { return r.id === picked; })[0] || list[0];
    root.innerHTML =
      '<div class="rv-map">' + svg(list) + "</div>" +
      '<p class="rv-summary">' + esc(summary(list)) + "</p>" +
      '<p class="rv-detail" aria-live="polite"><strong>' + esc(cur.name) + " · " + esc(words(cur.st)) + "</strong><br>" + esc(cur.note) + "<br>" + srcHtml(cur.src) + "</p>" +
      legend() + rows(list) +
      '<p class="rv-asof">' + esc(t("नक्सा जाँच: असोज २७, दिउँसो १२:४५ NPT · रङ भएका मार्ग मात्र पुष्टि भएका", "Map checked Asoj 27, 12:45 PM NPT · only coloured routes are verified")) + "</p>";
    root.querySelectorAll(".rv-seg").forEach(function (el) {
      if (el.getAttribute("data-seg") === cur.id) el.classList.add("is-picked");
    });
    // Narrow screens scroll the map sideways; start centred on Kathmandu.
    var map = root.querySelector(".rv-map");
    if (map && map.scrollWidth > map.clientWidth) {
      map.scrollLeft = keep >= 0 ? keep : Math.max(0, map.scrollWidth * (640 / 1060) - map.clientWidth / 2);
    }
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
  function start() { all(); }
  if (window.__addLangHook) window.__addLangHook(all);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
