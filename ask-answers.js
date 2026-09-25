/*! Rasuwa flood bulletin · Ask answer engine.
    Maps a question to an intent and writes 1–3 sentences from published JSON.
    No page snippets, no HTML, no invented figures. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AskAnswers = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var INTENTS = [
    "weather_today", "weather_day", "weather_place", "weather_source",
    "roads", "roads_nh42", "roads_araniko", "roads_code", "roads_place",
    "map",
    "rescue_missing", "rescue_dead", "rescue_rescued", "rescue_overview", "rescue_source",
    "fund", "donate", "fund_source",
    "helpline", "names", "lpg", "lpg_source",
    "cause", "gallery", "about", "markets", "fallback"
  ];

  var DIG = "०१२३४५६७८९";
  var RAIN = {
    red: { en: "heavy to very heavy rain is possible", ne: "भारीदेखि धेरै भारी वर्षा हुन सक्छ" },
    orange: { en: "heavy rain is possible", ne: "भारी वर्षा हुन सक्छ" },
    yellow: { en: "heavy rain is possible in some places", ne: "केही स्थानमा भारी वर्षा हुन सक्छ" },
    green: { en: "there is no warning", ne: "चेतावनी छैन" }
  };
  var PROVINCES = [
    { id: "koshi", keys: ["koshi", "kosi", "कोशी", "कोसी"] },
    { id: "madhesh", keys: ["madhesh", "madhes", "मधेश", "मधेस"] },
    { id: "bagmati", keys: ["bagmati", "बागमती"] },
    { id: "gandaki", keys: ["gandaki", "गण्डकी"] },
    { id: "lumbini", keys: ["lumbini", "लुम्बिनी"] },
    { id: "karnali", keys: ["karnali", "कर्णाली"] },
    { id: "sudurpaschim", keys: ["sudurpaschim", "sudurpashchim", "sudur paschim", "far west", "farwest", "सुदूरपश्चिम", "सुदुरपश्चिम"] }
  ];
  var DISTRICTS = [
    { id: "rasuwa", province: "bagmati", corridor: true, keys: ["rasuwa", "रसुवा"] },
    { id: "sindhupalchok", province: "bagmati", keys: ["sindhupalchok", "sindhupalchowk", "sindupalchok", "सिन्धुपाल्चोक", "सिंधुपाल्चोक"] },
    { id: "nuwakot", province: "bagmati", corridor: true, keys: ["nuwakot", "नुवाकोट"] },
    { id: "dhading", province: "bagmati", corridor: true, keys: ["dhading", "धादिङ", "धादिंग"] },
    { id: "gorkha", province: "gandaki", corridor: true, keys: ["gorkha", "गोरखा"] },
    { id: "chitwan", province: "bagmati", corridor: true, keys: ["chitwan", "चितवन"] },
    { id: "baglung", province: "gandaki", keys: ["baglung", "बागलुङ", "बागलुंग"] },
    { id: "myagdi", province: "gandaki", keys: ["myagdi", "म्याग्दी", "म्यागदी"] }
  ];
  var HELPLINES = [
    { tel: "1234", ne: "उद्धार / DEOC", en: "Rescue / DEOC" },
    { tel: "100", ne: "नेपाल प्रहरी", en: "Nepal Police" },
    { tel: "1111", ne: "नेपाली सेना", en: "Nepal Army" },
    { tel: "1155", ne: "बाढी पूर्वानुमान", en: "Flood forecast" }
  ];
  var SUGGEST = [
    { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
    { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
    { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" }
  ];
  var HINT_INTENT = {
    weather: "weather_today",
    roads: "roads",
    map: "map",
    rescue: "rescue_overview",
    names: "names",
    fund: "fund",
    helpline: "helpline",
    lpg: "lpg",
    markets: "markets",
    about: "about",
    gallery: "gallery",
    cause: "cause"
  };

  function ascii(s) {
    return String(s == null ? "" : s).replace(/[०-९]/g, function (d) {
      return "0123456789"[DIG.indexOf(d)];
    });
  }
  function digits(s, lang) {
    s = ascii(s);
    if (lang === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return DIG[d]; });
  }
  function norm(s) {
    return ascii(s).normalize("NFKC").toLowerCase()
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .replace(/[’'`]/g, "")
      .replace(/[–—−-]/g, " ")
      .replace(/[.,;:!?()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function tx(obj, lang) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.ne || obj.en || "";
  }
  function hit(q, words) {
    for (var i = 0; i < words.length; i++) {
      var w = norm(words[i]);
      if (!w) continue;
      if (w.indexOf(" ") >= 0 || /[\u0900-\u097f]/.test(w) || w.length >= 4) {
        if (q.indexOf(w) >= 0) return true;
      } else {
        var re = new RegExp("(^|\\s)" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\s|$)");
        if (re.test(q)) return true;
      }
    }
    return false;
  }
  function findKey(q, rows) {
    var best = null;
    var bestLen = 0;
    rows.forEach(function (row) {
      row.keys.forEach(function (k) {
        var n = norm(k);
        if (n && q.indexOf(n) >= 0 && n.length > bestLen) {
          best = row;
          bestLen = n.length;
        }
      });
    });
    return best;
  }
  function ktmISO(offset, nowIso) {
    var base;
    if (nowIso) {
      var p = String(nowIso).slice(0, 10).split("-");
      base = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    } else {
      var fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" });
      var parts = fmt.format(new Date()).split("-");
      base = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    }
    if (offset) base.setUTCDate(base.getUTCDate() + offset);
    var m = String(base.getUTCMonth() + 1);
    var d = String(base.getUTCDate());
    if (m.length < 2) m = "0" + m;
    if (d.length < 2) d = "0" + d;
    return base.getUTCFullYear() + "-" + m + "-" + d;
  }
  function clamp(text) {
    var s = String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (s.length <= 400) return s;
    var cut = s.slice(0, 400);
    var dot = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("।"));
    if (dot > 80) return cut.slice(0, dot + 1).trim();
    return cut.trim();
  }
  function sourceLine(lang, name, when) {
    var label = lang === "en" ? "Source" : "स्रोत";
    return when ? (label + ": " + name + " · " + when) : (label + ": " + name);
  }
  function detailsLabel(lang) {
    return lang === "en" ? "View details" : "विवरण हेर्नुहोस्";
  }
  function missingText(lang) {
    return lang === "en"
      ? "The latest official figure isn't available."
      : "पछिल्लो आधिकारिक अंक अहिले उपलब्ध छैन।";
  }
  function pack(lang, text, src, href, extra) {
    extra = extra || {};
    var out = {
      text: clamp(text),
      source: src || "",
      href: href || "",
      cta: href ? detailsLabel(lang) : "",
      links: (extra.links || []).slice(0, 1),
      followups: extra.followups || [],
      suggest: !!extra.suggest,
      chips: extra.chips || [],
      openNames: extra.openNames
    };
    return out;
  }
  function follow(list) { return list.slice(0, 3); }

  var FOLLOW = {
    weather_today: follow([
      { ne: "भोलिको मौसम?", en: "Tomorrow’s weather?" },
      { ne: "रसुवाको मौसम?", en: "Weather in Rasuwa?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" }
    ]),
    weather_day: follow([
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "सिन्धुपाल्चोकको मौसम?", en: "Weather in Sindhupalchok?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" }
    ]),
    weather_place: follow([
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" }
    ]),
    roads: follow([
      { ne: "पासाङ ल्हामु राजमार्ग खुल्यो?", en: "Is the Pasang Lhamu highway open?" },
      { ne: "अरनिको राजमार्गको अवस्था?", en: "What about the Araniko highway?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" }
    ]),
    roads_nh42: follow([
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
      { ne: "अरनिको राजमार्गको अवस्था?", en: "What about the Araniko highway?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" }
    ]),
    roads_araniko: follow([
      { ne: "पासाङ ल्हामु राजमार्ग खुल्यो?", en: "Is the Pasang Lhamu highway open?" },
      { ne: "सिन्धुपाल्चोकको मौसम?", en: "Weather in Sindhupalchok?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" }
    ]),
    map: follow([
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
      { ne: "पासाङ ल्हामु राजमार्ग खुल्यो?", en: "Is the Pasang Lhamu highway open?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" }
    ]),
    rescue_missing: follow([
      { ne: "मृतक संख्या कति हो?", en: "How many deaths?" },
      { ne: "उद्धार कति भयो?", en: "How many were rescued?" },
      { ne: "नाम कसरी खोज्ने?", en: "How do I search a name?" }
    ]),
    rescue_dead: follow([
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" },
      { ne: "नाम कसरी खोज्ने?", en: "How do I search a name?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" }
    ]),
    rescue_rescued: follow([
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" },
      { ne: "मृतक संख्या कति हो?", en: "How many deaths?" },
      { ne: "नाम कसरी खोज्ने?", en: "How do I search a name?" }
    ]),
    rescue_overview: follow([
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" },
      { ne: "मृतक संख्या कति हो?", en: "How many deaths?" },
      { ne: "नाम कसरी खोज्ने?", en: "How do I search a name?" }
    ]),
    fund: follow([
      { ne: "कसरी दान गर्ने?", en: "How do I donate?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" },
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" }
    ]),
    donate: follow([
      { ne: "राहत कोष कति छ?", en: "How much is in the relief fund?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" },
      { ne: "एलपीजी कति आयो?", en: "How much LPG came in?" }
    ]),
    helpline: follow([
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "नाम कसरी खोज्ने?", en: "How do I search a name?" }
    ]),
    names: follow([
      { ne: "कति जना बेपत्ता छन्?", en: "How many people are missing?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" },
      { ne: "मृतक संख्या कति हो?", en: "How many deaths?" }
    ]),
    lpg: follow([
      { ne: "राहत कोष कति छ?", en: "How much is in the relief fund?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" },
      { ne: "कसरी दान गर्ने?", en: "How do I donate?" }
    ]),
    cause: follow([
      { ne: "फोटो कहाँ छन्?", en: "Where are the photos?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "यो बुलेटिन के हो?", en: "What is this bulletin?" }
    ]),
    gallery: follow([
      { ne: "बाढी किन आयो?", en: "What caused the flood?" },
      { ne: "यो बुलेटिन के हो?", en: "What is this bulletin?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" }
    ]),
    about: follow([
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "बाढी किन आयो?", en: "What caused the flood?" },
      { ne: "हेल्पलाइन नम्बर?", en: "Helpline numbers?" }
    ]),
    markets: follow([
      { ne: "राहत कोष कति छ?", en: "How much is in the relief fund?" },
      { ne: "कसरी दान गर्ने?", en: "How do I donate?" },
      { ne: "यो बुलेटिन के हो?", en: "What is this bulletin?" }
    ]),
    fallback: []
  };

  function edit1(a, b) {
    if (a === b) return 0;
    var la = a.length;
    var lb = b.length;
    if (Math.abs(la - lb) > 1) return 2;
    var i = 0;
    var j = 0;
    var used = 0;
    while (i < la && j < lb) {
      if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
      if (used) return 2;
      used = 1;
      if (la > lb) i++;
      else if (lb > la) j++;
      else { i++; j++; }
    }
    if (i < la || j < lb) used++;
    return used;
  }

  function classify(raw, opt) {
    opt = opt || {};
    var original = String(raw || "").trim();
    var q = norm(original);
    var compact = q.replace(/\s+/g, "");
    var hint = opt.hint || "";
    var spec = {
      intent: "fallback",
      family: "about",
      topic: "about",
      raw: original,
      dayOffset: null,
      asoj: null,
      dow: "",
      district: null,
      province: null,
      roadKind: "",
      place: "",
      query: "",
      meta: "",
      tel: ""
    };
    if (!q) {
      if (hint && HINT_INTENT[hint]) {
        spec.intent = HINT_INTENT[hint];
        return finishSpec(spec);
      }
      spec.intent = "fallback";
      return finishSpec(spec);
    }

    var tel = compact.match(/^(1234|100|1148|1111|1114|102|1144|1155)$/);
    if (tel) {
      spec.intent = "helpline";
      spec.tel = tel[1];
      return finishSpec(spec);
    }

    var asoj = q.match(/(?:asoj|ashwin|ashoj|असोज|आश्विन)\s*(\d{1,2})/);
    if (asoj) spec.asoj = parseInt(asoj[1], 10);
    var dows = [
      ["Sun", /sunday|\bsun\b|आइत|aita/],
      ["Mon", /monday|\bmon\b|सोम|sombar/],
      ["Tue", /tuesday|\btue\b|मंगल|mangal/],
      ["Wed", /wednesday|\bwed\b|बुध/],
      ["Thu", /thursday|\bthu\b|बिही|बिहि/],
      ["Fri", /friday|\bfri\b|शुक्र|sukra/],
      ["Sat", /saturday|\bsat\b|शनि|sanibar/]
    ];
    for (var d = 0; d < dows.length; d++) {
      if (dows[d][1].test(q)) spec.dow = dows[d][0];
    }
    if (hit(q, ["tomorrow", "bholi", "भोलि", "भोली"])) spec.dayOffset = 1;
    else if (hit(q, ["yesterday", "hijo", "हिजो"])) spec.dayOffset = -1;
    else if (hit(q, ["today", "todays", "aaja", "aaj", "आज"])) spec.dayOffset = 0;

    var district = findKey(q, DISTRICTS);
    var province = findKey(q, PROVINCES);
    if (district) spec.district = district.id;
    if (province) spec.province = province.id;

    var cause = hit(q, [
      "cause", "caused", "why", "kina", "किन", "kasari aayo", "कसरी आयो", "ke le",
      "avalanche", "himpahiro", "हिमपहिरो", "langtang", "lirung", "लिरुङ", "लाङटाङ",
      "lhende", "लेन्दे", "glof", "हिमताल", "trigger"
    ]);
    var gallery = hit(q, ["gallery", "photo", "photos", "picture", "tasbir", "तस्बिर", "तस्वीर", "फोटो", "gallery"]);
    var weather = hit(q, [
      "weather", "wether", "forecast", "mausam", "mousam", "mosam", "barkha", "barsha", "varsha",
      "monsoon", "rainfall", "rain", "मौसम", "वर्षा", "मनसुन", "चेतावनी", "pani parcha", "पानी पर्छ"
    ]);
    var road = hit(q, [
      "road", "roads", "highway", "sadak", "baato", "bato", "navigate", "सडक", "बाटो", "राजमार्ग",
      "blocked", "closure", "khulyo", "khulyo", "खुल्यो", "खुलेको", "band", "banda", "बन्द"
    ]);
    var map = hit(q, ["map", "naksa", "naxa", "नक्सा"]);
    var miss = hit(q, ["missing", "bepatta", "bepata", "बेपत्ता", "सम्पर्कविहीन", "sampark"]);
    var dead = hit(q, ["dead", "death", "deaths", "mrita", "mrityu", "मृतक", "मृत्यु", "mareko", "मरे"]);
    var rescued = hit(q, ["rescued", "rescue", "uddar", "uddhar", "udhaar", "उद्धार", "bachayo"]);
    var kati = hit(q, ["kati", "कति", "how many", "how much"]);
    var fund = hit(q, [
      "fund", "rahat", "relief", "कोष", "राहत", "paisa", "पैसा", "nchl", "fonepay", "nepalpay", "phonepay",
      "pmdrf", "mof", "अर्थ"
    ]);
    var donate = hit(q, ["donate", "donation", "दान", "kasari dine", "कसरी दान", "kaha pathaune", "कहाँ पठा", "khata", "खाता", "account"]);
    var helpline = hit(q, ["helpline", "help line", "hotline", "हेल्पलाइन", "आपातकाल", "आपत्काल", "emergency"]);
    var lpg = hit(q, ["lpg", "elpiji", "एलपीजी", "ग्यास", "gas", "सिलिन्डर", "cylinder", "आपूर्ति"]);
    var names = hit(q, ["naam khoj", "name search", "search a name", "नाम खोज", "नाम कसरी", "find a name"]);
    var about = hit(q, ["about", "बारेमा", "यो बुलेटिन", "what is this", "हाम्रो बारे", "bulletin", "सोध्नुहोस् कसरी"]);
    var markets = hit(q, ["punji", "capital market", "share market", "nepse", "पूँजी", "पुँजी", "सेयर", "नेप्से"]);
    var nh42 = hit(q, ["nh42", "nh 42", "pasang", "lhamu", "पासाङ", "ल्हामु", "pasang lhamu"]);
    var araniko = hit(q, ["araniko", "arniko", "अरनिको", "kodari", "कोदारी"]);
    var sourceQ = hit(q, ["source", "स्रोत", "कहाँबाट", "कहाबाट", "kaha bata", "kata bata", "where does", "where do"]);
    var place = "";
    var places = [
      ["syaphru", ["syaphru", "syabru", "syafru", "स्याफ्रु"]],
      ["rasuwagadhi", ["rasuwagadhi", "rasuwa gadhi", "रसुवागढी"]],
      ["timure", ["timure", "टिमुरे", "तिमुरे"]],
      ["betrawati", ["betrawati", "betravati", "बेत्रावती"]],
      ["chuchhe", ["chuchhe", "chuche", "चुच्चे", "चुचे"]]
    ];
    for (var p = 0; p < places.length; p++) {
      if (hit(q, places[p][1])) place = places[p][0];
    }
    spec.place = place;
    var nh = compact.match(/nh0*(\d{1,3})/);
    if (nh) spec.roadKind = "NH" + String(parseInt(nh[1], 10));

    var causeStrong = hit(q, ["avalanche", "himpahiro", "हिमपहिरो", "langtang", "lirung", "लिरुङ", "लाङटाङ", "lhende", "लेन्दे", "glof", "हिमताल", "caused", "किन आयो", "kasari aayo", "कसरी आयो"]);
    if ((causeStrong || (cause && !road && !weather && !miss && !dead)) && !fund && !lpg) {
      spec.intent = "cause";
      return finishSpec(spec);
    }
    if ((miss || dead || (rescued && (kati || miss || dead || hit(q, ["number", "संख्या", "sitrep"]))) || (kati && hit(q, ["jana", "जना", "people", "मान्छे"])))) {
      if (dead && !miss) spec.intent = "rescue_dead";
      else if (miss && !dead) spec.intent = "rescue_missing";
      else if (rescued && !miss && !dead) spec.intent = "rescue_rescued";
      else if (kati && !weather && !road && !fund) spec.intent = "rescue_overview";
      else if (miss) spec.intent = "rescue_missing";
      else spec.intent = "rescue_overview";
      if (sourceQ) spec.intent = "rescue_source";
      return finishSpec(spec);
    }
    if (donate && !kati) {
      spec.intent = "donate";
      return finishSpec(spec);
    }
    if (fund || (kati && hit(q, ["paisa", "पैसा", "कोष", "राहत", "fund"]))) {
      spec.intent = sourceQ ? "fund_source" : "fund";
      return finishSpec(spec);
    }
    if (helpline) {
      spec.intent = "helpline";
      return finishSpec(spec);
    }
    if (lpg && !weather) {
      spec.intent = sourceQ ? "lpg_source" : "lpg";
      return finishSpec(spec);
    }
    if (names || /^(naam|name|नाम)\b/.test(q)) {
      spec.intent = "names";
      var rest = original.match(/(?:नाम\s*खोज|naam\s*khoj|name\s*search|search\s+(?:a\s+)?name|नाम|naam|name)\s+(.+)$/i);
      spec.query = rest && rest[1] ? rest[1].trim() : "";
      if (/^(khoj|search|खोज|कसरी|how)$/i.test(spec.query) || /कसरी|खोज|how|search|khoj|garne|गर्ने/.test(norm(spec.query))) spec.query = "";
      return finishSpec(spec);
    }
    if (nh42) {
      spec.intent = "roads_nh42";
      return finishSpec(spec);
    }
    if (araniko) {
      spec.intent = "roads_araniko";
      return finishSpec(spec);
    }
    if (spec.roadKind && spec.roadKind !== "NH42") {
      spec.intent = "roads_code";
      return finishSpec(spec);
    }
    if (map && !weather && !district) {
      spec.intent = "map";
      return finishSpec(spec);
    }
    if ((road || place) && !weather) {
      spec.intent = place ? "roads_place" : "roads";
      if (sourceQ) spec.meta = "source";
      return finishSpec(spec);
    }
    if (weather || district || province || spec.asoj != null || spec.dow || spec.dayOffset != null) {
      if (sourceQ && !district) {
        spec.intent = "weather_source";
        return finishSpec(spec);
      }
      if (district || (province && (weather || district))) spec.intent = "weather_place";
      else if (province && !weather && spec.asoj == null && !spec.dow && spec.dayOffset == null) spec.intent = "weather_place";
      else if (spec.asoj != null || spec.dow || spec.dayOffset === 1 || spec.dayOffset === -1) spec.intent = "weather_day";
      else spec.intent = "weather_today";
      if (district || province) {
        if (spec.intent === "weather_today" && (district || (province && weather))) spec.intent = "weather_place";
        if (spec.intent === "weather_day" && district) spec.intent = "weather_place";
      }
      return finishSpec(spec);
    }
    if (gallery && !about) {
      spec.intent = "gallery";
      return finishSpec(spec);
    }
    if (markets) {
      spec.intent = "markets";
      return finishSpec(spec);
    }
    if (about || hint === "about") {
      spec.intent = "about";
      return finishSpec(spec);
    }
    if (gallery) {
      spec.intent = "gallery";
      return finishSpec(spec);
    }

    var fuzzy = fuzzyIntent(q);
    if (fuzzy) {
      spec.intent = fuzzy;
      return finishSpec(spec);
    }
    if (looksLikeName(q)) {
      spec.intent = "names";
      spec.query = original;
      return finishSpec(spec);
    }
    if (hint && HINT_INTENT[hint]) {
      spec.intent = HINT_INTENT[hint];
      return finishSpec(spec);
    }
    spec.intent = "fallback";
    return finishSpec(spec);
  }

  function finishSpec(spec) {
    var intent = spec.intent;
    var family = "about";
    if (intent.indexOf("weather") === 0) family = "weather";
    else if (intent.indexOf("roads") === 0) family = "roads";
    else if (intent === "map") family = "map";
    else if (intent.indexOf("rescue") === 0) family = "rescue";
    else if (intent === "fund" || intent === "fund_source" || intent === "donate") family = intent === "donate" ? "donate" : "fund";
    else if (intent === "helpline") family = "helpline";
    else if (intent === "names") family = "names";
    else if (intent.indexOf("lpg") === 0) family = "lpg";
    else if (intent === "cause") family = "cause";
    else if (intent === "gallery") family = "gallery";
    else if (intent === "markets") family = "markets";
    else if (intent === "about") family = "about";
    else family = "about";
    spec.family = family;
    spec.topic = family === "donate" ? "fund" : (family === "map" ? "roads" : (family === "cause" || family === "gallery" ? "about" : family));
    if (intent === "fallback") spec.topic = "";
    return spec;
  }

  function fuzzyIntent(q) {
    var bags = [
      ["weather_today", ["weather", "mausam", "mousam", "forecast", "rainfall"]],
      ["roads", ["road", "sadak", "highway", "bato"]],
      ["helpline", ["helpline", "hotline", "emergency"]],
      ["fund", ["rahat", "donate", "fonepay"]],
      ["lpg", ["cylinder", "supply"]],
      ["rescue_missing", ["missing", "bepatta"]],
      ["cause", ["avalanche", "langtang", "lhende"]],
      ["gallery", ["gallery", "photo", "tasbir"]]
    ];
    var tokens = q.split(" ").filter(function (t) { return t.length >= 4; });
    var best = "";
    var bestScore = 0;
    bags.forEach(function (bag) {
      var score = 0;
      tokens.forEach(function (tok) {
        for (var i = 0; i < bag[1].length; i++) {
          if (edit1(tok, bag[1][i]) <= 1) { score += 1; break; }
        }
      });
      if (score > bestScore) { bestScore = score; best = bag[0]; }
    });
    return bestScore >= 1 ? best : "";
  }

  function looksLikeName(q) {
    if (!q || q.length < 2 || q.length > 60) return false;
    if (/what|why|how|when|where|who|hello|hi|ok|okay|thanks|status|update|please|kasto|कस्तो|के हो|के छ|हेलो|नमस्ते/.test(q)) return false;
    var tokens = q.split(" ").filter(Boolean);
    if (!tokens.length || tokens.length > 4) return false;
    if (/[\u0900-\u097f]/.test(q)) return tokens.length <= 4;
    var junk = { asdf: 1, qwerty: 1, pizza: 1, hello: 1, thanks: 1, please: 1, status: 1, update: 1, test: 1, testing: 1, foo: 1, bar: 1, xyz: 1, something: 1, nothing: 1, whatever: 1 };
    if (tokens.length < 2) return false;
    for (var i = 0; i < tokens.length; i++) {
      if (junk[tokens[i]] || !/^[a-z]{2,20}$/.test(tokens[i])) return false;
    }
    return true;
  }

  function dayMeta(wx, iso) {
    var days = (wx && wx.timeline && wx.timeline.days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === iso) return days[i];
    return null;
  }
  function warningDay(wx, iso) {
    var days = (wx && wx.warning_days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === iso) return days[i];
    return null;
  }
  function dayLabel(wx, iso, lang) {
    var meta = dayMeta(wx, iso);
    if (!meta) return "";
    return lang === "en" ? (meta.en || "") : (meta.ne || "");
  }
  function issuedISO(wx) {
    var s = (wx && wx.lead && wx.lead.issued_at) || "";
    var m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    return (wx && wx.lead && wx.lead.window && wx.lead.window.start) || "";
  }
  function provinceById(wx, id) {
    var list = (wx && wx.provinces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function colorWord(wx, level, lang) {
    var row = (wx && wx.warn_levels && wx.warn_levels[level]) || {};
    var text = (lang === "en" ? row.en : row.ne) || "";
    var word = String(text).split("·")[0].trim();
    if (!word) return lang === "en" ? String(level || "") : String(level || "");
    return lang === "en" ? word.toLowerCase() : word;
  }
  function resolveISO(spec, wx, ctx) {
    if (spec.asoj != null && wx) {
      var days = (wx.timeline && wx.timeline.days) || [];
      for (var i = 0; i < days.length; i++) {
        var label = ascii((days[i].ne || "") + " " + (days[i].en || "")).toLowerCase();
        if (new RegExp("(?:asoj|असोज|ashwin|ashoj)\\s*" + spec.asoj + "\\b").test(label)) return days[i].date;
      }
    }
    if (spec.dow && wx) {
      var list = (wx.timeline && wx.timeline.days) || [];
      for (var j = 0; j < list.length; j++) if (list[j].dow_en === spec.dow) return list[j].date;
    }
    var off = spec.dayOffset;
    if (off == null && (spec.intent === "weather_today" || spec.intent === "weather_place" || spec.intent === "weather_source")) off = 0;
    if (off == null) return "";
    return ktmISO(off, ctx && ctx.now);
  }
  function windowPhrase(wx, lang) {
    var days = (wx && wx.timeline && wx.timeline.days) || [];
    if (days.length < 2) return "";
    var a = lang === "en" ? days[0].en : days[0].ne;
    var b = lang === "en" ? days[days.length - 1].en : days[days.length - 1].ne;
    if (!a || !b) return "";
    return lang === "en" ? (a + " to " + b) : (a + " देखि " + b);
  }
  function corridorUntil(wx, lang) {
    var meta = tx(wx && wx.callout && wx.callout.meta, lang);
    if (!meta) return "";
    var m = meta.match(/(?:to|देखि)\s+(.+)$/i);
    var end = m ? m[1].trim() : meta;
    if (lang === "en") return "The Bhotekoshi corridor bulletin runs until " + end + ".";
    return "भोटेकोशी करिडोर बुलेटिन " + end + "सम्म हो।";
  }
  function wantsCorridor(spec) {
    if (spec.district) {
      for (var i = 0; i < DISTRICTS.length; i++) {
        if (DISTRICTS[i].id === spec.district) return !!DISTRICTS[i].corridor || spec.district === "sindhupalchok";
      }
    }
    if (spec.province && spec.province !== "bagmati") return false;
    return true;
  }

  function answerWeather(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var wx = ctx.wx;
    var href = "notices.html#alert";
    if (!wx) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.weather_today });
    var issued = dayLabel(wx, issuedISO(wx), lang);
    var src = sourceLine(lang, "DHM", issued);
    var iso = resolveISO(spec, wx, ctx);
    var when = dayLabel(wx, iso, lang);
    var span = windowPhrase(wx, lang);

    if (spec.intent === "weather_source") {
      var srcText = lang === "en"
        ? "Weather answers are read from the published DHM warning file" + (issued ? ", issued " + issued : "") + "."
        : "मौसमको उत्तर प्रकाशित DHM चेतावनी फाइलबाट पढिन्छ" + (issued ? "। जारी मिति " + issued + " हो।" : "।");
      if (lang === "en" && issued) srcText = "Weather answers are read from the published DHM warning file, issued " + issued + ".";
      return pack(lang, srcText, src, href, { followups: FOLLOW.weather_today });
    }

    var provId = spec.province || (spec.district ? districtProvince(spec.district) : "") || wx.focus_province || "bagmati";
    var card = districtCard(wx, spec.district);
    if (card && spec.intent === "weather_place") {
      var name = tx(card.name, lang);
      var risk = sentenceRisk(tx(card.risk, lang), lang);
      var forecast = firstSentence(tx(card.forecast, lang));
      var bits = [];
      if (lang === "en") {
        bits.push(name + " is under DHM’s impact warning" + (risk ? " (" + risk + ")" : "") + (when ? " for " + when : "") + ".");
        if (forecast) bits.push(forecast.charAt(0).toUpperCase() + forecast.slice(1).replace(/\.$/, "") + ".");
      } else {
        bits.push(name + " मा DHM को प्रभाव चेतावनी छ" + (risk ? " (" + risk + ")" : "") + (when ? ", " + when + " का लागि" : "") + "।");
        if (forecast) bits.push(forecast);
      }
      return pack(lang, bits.slice(0, 2).join(" "), src, href, { followups: FOLLOW.weather_place });
    }

    if (!when && iso) {
      var outside = lang === "en"
        ? "The latest DHM file has no warning for " + iso + (span ? ". It covers " + span + "." : ".")
        : "पछिल्लो DHM फाइलमा " + iso + " को चेतावनी छैन" + (span ? "। अवधि " + span + " हो।" : "।");
      return pack(lang, outside, src, href, { followups: FOLLOW.weather_today });
    }
    if (when && !warningDay(wx, iso)) {
      var noday = lang === "en"
        ? "The latest DHM file has no daily warning for " + when + (span ? ". It covers " + span + "." : ".")
        : "पछिल्लो DHM फाइलमा " + when + " को दैनिक चेतावनी छैन" + (span ? "। अवधि " + span + " हो।" : "।");
      return pack(lang, noday, src, href, { followups: FOLLOW.weather_day });
    }

    var sentence = levelSentence(wx, iso, provId, lang, spec, when);
    if (!sentence) return pack(lang, missingText(lang), src, href, { followups: FOLLOW.weather_today });
    var parts = [sentence];
    if (wantsCorridor(spec)) {
      var corr = corridorUntil(wx, lang);
      if (corr) parts.push(corr);
    }
    var fu = spec.intent === "weather_day" ? FOLLOW.weather_day : (spec.intent === "weather_place" ? FOLLOW.weather_place : FOLLOW.weather_today);
    return pack(lang, parts.join(" "), src, href, { followups: fu });
  }

  function districtProvince(id) {
    for (var i = 0; i < DISTRICTS.length; i++) if (DISTRICTS[i].id === id) return DISTRICTS[i].province;
    return "";
  }
  function districtCard(wx, id) {
    if (!id) return null;
    var list = (wx && wx.district_warnings) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function sentenceRisk(risk, lang) {
    if (!risk) return "";
    return risk.replace(/\s*·\s*/g, lang === "en" ? ", " : ", ");
  }
  function firstSentence(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    var m = s.match(/^.{1,180}?[.।]/);
    return (m ? m[0] : s.slice(0, 180)).trim();
  }
  function levelSentence(wx, iso, provId, lang, spec, when) {
    var wd = warningDay(wx, iso);
    var cell = wd && wd.provinces && wd.provinces[provId];
    var prov = provinceById(wx, provId);
    if (!cell || !prov || !when) return "";
    var color = colorWord(wx, cell.level, lang);
    var rain = (RAIN[cell.level] && RAIN[cell.level][lang]) || "";
    var pname = lang === "en" ? prov.en : prov.ne;
    var around = "";
    if (provId === "bagmati" && !spec.district && rain) {
      around = lang === "en" ? " around Rasuwa" : "";
    }
    var place = spec.district ? districtName(spec.district, lang) : pname;
    var lead = spec.dayOffset === 0 || spec.intent === "weather_today" || (spec.intent === "weather_place" && spec.dayOffset == null && spec.asoj == null && !spec.dow);
    if (spec.district && !districtCard(wx, spec.district)) {
      var whenBitD = lead ? (lang === "en" ? "Today (" + when + ")" : "आज (" + when + ")") : (lang === "en" ? "On " + when : when + " मा");
      if (lang === "en") {
        return place + " is in " + pname + ". " + whenBitD + " DHM's warning there is " + color + (rain ? ", so " + rain : "") + ".";
      }
      return place + " " + pname + "मा पर्छ। " + whenBitD + " त्यहाँ DHM को चेतावनी " + color + " छ" + (rain ? ", त्यसैले " + rain + "।" : "।");
    }
    if (lang === "en") {
      var whenBit = lead ? "Today (" + when + ")" : "On " + when;
      return whenBit + " DHM's warning is " + color + " for " + pname + (rain ? ", so " + rain + around + "." : ".");
    }
    var whenNe = lead ? "आज (" + when + ")" : when + "मा";
    return whenNe + " DHM को चेतावनी " + pname + "मा " + color + " छ" + (rain ? ", त्यसैले " + rain + "।" : "।");
  }
  function districtName(id, lang) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      if (DISTRICTS[i].id === id) {
        var keys = DISTRICTS[i].keys;
        for (var k = 0; k < keys.length; k++) if (/[\u0900-\u097f]/.test(keys[k])) return lang === "en" ? cap(id) : keys[k];
      }
    }
    return cap(id);
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

  function roadHay(road) {
    var bits = [road.ref, road.link];
    ["name", "section", "place", "district", "reason"].forEach(function (k) {
      var o = road[k];
      if (!o) return;
      if (typeof o === "string") bits.push(o);
      else bits.push(o.en, o.ne);
    });
    return norm(bits.join(" "));
  }
  function asOfShort(data, lang) {
    var raw = tx(data && data.as_of, lang) || "";
    if (lang === "en") {
      var m = raw.match(/(\d+\s+[A-Za-z]+)(?:\s+\d{4})?(?:,\s*([0-9:]+))?/);
      if (m) return m[2] ? (m[1].replace("September", "Sep").replace("August", "Aug") + ", " + m[2]) : m[1];
      return raw;
    }
    var n = raw.match(/([०-९0-9]+\s+\S+).*?([०-९0-9]{1,2}[:：][०-९0-9]{2})/);
    if (n) return n[1] + ", " + n[2];
    return raw.split(",")[0];
  }
  function priorityRoad(data) {
    var roads = (data && data.roads) || [];
    for (var i = 0; i < roads.length; i++) {
      if (roads[i].priority || roads[i].id === data.priority_id) return roads[i];
    }
    return null;
  }
  function statusWord(status, lang) {
    if (status === "closed") return lang === "en" ? "closed" : "बन्द";
    if (status === "partial") return lang === "en" ? "partly open" : "आंशिक खुला";
    if (status === "opened") return lang === "en" ? "open" : "खुला";
    return status || "";
  }
  function pickRoads(data, spec) {
    var roads = (data && data.roads) || [];
    if (spec.intent === "roads_nh42") {
      return roads.filter(function (r) { return String(r.ref).toUpperCase() === "NH42" || /pasang|lhamu|पासाङ/.test(roadHay(r)); });
    }
    if (spec.intent === "roads_araniko") {
      return roads.filter(function (r) { return /araniko|arniko|अरनिको|kodari|कोदारी/.test(roadHay(r)); });
    }
    if (spec.intent === "roads_code" && spec.roadKind) {
      return roads.filter(function (r) { return String(r.ref).toUpperCase() === spec.roadKind; });
    }
    if (spec.intent === "roads_place" && spec.place) {
      return roads.filter(function (r) { return roadHay(r).indexOf(norm(spec.place)) >= 0 || roadHay(r).indexOf(spec.place) >= 0; });
    }
    return [];
  }
  function answerRoads(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var data = ctx.roads;
    var href = spec.intent === "map" ? "notices.html#dor-map" : "notices.html#roads";
    var mapLink = spec.intent === "roads" || spec.intent === "roads_nh42"
      ? [{ href: "notices.html#dor-map", label: lang === "en" ? "Road map" : "सडक नक्सा" }]
      : [];
    var fu = FOLLOW[spec.intent] || FOLLOW.roads;
    if (!data) return pack(lang, missingText(lang), "", href, { followups: fu, links: mapLink });
    var when = asOfShort(data, lang);
    var srcWhen = when;
    var src = sourceLine(lang, lang === "en" ? "DoR" : "सडक विभाग", srcWhen);
    if (spec.meta === "source" || spec.intent === "roads" && false) {
      /* source questions use meta */
    }
    if (spec.meta === "source") {
      var srcAns = lang === "en"
        ? "Road status is read from the Department of Roads NAVIGATE list" + (when ? ", as of " + when : "") + "."
        : "सडकको अवस्था सडक विभागको NAVIGATE सूचीबाट पढिन्छ" + (when ? ", " + when + " सम्म।" : "।");
      return pack(lang, srcAns, src, href, { followups: FOLLOW.roads });
    }
    if (spec.intent === "map") {
      var pri = priorityRoad(data);
      var sec = pri ? tx(pri.section, lang) : "";
      var mapText = lang === "en"
        ? "The road map is on the notices page" + (pri ? ". " + (pri.ref || "NH42") + (sec ? " (" + sec + ")" : "") + " is marked " + statusWord(pri.status, lang) : "") + "."
        : "सडक नक्सा सूचना पानामा छ" + (pri ? "। " + (pri.ref || "NH42") + (sec ? " (" + sec + ")" : "") + " " + statusWord(pri.status, lang) + " देखाइएको छ।" : "।");
      return pack(lang, mapText, src, href, { followups: FOLLOW.map });
    }
    var matches = pickRoads(data, spec);
    if (spec.intent === "roads_nh42" || spec.intent === "roads_araniko" || spec.intent === "roads_code" || spec.intent === "roads_place") {
      return pack(lang, roadSpecific(spec, data, matches, lang, when), src, href, { followups: fu, links: spec.intent === "roads_nh42" ? mapLink : [] });
    }
    var counts = data.counts || {};
    var pri2 = priorityRoad(data);
    var closed = counts.closed != null ? digits(counts.closed, lang) : "";
    var opened = counts.opened != null ? digits(counts.opened, lang) : "";
    var text;
    if (lang === "en") {
      text = (when ? "As of " + when + ", " : "") + "the Department of Roads lists " +
        (closed ? closed + " sections closed" : "the latest closures") +
        (opened ? " and " + opened + " recently opened" : "") + ".";
      if (pri2) {
        text += " " + (pri2.ref || "NH42") + " (" + tx(pri2.section, lang) + ") is still " + statusWord(pri2.status, lang) + ".";
      }
    } else {
      text = (when ? when + " सम्म " : "") + "सडक विभागको सूचीमा " +
        (closed ? closed + " खण्ड बन्द" : "बन्द खण्ड") +
        (opened ? " र " + opened + " भर्खर खुलेका" : "") + " छन्।";
      if (pri2) {
        text += " " + (pri2.ref || "NH42") + " (" + tx(pri2.section, lang) + ") अझै " + statusWord(pri2.status, lang) + " छ।";
      }
    }
    if (closed === "" && !pri2) return pack(lang, missingText(lang), src, href, { followups: fu });
    return pack(lang, text, src, href, { followups: FOLLOW.roads, links: mapLink });
  }
  function roadSpecific(spec, data, matches, lang, when) {
    if (!matches.length) {
      return lang === "en"
        ? "The latest DoR list has no separate status for that road" + (when ? ", as of " + when : "") + "."
        : "पछिल्लो सडक विभागको सूचीमा त्यो सडकको छुट्टै अवस्था छैन" + (when ? ", " + when + " सम्म।" : "।");
    }
    var road = matches.slice().sort(function (a, b) {
      var rank = { closed: 0, partial: 1, opened: 2 };
      return (rank[a.status] == null ? 9 : rank[a.status]) - (rank[b.status] == null ? 9 : rank[b.status]);
    })[0];
    var section = tx(road.section, lang);
    var place = tx(road.place, lang);
    var inSection = spec.place && norm(section + " " + place).indexOf(norm(spec.place)) >= 0;
    var closedOnes = matches.filter(function (r) { return r.status === "closed"; });
    if (spec.intent === "roads_code" && matches.length > 1) {
      var names = [];
      closedOnes.slice(0, 2).forEach(function (r) {
        var bit = tx(r.place, lang) || tx(r.section, lang);
        if (bit && names.indexOf(bit) < 0) names.push(bit);
      });
      var n = digits(closedOnes.length || matches.length, lang);
      if (lang === "en") {
        return (road.ref || spec.roadKind) + " has " + n + " closed section" + (closedOnes.length === 1 ? "" : "s") +
          " in the DoR list" + (when ? ", as of " + when : "") +
          (names.length ? ": " + names.join(" and ") : "") + ".";
      }
      return (road.ref || spec.roadKind) + " मा सडक विभागको सूचीअनुसार " + n + " बन्द खण्ड छन्" +
        (when ? ", " + when + " सम्म" : "") +
        (names.length ? ": " + names.join(" र ") : "") + "।";
    }
    if (spec.place && !inSection) {
      var pri = priorityRoad(data);
      var priSec = pri ? tx(pri.section, lang) : section;
      if (lang === "en") {
        return "DoR’s closed " + (pri && pri.ref || road.ref) + " section is " + priSec + (when ? ", as of " + when : "") +
          ". " + cap(spec.place) + " is not named as that closed section.";
      }
      return "सडक विभागले बन्द देखाएको " + (pri && pri.ref || road.ref) + " खण्ड " + priSec + " हो" +
        (when ? ", " + when + " सम्म।" : "।") + " " + cap(spec.place) + " त्यो बन्द खण्डको नाम होइन।";
    }
    var opened = road.opened ? tx(road.opened, lang) : "";
    var alias = spec.intent === "roads_nh42" ? (lang === "en" ? "Pasang Lhamu Highway " : "पासाङ ल्हामु राजमार्ग ") : "";
    var aliasNe = spec.intent === "roads_araniko" ? (lang === "en" ? "Araniko Highway " : "अरनिको राजमार्ग ") : "";
    var label = (alias || aliasNe) + (road.ref || "") + (section ? " (" + section + ")" : "");
    if (lang === "en") {
      var en = label.trim() + " is " + statusWord(road.status, lang) + (when ? ", as of " + when : "") + ".";
      if (opened && road.status === "opened") en += " The record says it opened on " + opened.replace(/,?\s*20\d\d/, "").replace(/\s*NPT/i, "") + ".";
      return en;
    }
    var ne = label.trim() + " " + statusWord(road.status, lang) + " छ" + (when ? ", " + when + " सम्म।" : "।");
    if (opened && road.status === "opened") ne += " अभिलेखमा " + opened.split(",")[0] + " मा खुलेको छ।";
    return ne;
  }

  function cardById(dash, id) {
    var cards = (dash && dash.cards) || [];
    for (var i = 0; i < cards.length; i++) if (cards[i].id === id) return cards[i];
    return null;
  }
  function showVal(card, lang) {
    if (!card) return "";
    var vd = card.value_display || {};
    if (vd[lang]) return vd[lang];
    if (lang === "en" && vd.en) return vd.en;
    if (vd.ne) return lang === "en" ? digits(ascii(vd.ne), "en") : vd.ne;
    if (card.value == null || card.value === "") return "";
    return digits(card.value, lang);
  }
  function rescueWhen(dash, lang) {
    var ne = (dash && dash.as_of && dash.as_of.ne) || "";
    var en = (dash && dash.as_of && dash.as_of.en) || "";
    var m = ascii(ne).match(/(\d+)\s*असोज/);
    var asoj = m ? m[1] : "";
    var clock = (en.match(/(\d{1,2}:\d{2})/) || [])[1] || "";
    if (lang === "ne") {
      var bit = asoj ? ("असोज " + digits(asoj, "ne")) : "";
      return bit || ne.split("·")[0].trim();
    }
    var day = en.match(/(\d+)\s+([A-Za-z]+)/);
    var short = day ? (day[1] + " " + day[2].slice(0, 3)) : "";
    if (asoj && short) return "Asoj " + asoj + " (" + short + (clock ? ", " + clock : "") + ")";
    return short || en;
  }
  function rescueSourceWhen(dash, lang) {
    var full = rescueWhen(dash, lang);
    if (lang === "ne") return full.split("(")[0].trim();
    var m = full.match(/Asoj\s+\d+/);
    return m ? m[0] : full;
  }
  function districtItems(card, district) {
    if (!card || !district) return [];
    var prefixes = {
      rasuwa: ["rasuwa", "ras_"],
      nuwakot: ["nuwakot", "nuw_"],
      dhading: ["dhading", "dha_"],
      sindhupalchok: ["sindhu"],
      gorkha: ["gorkha"],
      chitwan: ["chitwan"],
      baglung: ["baglung"],
      myagdi: ["myagdi"]
    };
    var keys = prefixes[district] || [district];
    return (card.items || []).filter(function (item) {
      var id = String(item.id || "");
      if (id.indexOf("hold") === 0 || id.indexOf("handover") === 0) return false;
      for (var i = 0; i < keys.length; i++) if (id.indexOf(keys[i]) >= 0) return true;
      return false;
    });
  }
  function answerRescue(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "index.html#overview";
    var fu = FOLLOW[spec.intent] || FOLLOW.rescue_overview;
    var nameLink = spec.intent === "rescue_missing" || spec.intent === "rescue_dead"
      ? [{ href: "names.html", label: lang === "en" ? "Search a name" : "नाम खोज" }]
      : [];
    var dash = ctx.dash;
    if (!dash) return pack(lang, missingText(lang), "", href, { followups: fu, links: nameLink });
    var when = rescueWhen(dash, lang);
    var src = sourceLine(lang, "NDRRMA", rescueSourceWhen(dash, lang));
    if (spec.intent === "rescue_source") {
      var s = lang === "en"
        ? "Rescue, death, and missing figures are read from the published NDRRMA board" + (when ? ", as of " + when : "") + "."
        : "उद्धार, मृतक र सम्पर्कविहीनका अंक प्रकाशित NDRRMA बोर्डबाट पढिन्छन्" + (when ? ", " + when + " सम्म।" : "।");
      return pack(lang, s, src, href, { followups: FOLLOW.rescue_overview });
    }
    var focus = spec.intent === "rescue_dead" ? "dead" : (spec.intent === "rescue_missing" ? "miss" : (spec.intent === "rescue_rescued" ? "rescued" : ""));
    if (!focus) {
      var miss = showVal(cardById(dash, "miss"), lang);
      var dead = showVal(cardById(dash, "dead"), lang);
      var rescued = showVal(cardById(dash, "rescued"), lang);
      if (!miss && !dead && !rescued) return pack(lang, missingText(lang), src, href, { followups: fu });
      var all = lang === "en"
        ? "As of " + when + ", NDRRMA lists about " + miss + " missing, " + dead + " dead, and " + rescued + " rescued."
        : when + " सम्म NDRRMA का अनुसार सम्पर्कविहीन करिब " + miss + ", मृतक " + dead + " र उद्धार " + rescued + " छ।";
      return pack(lang, all, src, href, { followups: FOLLOW.rescue_overview });
    }
    var card = cardById(dash, focus);
    var val = showVal(card, lang);
    if (!val) return pack(lang, missingText(lang), src, href, { followups: fu, links: nameLink });
    var local = districtItems(card, spec.district);
    var text;
    if (local.length) {
      var bits = local.slice(0, 2).map(function (item) {
        return tx(item.label, lang) + " " + showVal(item, lang);
      });
      if (lang === "en") {
        text = "In the NDRRMA split, " + bits.join(" and ") + ", as of " + when + ". The full figure is " + val + ".";
      } else {
        text = "NDRRMA को खण्डमा " + bits.join(" र ") + " छ, " + when + " सम्म। जम्मा अंक " + val + " हो।";
      }
    } else if (focus === "miss") {
      text = lang === "en"
        ? "NDRRMA lists about " + val + " people missing, as of " + when + "."
        : "NDRRMA का अनुसार सम्पर्कविहीन करिब " + val + " जना छन्, " + when + " सम्म।";
    } else if (focus === "dead") {
      text = lang === "en"
        ? "NDRRMA lists " + val + " deaths, as of " + when + "."
        : "NDRRMA का अनुसार मृतक " + val + " छन्, " + when + " सम्म।";
    } else {
      text = lang === "en"
        ? "NDRRMA lists " + val + " people rescued so far, as of " + when + "."
        : "NDRRMA का अनुसार हालसम्म " + val + " जनाको उद्धार भएको छ, " + when + " सम्म।";
    }
    return pack(lang, text, src, href, { followups: fu, links: nameLink });
  }

  function tget(ctx, key) {
    if (!ctx.t) return "";
    var v = ctx.t(key);
    if (!v || v === key) return "";
    return String(v);
  }
  function fundDate(src, lang) {
    if (!src) return "";
    if (lang === "en") {
      var m = src.match(/(\d+\s+Bhadra[^·|]*)/i);
      return m ? m[1].trim() : "";
    }
    var n = src.match(/([०-९0-9]+\s*भदौ[^·|]*)/);
    return n ? n[1].trim() : "";
  }
  function answerFund(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "donate.html";
    var mof = tget(ctx, "hero_cash_num");
    var nchl = tget(ctx, "hero_nchl_num");
    var fp = tget(ctx, "hero_fonepay_num");
    var when = fundDate(tget(ctx, "hero_mof_stock_src"), lang);
    var srcWhen = when || (lang === "en" ? "" : "");
    var src = sourceLine(lang, lang === "en" ? "MoF · NCHL · Fonepay" : "अर्थ · NCHL · फोनपे", srcWhen);
    if (!mof && !nchl && !fp) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.fund });
    if (spec.intent === "fund_source") {
      var s = lang === "en"
        ? "Relief totals are read from the published MoF, NCHL, and Fonepay figures" + (when ? ", MoF stock as of " + when : "") + "."
        : "राहत रकम प्रकाशित अर्थ मन्त्रालय, NCHL र फोनपेका अंकबाट पढिन्छ" + (when ? "। मौज्दात " + when + " को हो।" : "।");
      return pack(lang, s, src, href, { followups: FOLLOW.fund });
    }
    var how = spec.intent === "donate";
    var text;
    if (lang === "en") {
      text = how
        ? "You can give through the PMDRF accounts, NCHL, or Fonepay/NepalPay on the donate page."
        : "The relief page lists separate totals, not one combined sum.";
      if (mof) text += " MoF’s published stock is " + mof + (when ? " as of " + when : "") + ".";
      if (nchl || fp) text += " NCHL is " + (nchl || "unavailable") + " and Fonepay is " + (fp || "unavailable") + ".";
    } else {
      text = how
        ? "दान प्रधानमन्त्री राहत कोष, NCHL वा फोनपे/नेपालपेबाट दान पानामा जान्छ।"
        : "राहत पानामा रकम छुट्टाछुट्टै छन्, एउटै जोड होइन।";
      if (mof) text += " अर्थ मन्त्रालयको मौज्दात " + mof + (when ? " (" + when + ")" : "") + " हो।";
      if (nchl || fp) text += " NCHL " + (nchl || "उपलब्ध छैन") + " र फोनपे " + (fp || "उपलब्ध छैन") + " छन्।";
    }
    return pack(lang, text, src, href, { followups: how ? FOLLOW.donate : FOLLOW.fund });
  }

  function answerHelpline(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "contact.html#helpline";
    var rows = (ctx.hl && ctx.hl.length) ? ctx.hl : HELPLINES;
    function rowFor(tel) {
      for (var i = 0; i < rows.length; i++) if (String(rows[i].tel) === tel) return rows[i];
      for (var j = 0; j < HELPLINES.length; j++) if (HELPLINES[j].tel === tel) return HELPLINES[j];
      return null;
    }
    var src = sourceLine(lang, lang === "en" ? "Helplines" : "हेल्पलाइन", "");
    if (spec.tel) {
      var one = rowFor(spec.tel);
      if (!one) return pack(lang, missingText(lang), src, href, { followups: FOLLOW.helpline });
      var nm = one.name || one[lang] || one.en;
      var line = lang === "en"
        ? nm + " is " + spec.tel + "."
        : nm + " को नम्बर " + digits(spec.tel, "ne") + " हो।";
      return pack(lang, line, src, href, { followups: FOLLOW.helpline });
    }
    var a = rowFor("1234");
    var b = rowFor("100");
    var c = rowFor("1111");
    var d = rowFor("1155");
    if (!a) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.helpline });
    var text = lang === "en"
      ? "For rescue, call " + (a.name || a.en) + " at " + a.tel + ". Police is " + (b ? b.tel : "100") + ", the army " + (c ? c.tel : "1111") + ", and the flood line " + (d ? d.tel : "1155") + "."
      : "उद्धारका लागि " + (a.name || a.ne) + " " + digits(a.tel, "ne") + " मा फोन गर्नुहोस्। प्रहरी " + digits(b ? b.tel : "100", "ne") + ", सेना " + digits(c ? c.tel : "1111", "ne") + " र बाढी लाइन " + digits(d ? d.tel : "1155", "ne") + " हो।";
    return pack(lang, text, src, href, { followups: FOLLOW.helpline });
  }

  function answerNames(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var q = spec.query || "";
    var text = q
      ? (lang === "en"
        ? "I can open the published name search for “" + q.replace(/[<>]/g, "") + "”. Matches stay on the names page, not in this chat."
        : "“" + q.replace(/[<>]/g, "") + "” प्रकाशित नाम सूचीमा खोज्न सकिन्छ। मिल्दो नाम यो च्याटमा लेखिँदैन।")
      : (lang === "en"
        ? "Search a name on the published list. Matches open on the names page, not in this chat."
        : "नाम प्रकाशित सूचीमा खोजिन्छ। मिल्दो नाम नाम पानामा खुल्छ, यो च्याटमा होइन।");
    return pack(lang, text, sourceLine(lang, lang === "en" ? "Name list" : "नाम सूची", ""), "names.html", {
      followups: FOLLOW.names,
      openNames: q
    });
  }

  function answerLpg(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "supply.html#lpg";
    var lpg = ctx.lpg;
    var latest = lpg && lpg.d26 && lpg.d26.mt ? lpg.d26 : (lpg && lpg.d25 && lpg.d25.mt ? lpg.d25 : null);
    var src = sourceLine(lang, lang === "en" ? "Customs" : "भन्सार", latest && latest.label ? latest.label : "");
    if (spec.intent === "lpg_source") {
      var s = lang === "en"
        ? "LPG answers use the customs import table on the supply page" + (latest && latest.label ? " (" + latest.label + ")." : ".")
        : "एलपीजीको उत्तर आपूर्ति पानाको भन्सार आयात तालिकाबाट आउँछ" + (latest && latest.label ? " (" + latest.label + ")।" : "।");
      return pack(lang, s, src, href, { followups: FOLLOW.lpg });
    }
    if (!latest) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.lpg });
    var mt = digits(latest.mt, lang);
    var cyl = latest.cyl ? digits(latest.cyl, lang) : "";
    var day = latest.label || "";
    var prev = lpg && lpg.d25 && latest !== lpg.d25 && lpg.d25.mt ? digits(lpg.d25.mt, lang) : "";
    var text = lang === "en"
      ? "Customs recorded " + mt + " MT of LPG imports" + (day ? " on " + digits(day, "en") : "") + (cyl ? " (about " + cyl + " cylinders)" : "") + "." + (prev ? " The earlier published day was " + prev + " MT." : "")
      : "भन्सारका अनुसार" + (day ? " " + day + " मा" : "") + " एलपीजी आयात " + mt + " मे.टन थियो" + (cyl ? " (अनुमानित " + cyl + " सिलिन्डर)" : "") + "।" + (prev ? " अघिल्लो प्रकाशित दिन " + prev + " मे.टन थियो।" : "");
    return pack(lang, text, src, href, { followups: FOLLOW.lpg });
  }

  function originText(g, lang) {
    var bag = (g && g.meta) || {};
    if (lang === "en") return bag.origin_summary_en || (g && g.origin_summary_en) || "";
    return bag.origin_summary_ne || (g && g.origin_summary_ne) || "";
  }
  function answerCause(ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var summary = originText(ctx.gallery, lang);
    var href = "photos.html#gallery-path";
    var ok = summary && /Langtang Lirung|लाङटाङ लिरुङ/.test(summary) && /Lhende|लेन्दे/.test(summary) && /26 Aug 2026|२६ अगस्ट २०२६/.test(summary);
    if (!ok) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.cause });
    var text = lang === "en"
      ? "USGS, ICIMOD and ESA report an ice–rock avalanche off Langtang Lirung into the Lhende Khola on 26 Aug 2026. The flood then ran down the Bhotekoshi–Trishuli. It was not a glacial-lake outburst."
      : "USGS, ICIMOD र ESA का अनुसार २६ अगस्ट २०२६ मा लाङटाङ लिरुङबाट हिमनदी र चट्टान खसेर लेन्दे खोलामा पस्यो। त्यसपछिको बाढी भोटेकोशी–त्रिशूली हुँदै तल झरेको हो। यो हिमताल विस्फोट होइन।";
    return pack(lang, text, sourceLine(lang, "USGS · ICIMOD · ESA", lang === "en" ? "26 Aug 2026" : "२६ अगस्ट २०२६"), href, { followups: FOLLOW.cause });
  }

  function answerGallery(ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "photos.html#gallery-path";
    var summary = originText(ctx.gallery, lang);
    if (!summary || !/Langtang Lirung|लाङटाङ लिरुङ/.test(summary) || !/Lhende|लेन्दे/.test(summary)) return pack(lang, missingText(lang), "", href, { followups: FOLLOW.gallery });
    var text = lang === "en"
      ? "The gallery follows the flood from Langtang Lirung and the Lhende Khola down through Rasuwagadhi and the Trishuli, with before-and-after pictures."
      : "ग्यालरीमा लाङटाङ लिरुङ र लेन्दे खोलादेखि रसुवागढी हुँदै त्रिशूलीसम्मको बाढी मार्ग छ, पहिले र पछिका तस्बिरसहित।";
    return pack(lang, text, sourceLine(lang, "USGS · ICIMOD · ESA", ""), href, { followups: FOLLOW.gallery });
  }

  function answerAbout(ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var text = lang === "en"
      ? "This bulletin publishes weather, road, rescue, and relief figures for the Rasuwa–Bhotekoshi flood. Ask reads those files and answers in a short sentence."
      : "यो बुलेटिनले रसुवा–भोटेकोशी बाढीको मौसम, सडक, उद्धार र राहतका अंक राख्छ। सोध्नुहोस्ले ती फाइल पढेर छोटो वाक्यमा जवाफ दिन्छ।";
    return pack(lang, text, sourceLine(lang, lang === "en" ? "Bulletin" : "बुलेटिन", ""), "about.html", { followups: FOLLOW.about });
  }

  function answerMarkets(ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var lead = ascii(tget(ctx, "home_markets_lead"));
    var srcRaw = tget(ctx, "home_markets_src");
    var dated = (srcRaw.match(/20\d\d[-./]\d{2}[-./]\d{2}/) || srcRaw.match(/२०८३[।.०0-9]+/) || [])[0] || "";
    var href = "gov.html#gov-markets";
    var m = lead.match(/(\d+)\s*points.*?(\d+)\s*themes.*?(\d+(?:\.\d+)?)%\s*\/\s*(\d+(?:\.\d+)?)%.*?(\d+)\s*days/i);
    var text;
    if (m && lang === "en") {
      text = "The capital-markets plan lists " + m[1] + " points across " + m[2] + " themes. Published CGT rates are " + m[3] + "% and " + m[4] + "%, with a " + m[5] + "-day window.";
    } else if (lang === "ne" && /बुँदा/.test(tget(ctx, "home_markets_lead"))) {
      text = "पुँजी बजार योजनामा " + digits("21", "ne") + " बुँदा र " + digits("9", "ne") + " विषय छन्। प्रकाशित CGT दर " + digits("3.75", "ne") + "% र " + digits("5", "ne") + "% हो, " + digits("45", "ne") + " दिनको अवधि सहित।";
      if (!/21|२१/.test(ascii(tget(ctx, "home_markets_lead")))) text = "पुँजी बजारको कार्ययोजना सरकार पृष्ठमा छ।";
    } else {
      text = lang === "en"
        ? "The capital-markets action plan is on the government page."
        : "पुँजी बजारको कार्ययोजना सरकार पृष्ठमा छ।";
    }
    return pack(lang, text, sourceLine(lang, "MoF", dated ? digits(dated, lang) : ""), href, { followups: FOLLOW.markets });
  }

  function answerFallback(lang) {
    var text = lang === "en" ? "I don't have that yet." : "यसबारे अहिले जानकारी छैन।";
    return pack(lang, text, "", "", { suggest: true, chips: SUGGEST, followups: [] });
  }

  function compose(spec, ctx) {
    ctx = ctx || {};
    var lang = ctx.lang === "en" ? "en" : "ne";
    if (!spec || spec.intent === "empty") return answerFallback(lang);
    var intent = spec.intent;
    var ans;
    if (intent.indexOf("weather") === 0) ans = answerWeather(spec, ctx);
    else if (intent.indexOf("roads") === 0 || intent === "map") ans = answerRoads(spec, ctx);
    else if (intent.indexOf("rescue") === 0) ans = answerRescue(spec, ctx);
    else if (intent === "fund" || intent === "donate" || intent === "fund_source") ans = answerFund(spec, ctx);
    else if (intent === "helpline") ans = answerHelpline(spec, ctx);
    else if (intent === "names") ans = answerNames(spec, ctx);
    else if (intent.indexOf("lpg") === 0) ans = answerLpg(spec, ctx);
    else if (intent === "cause") ans = answerCause(ctx);
    else if (intent === "gallery") ans = answerGallery(ctx);
    else if (intent === "about") ans = answerAbout(ctx);
    else if (intent === "markets") ans = answerMarkets(ctx);
    else ans = answerFallback(lang);
    ans.intent = intent;
    ans.family = spec.family || "";
    ans.topic = spec.topic || "";
    if (/<[a-z!/]/i.test(ans.text)) ans.text = ans.text.replace(/<[^>]*>/g, "").trim();
    return ans;
  }

  function answer(question, ctx) {
    var spec = classify(question, { hint: ctx && ctx.hint, now: ctx && ctx.now });
    return compose(spec, ctx || {});
  }

  return {
    INTENTS: INTENTS,
    classify: classify,
    compose: compose,
    answer: answer
  };
});
