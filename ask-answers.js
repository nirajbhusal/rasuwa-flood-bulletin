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
    "weather_today", "weather_day", "weather_place", "weather_city", "weather_river", "weather_source", "weather_top_rain",
    "roads", "roads_nh42", "roads_araniko", "roads_code", "roads_place",
    "map",
    "rescue_missing", "rescue_dead", "rescue_rescued", "rescue_overview", "rescue_source",
    "fund", "donate", "fund_source",
    "helpline", "names", "lpg", "lpg_source",
    "electricity_schedule", "electricity_nolight", "electricity_plants", "electricity_load",
    "cause", "gallery", "about", "markets",
    "flood_rivers", "flood_flash", "flood_place", "flood_trishuli",
    "fallback"
  ];

  var DIG = "०१२३४५६७८९";
  var RAIN = {
    red: { en: "heavy to very heavy rain is possible", ne: "भारीदेखि धेरै भारी वर्षा हुन सक्छ" },
    orange: { en: "heavy rain is possible", ne: "भारी वर्षा हुन सक्छ" },
    yellow: { en: "heavy rain is possible in some places", ne: "केही स्थानमा भारी वर्षा हुन सक्छ" },
    green: { en: "there is no warning", ne: "चेतावनी छैन" }
  };
  var CITIES = [
    { id: "kathmandu", keys: ["kathmandu", "काठमाडौ", "काठमान्डौ"] },
    { id: "pokhara", keys: ["pokhara", "पोखरा"] },
    { id: "biratnagar", keys: ["biratnagar", "विराटनगर"] },
    { id: "nepalgunj", keys: ["nepalgunj", "nepalganj", "नेपालगञ्ज", "नेपालगंज"] },
    { id: "dhangadhi", keys: ["dhangadhi", "धनगढी"] },
    { id: "janakpur", keys: ["janakpur", "जनकपुर"] }
  ];
  var RIVERS = [
    { id: 4657, keys: ["dhunche", "धुन्चे", "धुनचे"] },
    { id: 52, keys: ["betrawati", "betravati", "बेत्रावती"] },
    { id: 4913, keys: ["rasuwagadhi", "रसुवागढी"] },
    { id: 191, keys: ["syaphrubesi", "स्याफ्रुबेसी"] },
    { id: 66, keys: ["belkot", "बेलकोट"] },
    { id: 265, keys: ["devghat", "देवघाट"] },
    { id: 113, keys: ["bahrabise", "barhabise", "बाह्रबिसे"] },
    { id: 243, keys: ["khurkot", "खुर्कोट"] }
  ];
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
    { id: "rasuwa", province: "bagmati", corridor: true, en: "Rasuwa", ne: "रसुवा", keys: ["rasuwa", "रसुवा"] },
    { id: "sindhupalchok", province: "bagmati", en: "Sindhupalchok", ne: "सिन्धुपाल्चोक", keys: ["sindhupalchok", "sindhupalchowk", "sindupalchok", "सिन्धुपाल्चोक", "सिंधुपाल्चोक"] },
    { id: "nuwakot", province: "bagmati", corridor: true, en: "Nuwakot", ne: "नुवाकोट", keys: ["nuwakot", "नुवाकोट"] },
    { id: "dhading", province: "bagmati", corridor: true, en: "Dhading", ne: "धादिङ", keys: ["dhading", "धादिङ", "धादिंग"] },
    { id: "gorkha", province: "gandaki", corridor: true, en: "Gorkha", ne: "गोरखा", keys: ["gorkha", "गोरखा"] },
    { id: "chitwan", province: "bagmati", corridor: true, en: "Chitwan", ne: "चितवन", keys: ["chitwan", "चितवन"] },
    { id: "baglung", province: "gandaki", en: "Baglung", ne: "बागलुङ", keys: ["baglung", "बागलुङ", "बागलुंग"] },
    { id: "myagdi", province: "gandaki", en: "Myagdi", ne: "म्याग्दी", keys: ["myagdi", "म्याग्दी", "म्यागदी"] },
    { id: "taplejung", province: "koshi", en: "Taplejung", ne: "ताप्लेजुङ", keys: ["taplejung", "ताप्लेजुङ"] },
    { id: "sankhuwasabha", province: "koshi", en: "Sankhuwasabha", ne: "संखुवासभा", keys: ["sankhuwasabha", "sankhuwasabha", "संखुवासभा", "सङ्खुवासभा"] },
    { id: "khotang", province: "koshi", en: "Khotang", ne: "खोटाङ", keys: ["khotang", "खोटाङ"] },
    { id: "bhojpur", province: "koshi", en: "Bhojpur", ne: "भोजपुर", keys: ["bhojpur", "भोजपुर"] },
    { id: "dhankuta", province: "koshi", en: "Dhankuta", ne: "धनकुटा", keys: ["dhankuta", "धनकुटा"] },
    { id: "terhathum", province: "koshi", en: "Terhathum", ne: "तेह्रथुम", keys: ["terhathum", "tehrathum", "terathum", "तेह्रथुम"] },
    { id: "panchthar", province: "koshi", en: "Panchthar", ne: "पाँचथर", keys: ["panchthar", "panchther", "पाँचथर", "पांचथर"] },
    { id: "ilam", province: "koshi", en: "Ilam", ne: "इलाम", keys: ["ilam", "इलाम"] },
    { id: "sunsari", province: "koshi", en: "Sunsari", ne: "सुनसरी", keys: ["sunsari", "सुनसरी"] },
    { id: "udayapur", province: "koshi", en: "Udayapur", ne: "उदयपुर", keys: ["udayapur", "उदयपुर"] },
    { id: "dolakha", province: "bagmati", en: "Dolakha", ne: "दोलखा", keys: ["dolakha", "दोलखा"] },
    { id: "kavrepalanchok", province: "bagmati", en: "Kavrepalanchok", ne: "काभ्रेपलाञ्चोक", keys: ["kavrepalanchok", "kavre", "काभ्रेपलाञ्चोक", "काभ्रे"] },
    { id: "lalitpur", province: "bagmati", en: "Lalitpur", ne: "ललितपुर", keys: ["lalitpur", "ललितपुर"] },
    { id: "lamjung", province: "gandaki", en: "Lamjung", ne: "लमजुङ", keys: ["lamjung", "लमजुङ"] },
    { id: "rolpa", province: "lumbini", en: "Rolpa", ne: "रोल्पा", keys: ["rolpa", "रोल्पा"] },
    { id: "dang", province: "lumbini", en: "Dang", ne: "दाङ", keys: ["dang", "दाङ"] },
    { id: "rukum-east", province: "lumbini", en: "Rukum East", ne: "रुकुम पूर्व", keys: ["rukum east", "rukum purba", "पूर्वी रुकुम", "रुकुम पूर्व"] },
    { id: "rukum-west", province: "karnali", en: "Rukum West", ne: "रुकुम पश्चिम", keys: ["rukum west", "rukum paschim", "पश्चिम रुकुम", "रुकुम पश्चिम"] },
    { id: "bajhang", province: "sudurpaschim", en: "Bajhang", ne: "बझाङ", keys: ["bajhang", "बझाङ"] },
    { id: "baitadi", province: "sudurpaschim", en: "Baitadi", ne: "बैतडी", keys: ["baitadi", "बैतडी"] }
  ];
  var FLOOD_EXTRA = [
    { id: "kaski", keys: ["kaski", "कास्की"] },
    { id: "manang", keys: ["manang", "मनाङ"] },
    { id: "mustang", keys: ["mustang", "मुस्ताङ"] },
    { id: "banke", keys: ["banke", "बाँके", "बांके"] },
    { id: "bardiya", keys: ["bardiya", "bardya", "बर्दिया"] },
    { id: "surkhet", keys: ["surkhet", "सुर्खेत"] },
    { id: "dailekh", keys: ["dailekh", "दैलेख"] },
    { id: "kailali", keys: ["kailali", "कैलाली"] },
    { id: "kanchanpur", keys: ["kanchanpur", "कन्चनपुर", "कञ्चनपुर"] },
    { id: "kathmandu", keys: ["kathmandu", "काठमाडौं", "काठमाण्डौं", "काठमाडौँ"] },
    { id: "bhaktapur", keys: ["bhaktapur", "भक्तपुर"] },
    { id: "makwanpur", keys: ["makwanpur", "मकवानपुर"] },
    { id: "nawalparasi-east", keys: ["nawalparasi east", "nawalpur", "नवलपरासी पूर्व"] },
    { id: "nawalparasi-west", keys: ["nawalparasi west", "parasi", "नवलपरासी पश्चिम"] },
    { id: "rupandehi", keys: ["rupandehi", "रुपन्देही"] },
    { id: "kapilbastu", keys: ["kapilvastu", "kapilbastu", "कपिलवस्तु"] },
    { id: "palpa", keys: ["palpa", "पाल्पा"] },
    { id: "gulmi", keys: ["gulmi", "गुल्मी"] },
    { id: "arghakhanchi", keys: ["arghakhanchi", "अर्घाखाँची", "अर्घाखांची"] },
    { id: "syangja", keys: ["syangja", "स्याङ्जा"] },
    { id: "tanahu", keys: ["tanahu", "tanahun", "तनहुँ"] },
    { id: "parbat", keys: ["parbat", "पर्वत"] },
    { id: "pyuthan", keys: ["pyuthan", "प्युठान"] },
    { id: "salyan", keys: ["salyan", "सल्यान"] },
    { id: "doti", keys: ["doti", "डोटी"] },
    { id: "dadeldhura", keys: ["dadeldhura", "डडेल्धुरा", "डडेलधुरा"] },
    { id: "jhapa", keys: ["jhapa", "झापा"] },
    { id: "sindhuli", keys: ["sindhuli", "सिन्धुली"] }
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
    electricity: "electricity_schedule",
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
    weather_city: follow([
      { ne: "त्रिशूली धुन्चेमा कति छ?", en: "What is the Trishuli level at Dhunche?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "पोखराको तापक्रम?", en: "Pokhara temperature?" }
    ]),
    weather_river: follow([
      { ne: "काठमाडौँको अधिकतम कति?", en: "What is Kathmandu’s maximum?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" },
      { ne: "बेत्रावतीको नदी तह?", en: "River level at Betrawati?" }
    ]),
    roads: follow([
      { ne: "पासाङ ल्हामु राजमार्ग खुल्यो?", en: "Is the Pasang Lhamu highway open?" },
      { ne: "राति कुन सडक बन्द छ?", en: "Which roads are closed at night?" },
      { ne: "आजको मौसम के छ?", en: "What is today’s weather?" }
    ]),
    flood_rivers: follow([
      { ne: "रसुवामा आकस्मिक बाढी?", en: "Flash-flood risk in Rasuwa?" },
      { ne: "त्रिशुली बेत्रावतीको पूर्वानुमान?", en: "Trishuli at Betrawati outlook?" },
      { ne: "आज उच्च बाढी जोखिम कहाँ छ?", en: "Where is high flood risk today?" }
    ]),
    flood_flash: follow([
      { ne: "कुन नदी सतर्कता नजिक छ?", en: "Which rivers are near warning?" },
      { ne: "त्रिशुली बेत्रावतीको पूर्वानुमान?", en: "Trishuli at Betrawati outlook?" },
      { ne: "रसुवामा आकस्मिक बाढी?", en: "Flash-flood risk in Rasuwa?" }
    ]),
    flood_place: follow([
      { ne: "आज उच्च बाढी जोखिम कहाँ छ?", en: "Where is high flood risk today?" },
      { ne: "त्रिशुली बेत्रावतीको पूर्वानुमान?", en: "Trishuli at Betrawati outlook?" },
      { ne: "कुन नदी सतर्कता नजिक छ?", en: "Which rivers are near warning?" }
    ]),
    flood_trishuli: follow([
      { ne: "रसुवामा आकस्मिक बाढी?", en: "Flash-flood risk in Rasuwa?" },
      { ne: "कुन नदी सतर्कता नजिक छ?", en: "Which rivers are near warning?" },
      { ne: "आज उच्च बाढी जोखिम कहाँ छ?", en: "Where is high flood risk today?" }
    ]),
    roads_travel: follow([
      { ne: "रसुवा जान मिल्छ?", en: "Can I travel in Rasuwa?" },
      { ne: "राति कुन सडक बन्द छ?", en: "Which roads are closed at night?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" }
    ]),
    roads_night: follow([
      { ne: "रसुवाको बाटो खुल्यो?", en: "Is the Rasuwa road open?" },
      { ne: "पृथ्वी राजमार्ग खुला छ?", en: "Is the Prithvi highway open?" },
      { ne: "सडक अहिले कस्तो छ?", en: "What is the road status?" }
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
    electricity: follow([
      { ne: "बिजुली कहिले जान्छ?", en: "When is the power cut?" },
      { ne: "बत्ती छैन?", en: "No light number?" },
      { ne: "क्षतिग्रस्त जलविद्युत?", en: "Damaged hydropower?" }
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

    var elec = hit(q, [
      "bijuli", "bijulee", "electricity", "power cut", "powercut", "load shedding", "loadshedding",
      "hydropower", "hydro power", "hydroelectric", "no light", "nolight", "1150",
      "बिजुली", "विद्युत", "विद्युत्", "लोडसेडिङ", "लोडसेडिंग", "जलविद्युत", "जलविद्युत्",
      "बत्ती छैन", "बत्ति छैन", "कटौती"
    ]);
    if (elec) {
      if (hit(q, ["load shedding", "loadshedding", "लोडसेडिङ", "लोडसेडिंग", "लोड शेडिङ"])) spec.intent = "electricity_load";
      else if (hit(q, ["hydropower", "hydro power", "hydroelectric", "जलविद्युत", "जलविद्युत्", "power plant", "क्षतिग्रस्त"])) spec.intent = "electricity_plants";
      else if (hit(q, ["no light", "nolight", "बत्ती छैन", "बत्ति छैन", "बिजुली छैन", "फोन", "phone", "1150", "hotline", "नम्बर", "नंबर"])) spec.intent = "electricity_nolight";
      else spec.intent = "electricity_schedule";
      return finishSpec(spec);
    }
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
    if (classifyFlood(q, spec)) return finishSpec(spec);
    var cityRow = findKey(q, CITIES);
    var riverRow = findKey(q, RIVERS);
    var levelWord = hit(q, ["level", "tah", "तह", "river", "khola", "nadi", "खोला", "नदी", "water level", "gauge", "danger level", "warning level"]);
    var tempWord = hit(q, ["temp", "temperature", "maximum", "minimum", "अधिकतम", "न्यूनतम", "ताप"]);
    var trishuli = hit(q, ["trishuli", "त्रिशूली"]);
    if ((riverRow && (levelWord || trishuli || weather)) || (trishuli && (levelWord || weather || riverRow))) {
      spec.river = riverRow ? riverRow.id : 4657;
      spec.intent = "weather_river";
      return finishSpec(spec);
    }
    if (cityRow && (weather || tempWord)) {
      spec.city = cityRow.id;
      spec.intent = "weather_city";
      return finishSpec(spec);
    }
    var nightQ = hit(q, ["at night", "overnight", "night ban", "night", "raati", "ratima", "राति", "रातमा", "रातिको", "रातको समय"]);
    if ((road || spec.district) && nightQ && !weather) {
      spec.intent = "roads_night";
      return finishSpec(spec);
    }
    var travelQ = hit(q, [
      "can i travel", "can i go", "travel to", "travel in", "travelling", "traveling",
      "jaana", "jana milcha", "jana sakinchha", "gaan sakinchha",
      "जान मिल्छ", "जान सकिन्छ", "सवारी आवागमन", "सवारी साधन",
      "vehicle movement", "drive to"
    ]);
    if (travelQ && !weather && !fund && !lpg) {
      spec.intent = "roads_travel";
      return finishSpec(spec);
    }
    var roadish = road || place || (spec.district && hit(q, ["open", "khula", "khulla", "खुला", "blocked", "closure"]));
    if (roadish && !weather) {
      spec.intent = place ? "roads_place" : "roads";
      if (sourceQ) spec.meta = "source";
      return finishSpec(spec);
    }
    var heaviest = hit(q, [
      "where did it rain the most", "where it rained the most", "rained the most", "rain the most",
      "heaviest rain", "heaviest 24", "most rain", "highest rainfall", "highest rain", "most rainfall",
      "sabai bhanda dherai pani", "sabai bhanda badi", "dherai pani paryo",
      "कहाँ सबैभन्दा धेरै पानी", "सबैभन्दा धेरै पानी", "सबैभन्दा बढी वर्षा", "धेरै पानी पर"
    ]);
    if (heaviest) {
      spec.intent = "weather_top_rain";
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

  function classifyFlood(q, spec) {
    var flash = hit(q, ["flash flood", "flashflood", "आकस्मिक", "akasmik"]);
    var bulletin = hit(q, [
      "flood forecast", "flood outlook", "flood bulletin", "special flood",
      "बाढी पूर्वानुमान", "नदी र बाढी", "river outlook", "river status",
      "सतर्कता तह", "सतर्कता नजिक", "near warning", "near the warning"
    ]);
    var forecastWord = hit(q, [
      "forecast", "outlook", "पूर्वानुमान", "बढ्ने", "5-day", "5 day", "five-day", "five day",
      "पाँच दिन", "५ दिन"
    ]);
    var tri = hit(q, ["trishuli", "त्रिशूली", "त्रिशुली", "betrawati", "betravati", "बेत्रावती"]);
    var gauge = hit(q, ["level", "tah", "तह", "gauge", "water level", "danger level", "warning level"]);
    if (tri && forecastWord && !(gauge && !hit(q, ["पूर्वानुमान", "forecast", "outlook", "बढ्ने"]))) {
      spec.intent = "flood_trishuli";
      return true;
    }
    if (!flash && !bulletin) return false;
    if (!spec.district) {
      var extra = findKey(q, FLOOD_EXTRA);
      if (extra) spec.district = extra.id;
    }
    if (spec.district) spec.intent = "flood_place";
    else if (tri) spec.intent = "flood_trishuli";
    else if (hit(q, ["नदी", "river", "basin", "सतर्कता", "कोशी", "नारायणी", "कन्काई", "कमला", "बागमती"])) spec.intent = "flood_rivers";
    else spec.intent = "flood_flash";
    return true;
  }

  function finishSpec(spec) {
    var intent = spec.intent;
    var family = "about";
    if (intent.indexOf("flood") === 0) family = "flood";
    else if (intent.indexOf("weather") === 0) family = "weather";
    else if (intent.indexOf("roads") === 0) family = "roads";
    else if (intent === "map") family = "map";
    else if (intent.indexOf("rescue") === 0) family = "rescue";
    else if (intent === "fund" || intent === "fund_source" || intent === "donate") family = intent === "donate" ? "donate" : "fund";
    else if (intent === "helpline") family = "helpline";
    else if (intent.indexOf("electricity") === 0) family = "electricity";
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

  function cityList(now) {
    var block = now && now.nepal_now;
    if (!block) return [];
    if (Array.isArray(block)) return block;
    return block.cities || [];
  }
  function cityRow(now, id) {
    var list = cityList(now);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function weatherNowApi() {
    var scope = typeof globalThis !== "undefined" ? globalThis : null;
    if (scope && scope.WeatherNow) return scope.WeatherNow;
    if (typeof require === "function") {
      try { return require("./weather-now.js"); } catch (err) { return null; }
    }
    return null;
  }
  function alertPlaceRows(now, wx, date, nowIso) {
    var block = now && now.nepal_now;
    if (!block || Array.isArray(block)) return [];
    var api = weatherNowApi();
    if (api && wx && (block.catalog || []).length && date) {
      return api.selectAlertPlaces(wx, block.catalog, date, nowIso) || [];
    }
    return block.alert_places || [];
  }
  function alertPlaceSentence(row, wx, lang, when) {
    var place = lang === "en" ? ((row.place && row.place.en) || row.en) : ((row.place && row.place.ne) || row.ne);
    var dist = lang === "en" ? row.en : row.ne;
    var color = colorWord(wx, row.level, lang);
    var obs = row.obs || {};
    var where = place && dist && place !== dist ? (lang === "en" ? place + " in " + dist : dist + "को " + place) : (dist || place);
    var head = lang === "en"
      ? where + " is on the high-alert list. DHM's warning is " + color + (when ? " for " + when : "") + "."
      : where + " उच्च सतर्कताको सूचीमा छ। DHM को चेतावनी " + color + " छ" + (when ? " (" + when + ")" : "") + "।";
    var extra = "";
    if (row.source === "dhm" && (obs.rain24 != null || obs.max != null)) {
      extra = lang === "en" ? " DHM observation" : " DHM अवलोकन";
      if (obs.rain24 != null) extra += lang === "en" ? ": " + obs.rain24 + " mm in 24 hours" : ": २४ घण्टामा " + obs.rain24 + " मि.मि.";
      if (obs.max != null) extra += (obs.rain24 != null ? (lang === "en" ? ", maximum " : ", अधिकतम ") : (lang === "en" ? ": maximum " : ": अधिकतम ")) + obs.max + " °C";
      extra += lang === "en" ? "." : "।";
    } else if (row.source === "hydrology" && obs.rain24 != null) {
      var station = (obs.station && (lang === "en" ? obs.station.en : (obs.station.ne || obs.station.en))) || "";
      extra = lang === "en"
        ? " Gauge " + station + " recorded " + obs.rain24 + " mm in 24 hours."
        : " स्टेशन " + station + " मा २४ घण्टाको वर्षा " + obs.rain24 + " मि.मि. छ।";
    } else if (row.source === "model" && (obs.rain24 != null || obs.t != null)) {
      extra = lang === "en" ? " Open-Meteo ECMWF IFS model" : " Open-Meteo ECMWF IFS मोडेल";
      if (obs.rain24 != null) extra += (lang === "en" ? " 24-hour rain " : " २४ घण्टा वर्षा ") + obs.rain24 + (lang === "en" ? " mm" : " मि.मि.");
      if (obs.t != null) extra += (lang === "en" ? ", temperature " : ", तापक्रम ") + obs.t + " °C";
      extra += lang === "en" ? "." : "।";
    } else if (!row.source) {
      extra = lang === "en" ? " No recent reading." : " भर्खरको रिडिङ छैन।";
    }
    return (head + extra).replace(/\s+/g, " ").trim();
  }
  function cityObsSentence(now, id, lang) {
    var row = cityRow(now, id);
    if (!row || !row.obs || (row.obs.max == null && row.obs.min == null)) return "";
    var name = lang === "en" ? row.en : row.ne;
    var max = row.obs.max;
    var min = row.obs.min;
    if (lang === "en") return name + " DHM observation: maximum " + max + " °C, minimum " + min + " °C.";
    return name + "को DHM अवलोकन: अधिकतम " + max + " °C, न्यूनतम " + min + " °C।";
  }
  function riverRow(now, id) {
    var list = (now && now.corridor && now.corridor.rivers) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function riverSentence(now, id, lang) {
    var row = riverRow(now, id);
    if (!row) return "";
    var name = lang === "en" ? row.en : row.ne;
    if (!row.fresh || row.level_m == null) {
      return lang === "en" ? name + " has no fresh reading." : name + "को ताजा रिडिङ छैन।";
    }
    var lead = lang === "en"
      ? name + " is " + row.level_m + " m."
      : name + " " + row.level_m + " मिटर छ।";
    if (row.warning_m != null && row.below_warning_m != null && row.level !== "red" && row.level !== "orange") {
      return lead + (lang === "en"
        ? " That is " + row.below_warning_m + " m below the warning level of " + row.warning_m + " m."
        : " चेतावनी तह " + row.warning_m + " मिटरभन्दा " + row.below_warning_m + " मिटर तल छ।");
    }
    if (row.level === "red") return lead + (lang === "en" ? " That is danger level." : " यो खतरा तहमा छ।");
    if (row.level === "orange") return lead + (lang === "en" ? " That is warning level." : " यो चेतावनी तहमा छ।");
    return lead;
  }

  function rainNum(n) {
    var x = Number(n);
    if (!isFinite(x)) return "";
    if (Math.abs(x - Math.round(x)) < 0.05) return String(Math.round(x));
    return x.toFixed(1);
  }
  function nptClock(iso, lang) {
    var date = new Date(iso);
    if (!isFinite(date.getTime())) return "";
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    var map = {};
    fmt.formatToParts(date).forEach(function (part) { map[part.type] = part.value; });
    var hh = Number(map.hour);
    var mm = Number(map.minute);
    var h12 = hh % 12;
    if (h12 === 0) h12 = 12;
    var hm = h12 + ":" + (mm < 10 ? "0" : "") + mm;
    if (lang === "en") return hm + (hh >= 12 ? " PM" : " AM");
    var part = hh < 12 ? "बिहान" : hh < 17 ? "दिउँसो" : hh < 20 ? "साँझ" : "राति";
    return part + " " + digits(hm, "ne");
  }
  function topRainSentence(row, lang) {
    var station = lang === "en"
      ? ((row.station && row.station.en) || "")
      : ((row.station && (row.station.ne || row.station.en)) || "");
    var dist = lang === "en"
      ? ((row.district && row.district.en) || "")
      : ((row.district && (row.district.ne || row.district.en)) || "");
    var amount = digits(rainNum(row.rain24), lang);
    var when = nptClock(row.obs_at, lang);
    var tail = when ? " (" + when + ")" : "";
    if (lang === "en") {
      var where = station + (dist ? ", " + dist : "");
      return "The heaviest 24-hour rain is " + amount + " mm at " + where + tail + ".";
    }
    var whereNe = station + (dist ? ", " + dist : "");
    return "पछिल्लो २४ घण्टामा सबैभन्दा बढी वर्षा " + whereNe + "मा " + amount + " मि.मि. छ" + tail + "।";
  }
  function answerTopRain(ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var href = "weather.html";
    var rows = (((ctx.wxnow || {}).nepal_now || {}).top_rain) || [];
    var row = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].source !== "model" && rows[i].rain24 != null) { row = rows[i]; break; }
    }
    var src = sourceLine(lang, "DHM / hydrology.gov.np gauges", "");
    if (!row) {
      var missing = lang === "en"
        ? "A fresh 24-hour rainfall reading isn't available."
        : "ताजा २४ घण्टे वर्षाको रिडिङ अहिले उपलब्ध छैन।";
      return pack(lang, missing, src, href, { followups: FOLLOW.weather_today });
    }
    return pack(lang, topRainSentence(row, lang), src, href, { followups: FOLLOW.weather_today });
  }

  function answerWeather(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var wx = ctx.wx;
    var href = "weather.html";
    if (spec.intent === "weather_top_rain") return answerTopRain(ctx);
    if (spec.intent === "weather_city") {
      var cityText = cityObsSentence(ctx.wxnow, spec.city || "kathmandu", lang);
      if (!cityText) {
        cityText = lang === "en"
          ? "That city's DHM observation isn't available."
          : "त्यो सहरको DHM अवलोकन अहिले उपलब्ध छैन।";
      }
      return pack(lang, cityText, sourceLine(lang, "DHM", ""), href, { followups: FOLLOW.weather_city });
    }
    if (spec.intent === "weather_river") {
      var riverText = riverSentence(ctx.wxnow, spec.river || 4657, lang);
      if (!riverText) {
        riverText = lang === "en"
          ? "That river reading isn't available."
          : "त्यो नदीको रिडिङ अहिले उपलब्ध छैन।";
      }
      return pack(lang, riverText, sourceLine(lang, "DHM hydrology", ""), href, { followups: FOLLOW.weather_river });
    }
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
    if (spec.intent === "weather_place" && spec.district) {
      var placeRows = alertPlaceRows(ctx.wxnow, wx, iso || issuedISO(wx), (ctx.wxnow && ctx.wxnow.generated_at) || "");
      var placeRow = null;
      for (var pi = 0; pi < placeRows.length; pi++) if (placeRows[pi].district === spec.district) placeRow = placeRows[pi];
      if (placeRow) {
        var placeText = alertPlaceSentence(placeRow, wx, lang, when);
        return pack(lang, placeText, src, href, { followups: FOLLOW.weather_place });
      }
    }
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
    if (spec.intent === "weather_today") {
      var leadCity = cityObsSentence(ctx.wxnow, "kathmandu", lang);
      if (leadCity) parts.unshift(leadCity);
    }
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
        if (DISTRICTS[i][lang]) return DISTRICTS[i][lang];
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
  function daoNotice(data) {
    return data && data.dao_notice;
  }
  function daoWhen(notice, lang) {
    var w = (notice && (notice.when || notice.published)) || {};
    return w[lang] || w.ne || w.en || "";
  }
  function daoRows(notice, provinceId) {
    var rows = [];
    ((notice && notice.provinces) || []).forEach(function (p) {
      if (provinceId && p.id !== provinceId) return;
      (p.districts || []).forEach(function (d) { rows.push({ province: p, district: d }); });
    });
    return rows;
  }
  function daoFind(notice, districtId) {
    var rows = daoRows(notice);
    for (var i = 0; i < rows.length; i++) if (rows[i].district.id === districtId) return rows[i];
    return null;
  }
  function nameOf(obj, lang) {
    if (!obj) return "";
    return obj[lang] || obj.ne || obj.en || "";
  }
  function joinNames(list, lang) {
    if (!list.length) return "";
    if (list.length === 1) return list[0];
    var last = lang === "en" ? " and " : " र ";
    return list.slice(0, -1).join(", ") + last + list[list.length - 1];
  }
  function dorInDistrict(data, districtId) {
    var row = null;
    for (var i = 0; i < DISTRICTS.length; i++) if (DISTRICTS[i].id === districtId) row = DISTRICTS[i];
    if (!row) return [];
    var keys = row.keys.map(norm).filter(Boolean);
    return ((data && data.roads) || []).filter(function (r) {
      var hay = roadHay(r);
      for (var k = 0; k < keys.length; k++) if (hay.indexOf(keys[k]) >= 0) return true;
      return false;
    });
  }
  function daoListText(notice, lang, provinceId) {
    var rows = daoRows(notice, provinceId);
    var names = rows.map(function (r) { return nameOf(r.district, lang); });
    var when = daoWhen(notice, lang);
    var n = digits(rows.length, lang);
    var listed = joinNames(names, lang);
    if (provinceId && rows.length) {
      var pname = nameOf(rows[0].province, lang);
      if (lang === "en") {
        return "On the NDRRMA notice of " + when + ", main roads are closed in " + n + " " + pname + " district" + (rows.length === 1 ? "" : "s") + ": " + listed + ". The notice does not name a road section.";
      }
      return when + " को NDRRMA सूचनाअनुसार " + pname + "का " + n + " जिल्लामा मुख्य सडक बन्द छ: " + listed + "। सूचनाले सडक खण्ड तोकेको छैन।";
    }
    var districts = digits((notice.counts && notice.counts.districts) || rows.length, lang);
    var provinces = digits((notice.counts && notice.counts.provinces) || 0, lang);
    if (lang === "en") {
      return "On the NDRRMA notice of " + when + ", main roads are closed in " + districts + " districts across " + provinces + " provinces: " + listed + ".";
    }
    return when + " को NDRRMA सूचनाअनुसार " + provinces + " प्रदेशका " + districts + " जिल्लामा मुख्य सडक बन्द छ: " + listed + "।";
  }
  function daoDistrictText(notice, spec, data, lang) {
    var hit = daoFind(notice, spec.district);
    var place = districtName(spec.district, lang);
    var when = daoWhen(notice, lang);
    if (hit) {
      var pname = nameOf(hit.province, lang);
      if (lang === "en") {
        return place + " in " + pname + " is on the NDRRMA notice of " + when + ": main roads in that district are closed. The notice does not name a road section.";
      }
      return place + " " + pname + "मा पर्छ। " + when + " को NDRRMA सूचनाअनुसार त्यहाँ मुख्य सडक बन्द छ। सूचनाले सडक खण्ड तोकेको छैन।";
    }
    var lead = lang === "en"
      ? place + " is not listed on the NDRRMA notice of " + when + ", which names " + digits(notice.counts.districts, lang) + " districts where main roads are closed."
      : place + " " + when + " को NDRRMA सूचनामा छैन। त्यो सूचनाले मुख्य सडक बन्द भएका " + digits(notice.counts.districts, lang) + " जिल्लाको नाम दिन्छ।";
    var matches = dorInDistrict(data, spec.district).filter(function (r) { return r.status === "closed" || r.status === "partial"; });
    if (!matches.length) return lead;
    var road = matches[0];
    var section = tx(road.section, lang);
    var dorWhen = asOfShort(data, lang);
    if (lang === "en") {
      return lead + " Department of Roads NAVIGATE lists " + (road.ref || "") + (section ? " (" + section + ")" : "") + " as " + statusWord(road.status, lang) + (dorWhen ? ", as of " + dorWhen : "") + ".";
    }
    return lead + " सडक विभागको NAVIGATE मा " + (road.ref || "") + (section ? " (" + section + ")" : "") + " " + statusWord(road.status, lang) + " छ" + (dorWhen ? ", " + dorWhen + " सम्म।" : "।");
  }
  function policeDoc(ctx) {
    return ctx && ctx.police && ctx.police.rows && ctx.police.rows.length ? ctx.police : null;
  }
  function policeWhen(doc, lang) {
    var as = doc.as_of || {};
    return lang === "en" ? (as.en || "") : (as.ne || as.en || "");
  }
  function policeHay(row) {
    var bits = [row.highway_en, row.highway_ne, row.location_en, row.location_ne];
    if (row.district) bits.push(row.district.en, row.district.ne, row.district.id);
    if (row.aliases) bits = bits.concat(row.aliases);
    return norm(bits.join(" "));
  }
  function policeMatch(spec, doc) {
    var rows = doc.rows || [];
    var q = norm(spec.raw || "");
    var hits = [];
    function add(r) { if (r && hits.indexOf(r) < 0) hits.push(r); }
    if (spec.intent === "roads_nh42" || /pasang|lhamu|पासाङ|ल्हामु/.test(q)) {
      rows.forEach(function (r) { if (r.id === "nuwakot-simtar") add(r); });
    }
    rows.forEach(function (r) {
      var aliases = r.aliases || [];
      for (var i = 0; i < aliases.length; i++) {
        var a = norm(aliases[i]);
        if (a && a.length > 2 && q.indexOf(a) >= 0) add(r);
      }
    });
    if (!hits.length && spec.district) {
      rows.forEach(function (r) { if (r.district && r.district.id === spec.district) add(r); });
    }
    if (!hits.length && spec.province) {
      rows.forEach(function (r) {
        if ((r.province && r.province.id === spec.province) || r.group === spec.province) add(r);
      });
    }
    return hits;
  }
  function policeSpan(untilEn, untilNe, lang) {
    var u = lang === "en" ? (untilEn || "") : (untilNe || "");
    if (!u || /^until further/i.test(u)) {
      return lang === "en" ? "until further notice" : "अर्को सूचना नभएसम्म";
    }
    return u;
  }
  function policeNightName(r, lang) {
    if (lang !== "en") return r.district.ne;
    if (r.district.en === "Kavrepalanchok") return "Kavre";
    if (r.district.en === "Nawalparasi East") return "Nawalparasi E";
    return r.district.en;
  }
  function policeDetail(rows, lang, doc) {
    var when = policeWhen(doc, lang);
    var bits = rows.slice(0, 3).map(function (r) {
      var dist = lang === "en" ? r.district.en : r.district.ne;
      var hwy = (lang === "en" ? r.highway_en : r.highway_ne) || (lang === "en" ? r.location_en : r.location_ne) || "";
      if (r.prominent) {
        return lang === "en"
          ? "Rasuwa's main highways have been fully blocked since 2083/05/10 10:30, until further notice"
          : "रसुवाका मुख्य राजमार्ग २०८३/०५/१० १०:३० देखि अर्को सूचना नभएसम्म पूर्ण रूपमा अवरोध छन्";
      }
      if (r.status_type === "night_ban") {
        var win = digits((r.night_start || "") + "–" + (r.night_end || ""), lang);
        var until = policeSpan(r.valid_until_en, r.valid_until_ne, lang);
        return lang === "en"
          ? (dist + " · " + hwy + " is barred at night " + win + " (" + until + ")")
          : (dist + " · " + hwy + " राति " + win + " बन्द (" + until + ")");
      }
      if (r.status_type === "one_way") {
        return lang === "en" ? (dist + " · " + hwy + " is open one way") : (dist + " · " + hwy + " एकतर्फी सुचारु छ");
      }
      if (r.status_type === "restricted") {
        return lang === "en"
          ? (dist + " · " + hwy + ": small vehicles and motorbikes pass, large vehicles do not")
          : (dist + " · " + hwy + ": साना सवारी र मोटरसाइकल पास, ठूला सवारी होइन");
      }
      var untilF = policeSpan(r.valid_until_en, r.valid_until_ne, lang);
      return lang === "en"
        ? (dist + " · " + hwy + " is fully blocked (" + untilF + ")")
        : (dist + " · " + hwy + " पूर्ण अवरोध (" + untilF + ")");
    });
    var lead = lang === "en" ? ("Nepal Police, " + when + ": ") : ("नेपाल प्रहरी, " + when + ": ");
    var text = lead + bits.join(lang === "en" ? ". " : "। ");
    if (lang === "en" && !/\.$/.test(text)) text += ".";
    if (lang === "ne" && !/।$/.test(text)) text += "।";
    if (rows.length > 3) {
      text += lang === "en"
        ? (" " + (rows.length - 3) + " more are on the road board.")
        : (" थप " + digits(rows.length - 3, "ne") + " सडक बोर्डमा।");
    }
    return text;
  }
  function policeNight(doc, spec, lang) {
    var rows = (doc.rows || []).filter(function (r) { return r.status_type === "night_ban"; });
    if (spec.district) rows = rows.filter(function (r) { return r.district && r.district.id === spec.district; });
    var when = policeWhen(doc, lang);
    if (!rows.length) {
      return lang === "en"
        ? ("Nepal Police at " + when + " does not list a night ban there.")
        : ("नेपाल प्रहरीको " + when + " सूचनामा त्यहाँ रात्रिकालीन रोक छैन।");
    }
    var groups = [];
    rows.forEach(function (r) {
      var key = (r.night_start || "") + "-" + (r.night_end || "") + "|" + (r.valid_until_en || "further");
      var g = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].key === key) g = groups[i];
      if (!g) {
        g = { key: key, start: r.night_start, end: r.night_end, until_en: r.valid_until_en, until_ne: r.valid_until_ne, en: [], ne: [] };
        groups.push(g);
      }
      var en = policeNightName(r, "en");
      if (g.en.indexOf(en) < 0) g.en.push(en);
      if (g.ne.indexOf(r.district.ne) < 0) g.ne.push(r.district.ne);
    });
    function hour(hhmm) {
      var s = String(hhmm || "");
      var m = s.match(/^(\d+):00$/);
      if (!m) return s;
      return m[1].length < 2 ? ("0" + m[1]) : m[1];
    }
    function tag(g) {
      var span = policeSpan(g.until_en, g.until_ne, lang);
      if (lang === "en") return /^until further/i.test(span) ? "ongoing" : span;
      return span === "अर्को सूचना नभएसम्म" ? "थप सूचना" : span;
    }
    var parts = groups.map(function (g) {
      var win = digits(hour(g.start) + "–" + hour(g.end), lang);
      var names = lang === "en" ? g.en.join(", ") : g.ne.join(", ");
      return win + " " + tag(g) + ": " + names;
    });
    var n = rows.length;
    if (lang === "en") {
      return "Nepal Police, " + when + ": " + n + " night " + (n === 1 ? "ban" : "bans") + " — " + parts.join("; ") + ".";
    }
    return "नेपाल प्रहरी, " + when + ": रात रोक " + digits(n, "ne") + "—" + parts.join("; ") + "।";
  }
  function policeOverview(doc, lang) {
    var c = doc.counts || {};
    var when = policeWhen(doc, lang);
    if (lang === "en") {
      return "Nepal Police at " + when + ": " + c.total + " obstructions, " + c.full_block + " fully blocked, " +
        c.night_ban + " night bans, " + c.one_way + " one-way and " + c.restricted + " restricted, in " +
        c.districts + " districts. Rasuwa's main highways are fully blocked until further notice. The earlier NDRRMA notice still lists main roads closed in 25 districts.";
    }
    return "नेपाल प्रहरी, " + when + ": " + digits(c.total, "ne") + " अवरोध, " + digits(c.full_block, "ne") +
      " पूर्ण अवरोध, " + digits(c.night_ban, "ne") + " रात्रिकालीन रोक, " + digits(c.one_way, "ne") +
      " एकतर्फी र " + digits(c.restricted, "ne") + " सीमित, " + digits(c.districts, "ne") +
      " जिल्लामा। रसुवाका मुख्य राजमार्ग अर्को सूचना नभएसम्म पूर्ण अवरोध छन्। यसअघिको NDRRMA सूचनामा २५ जिल्ला छन्।";
  }
  function vehicleDoc(ctx) {
    return ctx && ctx.vehicle && ctx.vehicle.districts && ctx.vehicle.districts.length ? ctx.vehicle : null;
  }
  function vehicleMatch(doc, spec) {
    var rows = doc.districts || [];
    if (spec.district) {
      var exact = rows.filter(function (d) { return d.id === spec.district; });
      if (exact.length) return exact;
    }
    var q = norm(spec.raw || "");
    var hits = [];
    rows.forEach(function (d) {
      var names = [d.en, d.ne, String(d.id || "").replace(/-/g, " ")].concat(d.keys || []);
      for (var i = 0; i < names.length; i++) {
        var n = norm(names[i]);
        if (n.length > 3 && q.indexOf(n) >= 0) { hits.push(d); return; }
      }
    });
    return hits;
  }
  function vehiclePoliceBit(row, ctx, lang) {
    var pol = policeDoc(ctx);
    if (!pol || !row) return "";
    var hits = (pol.rows || []).filter(function (r) { return r.district && r.district.id === row.id; });
    if (!hits.length) return "";
    if (row.id === "rasuwa") {
      return lang === "en"
        ? " Nepal Police: main highways fully blocked until further notice."
        : " नेपाल प्रहरी: मुख्य राजमार्ग अर्को सूचना नभएसम्म पूर्ण अवरोध।";
    }
    var worst = hits[0];
    hits.forEach(function (r) { if (r.status_type === "full_block") worst = r; });
    if (worst.status_type === "full_block") {
      return lang === "en"
        ? " Nepal Police also lists a full highway block there."
        : " नेपाल प्रहरीको सूचनामा त्यहाँ राजमार्ग पूर्ण अवरोध पनि छ।";
    }
    if (worst.status_type === "night_ban") {
      var win = digits((worst.night_start || "") + "–" + (worst.night_end || ""), lang);
      return lang === "en"
        ? " Nepal Police also bars vehicles " + win + "."
        : " नेपाल प्रहरीले पनि " + win + " मा रोक लगाएको छ।";
    }
    return "";
  }
  function vehicleText(doc, spec, lang, ctx) {
    var when = tx(doc.valid, lang);
    var hits = vehicleMatch(doc, spec);
    if (!hits.length && spec.province) {
      hits = (doc.districts || []).filter(function (d) { return d.province === spec.province; });
    }
    if (!hits.length) {
      var c = doc.counts || {};
      return lang === "en"
        ? "NDRRMA, " + when + ": vehicle movement is fully closed in " + c.red + " districts, closed at night in " + c.orange + ", and on alert in " + c.yellow + "."
        : "NDRRMA, " + when + ": " + digits(c.red, "ne") + " जिल्लामा सवारी पूर्ण बन्द, " + digits(c.orange, "ne") + " मा राति बन्द, " + digits(c.yellow, "ne") + " मा सतर्क।";
    }
    if (hits.length > 4) {
      var parts = ["red", "orange", "yellow"].map(function (level) {
        var names = hits.filter(function (d) { return d.level === level; }).map(function (d) { return lang === "en" ? d.en : d.ne; });
        if (!names.length) return "";
        var label = lang === "en"
          ? (level === "red" ? "Fully closed" : level === "orange" ? "Night closure" : "Alert")
          : (level === "red" ? "पूर्ण बन्द" : level === "orange" ? "राति बन्द" : "सतर्क");
        return label + ": " + names.join(", ");
      }).filter(Boolean);
      var prov = "";
      (doc.provinces || []).forEach(function (p) { if (p.id === spec.province) prov = lang === "en" ? p.en : p.ne; });
      return "NDRRMA, " + when + (prov ? ", " + prov : "") + ": " + parts.join(". ") + ".";
    }
    var bits = hits.slice(0, 3).map(function (d) {
      var name = lang === "en" ? d.en : d.ne;
      var mean = tx(doc.levels[d.level], lang);
      return name + " — " + mean + "." + vehiclePoliceBit(d, ctx, lang);
    });
    var more = hits.length > 3 ? (lang === "en" ? " " + (hits.length - 3) + " more are on the road board." : " थप " + digits(hits.length - 3, "ne") + " सडक बोर्डमा।") : "";
    return "NDRRMA, " + when + ": " + bits.join(" ") + more;
  }
  function answerRoads(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var data = ctx.roads;
    var href = spec.intent === "map" ? "notices.html#dor-map" : "notices.html#roads";
    var mapLink = spec.intent === "roads" || spec.intent === "roads_nh42"
      ? [{ href: "notices.html#dor-map", label: lang === "en" ? "Road map" : "सडक नक्सा" }]
      : [];
    var fu = FOLLOW[spec.intent] || FOLLOW.roads;
    if (!data && !policeDoc(ctx) && !vehicleDoc(ctx)) return pack(lang, missingText(lang), "", href, { followups: fu, links: mapLink });
    var veh = vehicleDoc(ctx);
    if (veh && spec.intent === "roads_travel") {
      var srcVeh = sourceLine(lang, "NDRRMA", tx(veh.as_of, lang));
      return pack(lang, vehicleText(veh, spec, lang, ctx), srcVeh, href, { followups: FOLLOW.roads_travel, links: mapLink });
    }
    var pol = policeDoc(ctx);
    if (pol && spec.intent === "roads_night") {
      var srcNight = sourceLine(lang, lang === "en" ? "Nepal Police" : "नेपाल प्रहरी", policeWhen(pol, lang));
      return pack(lang, policeNight(pol, spec, lang), srcNight, href, { followups: FOLLOW.roads_night || FOLLOW.roads, links: mapLink });
    }
    if (pol) {
      var hits = policeMatch(spec, pol);
      var specific = hits.length && (spec.district || spec.province || spec.intent === "roads_nh42" || spec.intent === "roads_place" || spec.intent === "roads_code" || /pasang|lhamu|prithvi|highway|राजमार्ग|राजमार्ग|सडक|बाटो|पृथ्वी|कान्ति|मेची|तमोर|महेन्द्र|कालीगण्डकी|राप्ती|तोखा|मुग्लिन/.test(norm(spec.raw || "")));
      if (specific && spec.intent !== "map" && spec.meta !== "source") {
        var srcHit = sourceLine(lang, lang === "en" ? "Nepal Police" : "नेपाल प्रहरी", policeWhen(pol, lang));
        return pack(lang, policeDetail(hits, lang, pol), srcHit, href, { followups: fu, links: mapLink });
      }
    }
    if (!data) return pack(lang, missingText(lang), "", href, { followups: fu, links: mapLink });
    var notice = daoNotice(data);
    var when = asOfShort(data, lang);
    var srcWhen = notice && (spec.intent === "roads" || spec.intent === "map" || spec.meta === "source") ? daoWhen(notice, lang) : when;
    var srcName = notice && (spec.intent === "roads" || spec.intent === "map" || spec.meta === "source") ? "NDRRMA" : (lang === "en" ? "DoR" : "सडक विभाग");
    var src = sourceLine(lang, srcName, srcWhen);
    if (spec.meta === "source") {
      var srcAns;
      if (pol) {
        srcAns = lang === "en"
          ? "The latest road update is the Nepal Police highway notice of " + policeWhen(pol, "en") + "."
          : "पछिल्लो सडक अपडेट नेपाल प्रहरीको " + policeWhen(pol, "ne") + " राजमार्ग सूचना हो।";
      } else if (notice) {
        srcAns = lang === "en"
          ? "The latest road notice is the NDRRMA post of " + daoWhen(notice, "en") + ", drawn from District Administration Office notices."
          : "पछिल्लो सडक सूचना " + daoWhen(notice, "ne") + " को NDRRMA पोस्ट हो, जिल्ला प्रशासन कार्यालयका सूचनाबाट।";
      } else {
        srcAns = lang === "en"
          ? "Road status is read from the Department of Roads NAVIGATE list" + (when ? ", as of " + when : "") + "."
          : "सडकको अवस्था सडक विभागको NAVIGATE सूचीबाट पढिन्छ" + (when ? ", " + when + " सम्म।" : "।");
      }
      return pack(lang, srcAns, src, href, { followups: FOLLOW.roads });
    }
    if (spec.intent === "map") {
      var pri = priorityRoad(data);
      var sec = pri ? tx(pri.section, lang) : "";
      var mapText;
      if (notice) {
        var shaded = digits(notice.counts.districts, lang);
        mapText = lang === "en"
          ? "The road map shades " + shaded + " districts where main roads are closed on the NDRRMA notice of " + daoWhen(notice, "en") + "."
          : "सडक नक्साले " + daoWhen(notice, "ne") + " को NDRRMA सूचनाका " + shaded + " जिल्ला रातो देखाउँछ, जहाँ मुख्य सडक बन्द छ।";
      } else {
        mapText = lang === "en"
          ? "The road map is on the notices page" + (pri ? ". " + (pri.ref || "NH42") + (sec ? " (" + sec + ")" : "") + " is marked " + statusWord(pri.status, lang) : "") + "."
          : "सडक नक्सा सूचना पानामा छ" + (pri ? "। " + (pri.ref || "NH42") + (sec ? " (" + sec + ")" : "") + " " + statusWord(pri.status, lang) + " देखाइएको छ।" : "।");
      }
      return pack(lang, mapText, src, href, { followups: FOLLOW.map });
    }
    if (pol && spec.intent === "roads" && !spec.district && !spec.province && spec.meta !== "source") {
      var srcPol = sourceLine(lang, lang === "en" ? "Nepal Police" : "नेपाल प्रहरी", policeWhen(pol, lang));
      return pack(lang, policeOverview(pol, lang), srcPol, href, { followups: FOLLOW.roads, links: mapLink });
    }
    if (notice && spec.intent === "roads") {
      var daoText = spec.district ? daoDistrictText(notice, spec, data, lang) : daoListText(notice, lang, spec.province);
      return pack(lang, daoText, src, href, { followups: FOLLOW.roads, links: mapLink });
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

  function floodName(doc, id, lang) {
    var row = doc.catalog && doc.catalog[id];
    if (!row) return id;
    return lang === "en" ? (row.en || id) : (row.ne || row.en || id);
  }
  function floodRiskId(doc, id, which) {
    var day = doc.flash && doc.flash[which];
    if (!day) return "low";
    if ((day.high || []).indexOf(id) >= 0) return "high";
    if ((day.medium || []).indexOf(id) >= 0) return "medium";
    if ((day.very_high || []).indexOf(id) >= 0) return "very_high";
    return "low";
  }
  function floodRiskWord(doc, id, lang) {
    var scale = (doc.flash && doc.flash.scale) || [];
    for (var i = 0; i < scale.length; i++) {
      if (scale[i].id === id) return lang === "en" ? scale[i].en : scale[i].ne;
    }
    return id;
  }
  function floodWhich(spec) {
    if (spec.asoj === 11) return "after";
    if (spec.dayOffset === 1 || spec.asoj === 10) return "tomorrow";
    return "today";
  }
  function floodList(doc, ids, lang) {
    return (ids || []).map(function (id) { return floodName(doc, id, lang); }).join(", ");
  }
  function answerFlood(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var doc = ctx.flood;
    var href = "weather.html#flood-outlook";
    var follow = FOLLOW[spec.intent] || FOLLOW.flood_flash;
    if (!doc || !doc.flash) {
      var missing = lang === "en"
        ? "The special flood forecast is not loaded."
        : "विशेष बाढी पूर्वानुमान अहिले लोड भएको छैन।";
      return pack(lang, missing, "", href, { followups: follow });
    }
    var issued = tx(doc.source && doc.source.issued, lang);
    var src = sourceLine(lang, "DHM", issued);
    var which = floodWhich(spec);
    var text = "";
    if (which === "after") {
      text = tx(doc.day_after, lang);
    } else if (spec.intent === "flood_trishuli") {
      var st = null;
      (doc.stations || []).forEach(function (row) { if (row.highlight) st = row; });
      if (!st) st = (doc.stations || [])[12];
      var bits = [];
      if (st) {
        (st.days || []).forEach(function (code, i) {
          var day = (doc.days || [])[i];
          var lv = (doc.levels || {})[code] || {};
          bits.push((day ? tx(day, lang) : "") + " " + tx(lv, lang));
        });
      }
      text = lang === "en"
        ? "Trishuli at Betrawati: " + bits.join(", ") + "."
        : "त्रिशुली (बेत्रावती): " + bits.join(", ") + "।";
    } else if (spec.intent === "flood_rivers") {
      var near = (doc.present.near || []).map(function (r) { return tx(r, lang); }).join(", ");
      var below = (doc.present.below || []).map(function (r) { return tx(r, lang); }).join(", ");
      text = lang === "en"
        ? near + " and their tributaries are near the warning level. " + below + " and their tributaries are below it."
        : near + " र सहायक नदी सतर्कता तह नजिक छन्। " + below + " र सहायक नदी सतर्कताभन्दा तल छन्।";
    } else if (spec.intent === "flood_place" && spec.district) {
      var todayLv = floodRiskWord(doc, floodRiskId(doc, spec.district, "today"), lang);
      var tomLv = floodRiskWord(doc, floodRiskId(doc, spec.district, "tomorrow"), lang);
      var nm = floodName(doc, spec.district, lang);
      if (which === "tomorrow") {
        text = lang === "en"
          ? nm + " is at " + tomLv.toLowerCase() + " flash-flood risk tomorrow. Today it is " + todayLv.toLowerCase() + "."
          : nm + "मा भोलि आकस्मिक बाढीको जोखिम " + tomLv + " छ। आज " + todayLv + " छ।";
      } else {
        text = lang === "en"
          ? nm + " is at " + todayLv.toLowerCase() + " flash-flood risk today, and " + tomLv.toLowerCase() + " tomorrow."
          : nm + "मा आज आकस्मिक बाढीको जोखिम " + todayLv + " छ, भोलि " + tomLv + "।";
      }
    } else {
      var day = doc.flash[which] || doc.flash.today;
      var highs = floodList(doc, day.high, lang);
      var sentence = lang === "en"
        ? (which === "tomorrow" ? "Tomorrow" : "Today") + ", " + (day.high || []).length + " districts are at high flash-flood risk: " + highs + "."
        : (which === "tomorrow" ? "भोलि" : "आज") + " " + digits(String((day.high || []).length), lang) + " जिल्लामा उच्च जोखिम छ: " + highs + "।";
      text = sentence.length > 380
        ? (lang === "en"
          ? (which === "tomorrow" ? "Tomorrow" : "Today") + ", " + (day.high || []).length + " districts are at high flash-flood risk and " + (day.medium || []).length + " at medium risk."
          : (which === "tomorrow" ? "भोलि" : "आज") + " उच्च जोखिम " + digits(String((day.high || []).length), lang) + " जिल्ला र मध्यम जोखिम " + digits(String((day.medium || []).length), lang) + " जिल्लामा छ।")
        : sentence;
    }
    return pack(lang, text, src, href, { followups: follow });
  }

  var ELEC_MO_NE = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
  var ELEC_MO_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ELEC_BS = {
    2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31]
  };
  function elecBS(y, m, d) {
    var delta = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 3, 14)) / 86400000);
    var year = 2083;
    var month = 0;
    if (delta < 0) return null;
    while (true) {
      var len = ELEC_BS[year];
      if (!len) return null;
      if (delta < len[month]) break;
      delta -= len[month];
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    return { year: year, month: month, day: delta + 1 };
  }
  function elecWhen(iso, lang) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!m) return "";
    var y = +m[1];
    var mo = +m[2];
    var d = +m[3];
    var time = m[4] != null ? (m[4] + ":" + m[5]) : "";
    if (lang === "en") {
      var enDate = d + " " + ELEC_MO_EN[mo - 1] + " " + y;
      return time ? enDate + " " + time : enDate;
    }
    var bs = elecBS(y, mo, d);
    var neDate = bs ? (digits(bs.day, "ne") + " " + ELEC_MO_NE[bs.month] + " " + digits(bs.year, "ne")) : digits(d + " " + mo + " " + y, "ne");
    return time ? neDate + " " + digits(time, "ne") : neDate;
  }
  function elecMissing(lang) {
    return lang === "en"
      ? "The NEA electricity file is not loaded."
      : "प्राधिकरणको बिजुली फाइल अहिले लोड भएको छैन।";
  }
  function answerElectricity(spec, ctx) {
    var lang = ctx.lang === "en" ? "en" : "ne";
    var data = ctx.nea;
    var href = "electricity.html";
    var fu = FOLLOW.electricity;
    if (!data) return pack(lang, elecMissing(lang), "", href, { followups: fu });
    var srcName = (data.source_line && (lang === "en" ? data.source_line.en : data.source_line.ne)) || (lang === "en" ? "Source: Nepal Electricity Authority (NEA)" : "स्रोत: नेपाल विद्युत प्राधिकरण (NEA)");
    srcName = srcName.replace(/^स्रोत:\s*/, "").replace(/^Source:\s*/, "");
    if (spec.intent === "electricity_load") {
      var loads = ((data.statements && data.statements.items) || []).filter(function (item) {
        var bag = (item.summary_en || "") + " " + (item.summary_ne || "");
        return /load-shedding|load shedding|लोडसेडिङ/i.test(bag);
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      var load = loads[0];
      if (!load) return pack(lang, elecMissing(lang), "", href + "#statements", { followups: fu });
      var loadText = lang === "en" ? load.summary_en : load.summary_ne;
      return pack(lang, loadText, sourceLine(lang, srcName, elecWhen(load.date, lang)), href + "#statements", { followups: fu });
    }
    if (spec.intent === "electricity_plants") {
      var plants = ((data.damaged_assets && data.damaged_assets.items) || []).filter(function (item) {
        return item.type === "hydropower_plant";
      });
      if (!plants.length) return pack(lang, elecMissing(lang), "", href + "#assets", { followups: fu });
      var names = plants.map(function (item) { return lang === "en" ? item.name_en : item.name_ne; }).join(", ");
      var plantText = lang === "en"
        ? "NEA named these hydropower plants as damaged: " + names + "."
        : "प्राधिकरणले क्षतिग्रस्त भनेका जलविद्युत: " + names + "।";
      var plantDate = plants[0].statement_date;
      return pack(lang, plantText, sourceLine(lang, srcName, elecWhen(plantDate, lang)), href + "#assets", { followups: fu });
    }
    if (spec.intent === "electricity_nolight") {
      var helplines = (data.helplines && data.helplines.items) || [];
      var hot = null;
      helplines.forEach(function (item) { if (!hot && item.category === "hotline") hot = item; });
      if (!hot || !hot.numbers || !hot.numbers.length) return pack(lang, elecMissing(lang), "", href + "#helplines", { followups: fu });
      var num = hot.numbers[0];
      var label = lang === "en" ? hot.label_en : hot.label_ne;
      var note = lang === "en" ? hot.label_note_en : hot.label_note_ne;
      var light = label + " " + digits(num, lang) + (note ? ". " + note : "") + ".";
      if (spec.district) {
        var want = {
          rasuwa: "Rasuwa", nuwakot: "Nuwakot", dhading: "Dhading",
          sindhupalchok: "Sindhupalchowk", gorkha: "Gorkha", kavrepalanchok: "Kavre"
        }[spec.district];
        if (want) {
          var bits = helplines.filter(function (item) {
            return item.district === want && item.category === "no_light" && item.numbers && item.numbers.length;
          }).map(function (item) {
            var lab = lang === "en" ? item.label_en : item.label_ne;
            var nums = item.numbers.map(function (n) { return digits(n, lang); }).join(", ");
            return lab + " " + nums;
          });
          if (bits.length && (light + " " + bits.join("; ")).length < 360) light += " " + bits.join("; ") + ".";
        }
      }
      return pack(lang, light, sourceLine(lang, srcName, elecWhen(hot.checked_at, lang)), href + "#helplines", { followups: fu });
    }
    var rows = (data.planned_shutdowns && data.planned_shutdowns.rows) || [];
    var live = rows.filter(function (row) {
      return row.status_at_check === "upcoming" || row.status_at_check === "ongoing";
    }).sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); });
    var cover = data.coverage_line ? (lang === "en" ? data.coverage_line.en : data.coverage_line.ne) : "";
    var text;
    if (!live.length) {
      text = cover;
    } else {
      var row = live[0];
      var win = elecWhen(row.start, lang) + "–" + elecWhen(row.end, lang);
      text = lang === "en"
        ? "NEA lists " + live.length + " upcoming or ongoing planned shutdown" + (live.length === 1 ? "" : "s") + ", " + win + " (" + row.distribution_centre + ", " + row.feeder + "). " + cover
        : "आगामी वा चलिरहेको कटौती " + digits(String(live.length), "ne") + ", " + win + " (" + row.distribution_centre + ", " + row.feeder + ")। " + cover;
    }
    var checked = data.planned_shutdowns && data.planned_shutdowns.checked_at;
    return pack(lang, text, sourceLine(lang, srcName, elecWhen(checked, lang)), href + "#shutdowns", { followups: fu });
  }

  function compose(spec, ctx) {
    ctx = ctx || {};
    var lang = ctx.lang === "en" ? "en" : "ne";
    if (!spec || spec.intent === "empty") return answerFallback(lang);
    var intent = spec.intent;
    var ans;
    if (intent.indexOf("flood") === 0) ans = answerFlood(spec, ctx);
    else if (intent.indexOf("weather") === 0) ans = answerWeather(spec, ctx);
    else if (intent.indexOf("roads") === 0 || intent === "map") ans = answerRoads(spec, ctx);
    else if (intent.indexOf("rescue") === 0) ans = answerRescue(spec, ctx);
    else if (intent === "fund" || intent === "donate" || intent === "fund_source") ans = answerFund(spec, ctx);
    else if (intent === "helpline") ans = answerHelpline(spec, ctx);
    else if (intent.indexOf("electricity") === 0) ans = answerElectricity(spec, ctx);
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
