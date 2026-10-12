/* Schematic road status map for the homepage roads card (v3).
   Roughly geographic network schematic. A route is coloured only when its status
   is verified (official source, or 2+ outlets marked reported); otherwise it is
   grey dashed "स्थिति पुष्टि भएन". Galaudi night closure is time-aware. */
(function () {
  "use strict";
  var CLOSE_FROM = Date.parse("2026-10-12T23:00:00+05:45");
  var CLOSE_TO = Date.parse("2026-10-13T05:00:00+05:45");
  var DIG = "०१२३४५६७८९";
  function en() { return document.documentElement.lang === "en"; }
  function t(ne, e) { return en() ? e : ne; }
  function num(n) { return en() ? String(n) : String(n).replace(/\d/g, function (d) { return DIG[d]; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function galaudiState(now) {
    if (now >= CLOSE_TO) return "open";
    if (now >= CLOSE_FROM) return "closed";
    return "night";
  }
  // x: west → east, y: north → south. lx/ly/an: label position.
  var N = {
    dhangadhi: { x: 40, y: 170, lx: 40, ly: 146, an: "start", ne: "धनगढी", en: "Dhangadhi" },
    nepalgunj: { x: 170, y: 250, lx: 170, ly: 284, an: "middle", ne: "नेपालगन्ज", en: "Nepalgunj" },
    butwal: { x: 300, y: 330, lx: 300, ly: 364, an: "middle", ne: "बुटवल", en: "Butwal" },
    baglung: { x: 270, y: 110, lx: 270, ly: 86, an: "middle", ne: "बागलुङ", en: "Baglung" },
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
    pol: { ne: "नेपाल प्रहरी: बाटो अवरुद्ध सूचना, असोज २६ दिउँसो ३ बजेसम्म", en: "Nepal Police: road blockage notice, to 3 PM Asoj 26", u: "https://www.nepalpolice.gov.np/notices/1141/" },
    eco: { ne: "Ecosphere News: बिहान ७:२० को राजमार्ग अपडेट (असोज २६)", en: "Ecosphere News: 7:20 AM highway update (Oct 12)", u: "https://www.ecospherenews.com/detail/2603" },
    hp: { ne: "हिमाल प्रेस (असोज २६, बिहान ८:४६)", en: "Himal Press (Oct 12, 8:46 AM)", u: "https://himalpress.com/2026/10/traffic-remains-disrupted-in-rasuwa-and-gorkha-even-after-dashain-roads-in-4-districts-remain-one-way/" },
    ak: { ne: "अर्थ खबर (असोज २६, बिहान ७:४२)", en: "Artha Khabar (Oct 12, 7:42 AM)", u: "https://arthakhabar.com/en/2026/10/12/114552/" },
    kan: { ne: "कान्तिपुर", en: "Kantipur", u: "https://ekantipur.com/news/2026/10/12/traffic-ban-on-galaudi-section-of-prithvi-highway-on-monday-night-14-36.html" },
    nag: { ne: "नागरिक", en: "Nagarik", u: "https://www.nagariknews.nagariknetwork.com/social-affairs/prithvi-highway-to-be-closed-from-11-pm-to-5-am-br-61-95.html" },
    ns: { ne: "नेपाल समय", en: "Nepal Samaya", u: "https://nepalsamaya.com/detail/146947" },
    dor: { ne: "सडक विभाग NAVIGATE", en: "DoR NAVIGATE", u: "https://navigate.dor.gov.np/dashboard" }
  };
  function openNote(what) {
    return t("खुला · रिपोर्ट गरिएको: बिहान ७:२० को अपडेटमा " + what + " खुला भनिएको, र नेपाल प्रहरीको असोज २६ दिउँसो ३ बजेसम्मको अवरोध सूचीमा यो सडक छैन (त्यहाँ आरुघाट मात्र अवरुद्ध)।",
      "Open · reported: listed open (" + what + ") in the 7:20 AM update, and not on Nepal Police's blockage notice to 3 PM Asoj 26 (only Aarughat is listed).");
  }
  var UNV = function (extra) {
    return t("पछिल्लो २४–४८ घण्टामा आधिकारिक वा दुई स्वतन्त्र स्रोतबाट स्थिति पुष्टि भएन।", "No official or two-outlet confirmation in the last 24–48 hours.") + (extra ? " " + extra : "");
  };
  function routes(now) {
    var g = galaudiState(now);
    var conf = t("असोज २५, दिउँसो ४:४५ NPT मा प्रयोगकर्ताले पुष्टि गरेको", "user-confirmed, Asoj 25, 4:45 PM NPT");
    var gNote = g === "open"
      ? t("दुवैतर्फी (two-way) खुलेको · ", "Open (two-way) · ") + conf
      : t("गलौँदी (गजुरी–५) मा मर्मतका लागि असोज २६ राति ११ बजेदेखि असोज २७ बिहान ५ बजेसम्म सबै सवारी बन्द · रिपोर्ट गरिएको (जिल्ला प्रशासन कार्यालय धादिङको सूचना उद्धृत गर्दै कान्तिपुर, नागरिक, नेपाल समय)। अरू समय दुवैतर्फी खुला।",
          "Galaudi (Gajuri-5): all traffic stopped for repairs from 11 PM Asoj 26 to 5 AM Asoj 27 · reported (Kantipur, Nagarik, Nepal Samaya citing a DAO Dhading notice). Open two-way otherwise.");
    return [
      { id: "prithvi", segs: [["ktm", "galaudi"], ["galaudi", "mugling"]], st: g, name: t("काठमाडौँ–गजुरी–मुग्लिङ (पृथ्वी)", "Kathmandu–Gajuri–Mugling (Prithvi)"), note: gNote, src: ["kan", "nag", "ns"] },
      { id: "mugling-pokhara", segs: [["mugling", "pokhara"]], st: "open", name: t("मुग्लिङ–पोखरा", "Mugling–Pokhara"), note: t("खुला · ", "Open · ") + conf, src: ["eco", "pol"] },
      { id: "mugling-narayanghat", segs: [["mugling", "narayanghat"]], st: "open", name: t("मुग्लिङ–नारायणघाट", "Mugling–Narayanghat"), note: openNote("Mugling–Narayangarh"), src: ["eco", "pol"] },
      { id: "narayanghat-butwal", segs: [["narayanghat", "butwal"]], st: "open", name: t("नारायणघाट–बुटवल", "Narayanghat–Butwal"), note: t("खुला · ", "Open · ") + conf, src: ["eco", "pol"] },
      { id: "ktm-hetauda", segs: [["ktm", "hetauda"]], st: "oneway", name: t("काठमाडौँ–हेटौँडा (त्रिभुवन राजपथ)", "Kathmandu–Hetauda (Tribhuvan Rajpath)"),
        note: t("एकतर्फी · रिपोर्ट गरिएको: धुनिबेँसी–९ खत्रीपौवामा असोज २१ राति ९:५० को पहिरोपछि राजपथ एकतर्फी सञ्चालनमा (नेपाल प्रहरीको विवरण उद्धृत गर्दै हिमाल प्रेस, अर्थ खबर)। काठमाडौँ–कुलेखानी–हेटौँडा मार्ग बिहान ७:२० को अपडेटमा खुला भनिएको।",
          "One-way · reported: Rajpath running one-way at Khatripauwa (Dhunibesi-9) after the 9:50 PM Asoj 21 landslide (Himal Press, Artha Khabar citing Nepal Police). The Kathmandu–Kulekhani–Hetauda route was listed open in the 7:20 AM update."), src: ["hp", "ak", "eco"] },
      { id: "bp", segs: [["ktm", "sindhuli"], ["sindhuli", "bardibas"]], st: "none", name: t("काठमाडौँ–सिन्धुली–बर्दिबास (बीपी)", "Kathmandu–Sindhuli–Bardibas (BP)"), note: UNV(t("सडक विभाग NAVIGATE: NH13 को खण्ड आंशिक खुला।", "DoR NAVIGATE: a section of NH13 partially open.")), src: ["dor"] },
      { id: "narayanghat-hetauda", segs: [["narayanghat", "hetauda"]], st: "none", name: t("नारायणघाट–हेटौँडा", "Narayanghat–Hetauda"), note: UNV(""), src: [] },
      { id: "hetauda-pathlaiya", segs: [["hetauda", "pathlaiya"]], st: "open", name: t("हेटौँडा–पथलैया", "Hetauda–Pathlaiya"), note: openNote("Hetauda–Pathlaiya–Janakpur"), src: ["eco", "pol"] },
      { id: "pasang-lhamu", segs: [["ktm", "dhunche"]], st: "none", name: t("काठमाडौँ–धुन्चे (पासाङ ल्हामु)", "Kathmandu–Dhunche (Pasang Lhamu)"), note: UNV(t("सडक विभाग NAVIGATE: NH42 (गल्छी–त्रिशूली–रसुवागढी) भदौ १० देखि बन्द देखाउँछ।", "DoR NAVIGATE lists NH42 (Galchi–Trishuli–Rasuwagadhi) closed since Aug 26.")), src: ["dor"] },
      { id: "araniko", segs: [["ktm", "kodari"]], st: "none", name: t("काठमाडौँ–कोदारी (अरनिको)", "Kathmandu–Kodari (Araniko)"), note: UNV(""), src: [] },
      { id: "pokhara-baglung", segs: [["pokhara", "baglung"]], st: "none", name: t("पोखरा–बागलुङ", "Pokhara–Baglung"), note: UNV(t("(बेनी–जोमसोम सडक बैसारीमा अवरुद्ध भनिएको छ, यो खण्डभन्दा पर।)", "(Beni–Jomsom, beyond this stretch, is reported obstructed at Baisari.)")), src: ["ak"] },
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
    return '<ul class="rv-legend">' + ["open", "oneway", "night", "closed", "none"].map(function (st) {
      return '<li class="rv-lg-' + st + '"><svg viewBox="0 0 46 24" width="46" height="24" aria-hidden="true"><line x1="3" y1="12" x2="43" y2="12" stroke="' + COLORS[st] + '" stroke-width="' + (st === "none" ? 4 : 8) + '" stroke-linecap="round"' + dash(st).replace("4 9", "3 7").replace("16 6", "12 5") + "/>" + icon(st, 23, 12, 9) + "</svg><span>" + esc(words(st)) + "</span></li>";
    }).join("") + "</ul>";
  }
  function summary(list, g) {
    var c = { open: 0, oneway: 0, closed: 0, none: 0 };
    list.forEach(function (r) { c[r.st === "night" ? "open" : r.st]++; });
    var parts = [num(c.open) + t(" मार्ग खुला (पुष्टि)", " routes open (verified)")];
    if (c.oneway) parts.push(num(c.oneway) + t(" एकतर्फी", " one-way"));
    parts.push(num(c.closed) + t(" बन्द", " closed"));
    parts.push(num(c.none) + t(" को स्थिति पुष्टि भएन", " not confirmed"));
    if (g === "night") parts.push(t("गलौँदी आज राति ११ बजेदेखि बिहान ५ बजेसम्म बन्द", "Galaudi closes tonight from 11 PM to 5 AM"));
    if (g === "closed") parts.push(t("गलौँदी अहिले बन्द, बिहान ५ बजेसम्म", "Galaudi closed now until 5 AM"));
    return parts.join(" · ");
  }
  function banner(g) {
    if (g === "open") return "";
    var big = g === "night"
      ? t("गलौँदी: आज राति बन्द · राति ११ बजे – बिहान ५ बजे", "Galaudi: closed tonight · 11 PM – 5 AM")
      : t("गलौँदी: अहिले बन्द · बिहान ५ बजे खुल्ने", "Galaudi: closed now · reopens 5 AM");
    return '<div class="rv-banner rv-' + g + '" role="status"><svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">' + icon(g, 14, 14, 11) + "</svg>" +
      "<div><strong>" + esc(big) + "</strong><span>" + esc(t("असोज २६ राति ११ बजे – असोज २७ बिहान ५ बजे NPT · मर्मत · रिपोर्ट गरिएको", "Asoj 26, 11 PM – Asoj 27, 5 AM NPT · repairs · reported")) + "</span></div></div>";
  }
  function srcHtml(keys) {
    if (!keys.length) return "";
    return '<span class="rv-src">' + esc(t("स्रोत: ", "Sources: ")) + keys.map(function (k) {
      return '<a href="' + S[k].u + '" target="_blank" rel="noopener">' + esc(t(S[k].ne, S[k].en)) + "</a>";
    }).join(" · ") + "</span>";
  }
  var picked = "";
  function render(root) {
    var now = Date.now();
    var g = galaudiState(now);
    var list = routes(now);
    var oldMap = root.querySelector(".rv-map");
    var keep = oldMap ? oldMap.scrollLeft : -1;
    var cur = list.filter(function (r) { return r.id === picked; })[0] || list[0];
    root.innerHTML =
      '<div class="rv-map">' + svg(list) + "</div>" +
      '<p class="rv-summary">' + esc(summary(list, g)) + "</p>" + banner(g) +
      '<p class="rv-detail" aria-live="polite"><strong>' + esc(cur.name) + " · " + esc(words(cur.st)) + "</strong><br>" + esc(cur.note) + "<br>" + srcHtml(cur.src) + "</p>" +
      legend() + rows(list) +
      '<p class="rv-asof">' + esc(t("नक्सा जाँच: असोज २६, साँझ ५:४५ NPT · रङ भएका मार्ग मात्र पुष्टि भएका · गलौँदी बन्द: रिपोर्ट गरिएको", "Map checked Asoj 26, 5:45 PM NPT · only coloured routes are verified · Galaudi closure: reported")) + "</p>";
    root.querySelectorAll(".rv-seg").forEach(function (el) {
      if (el.getAttribute("data-seg") === cur.id) el.classList.add("is-picked");
    });
    // Narrow screens scroll the map sideways; start centred on Kathmandu.
    var map = root.querySelector(".rv-map");
    if (map && map.scrollWidth > map.clientWidth) {
      map.scrollLeft = keep >= 0 ? keep : Math.max(0, map.scrollWidth * (640 / 1060) - map.clientWidth / 2);
    }
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
