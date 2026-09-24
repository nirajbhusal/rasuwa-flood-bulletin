/*! Rasuwa flood bulletin · homepage Ask panel.
    Answers only from published JSON / pages.
    data/ask-kb.json holds FAQ questions, follow-ups, routing, and static text.
    It is maintained with bulletin updates. Weather, roads, rescue, names, funds,
    helpline, and LPG figures are read from live files each time the panel opens —
    the KB does not store NDRRMA, DHM, or DoR numbers. Ask does not scrape DHM. */
(function () {
  "use strict";

  var VER = window.PAGE_VER || "2026-09-24-wx-districts-tiles";
  var HL_ORDER = ["1234", "100", "1148", "1111", "1114", "102", "1144", "1155"];
  var HL_FALLBACK = [
    { tel: "1234", key: "hl_deoc" },
    { tel: "100", key: "np_police" },
    { tel: "1148", key: "hl_risk" },
    { tel: "1111", key: "hl_army" },
    { tel: "1114", key: "apf" },
    { tel: "102", key: "ambulance" },
    { tel: "1144", name: "NEOC" },
    { tel: "1155", key: "hl_flood" }
  ];
  var FUND_ROWS = [
    ["hero_mof_stock_cat", "hero_cash_num", "hero_mof_stock_src_short"],
    ["hero_usd_cat", "hero_cash_usd_num", "hero_cash_usd_src"],
    ["hero_nchl_cat", "hero_nchl_num", "hero_nchl_txn"],
    ["hero_fonepay_cat", "hero_fonepay_num", "hero_fonepay_src_short"],
    ["hero_named_cat", "hero_named_num", "hero_named_src_short"],
    ["hero_nvidia_cash_cat", "hero_nvidia_cash_num", "hero_nvidia_cash_npr"]
  ];
  var CHIPS = [
    { id: "weather", key: "ask_chip_wx" },
    { id: "roads", key: "ask_chip_road" },
    { id: "rescue", key: "ask_chip_rescue" },
    { id: "names", key: "ask_chip_name" },
    { id: "fund", key: "ask_chip_fund" },
    { id: "helpline", key: "ask_chip_hl" },
    { id: "lpg", key: "ask_chip_lpg" },
    { id: "map", key: "ask_chip_map" },
    { id: "markets", key: "ask_chip_mkt" },
    { id: "about", key: "ask_chip_about" }
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
  var PLACE_ALIASES = [
    { re: /chu[c]+h*e(?:\s*(?:naka|naska))?|चुच्चे(?:\s*नाका)?|चुचे(?:\s*नाका)?/, needle: "chuchhe" },
    { re: /syaphru|syabru|syafru|स्याफ्रु/, needle: "syaphrubesi" },
    { re: /rasuwagadhi|rasuwa\s*gadhi|rasuwagadi|रसुवागढी|रसुवा गढी/, needle: "rasuwagadhi" },
    { re: /timure|timur\b|टिमुरे|तिमुरे/, needle: "timure" },
    { re: /betrawati|betravati|betrawoti|बेत्रावती|बेतवाती/, needle: "betrawati" },
    { re: /mailung|मैलुङ|मैलुंग/, needle: "mailung" },
    { re: /galchi|गल्छी|गल्छि/, needle: "galchi" },
    { re: /trishuli|trisuli|त्रिशूली|त्रिशुली/, needle: "trishuli" },
    { re: /mugling|muglin|मुग्लिन|मुगलिङ/, needle: "mugling" },
    { re: /dhunche|धुन्चे|धुनचे/, needle: "dhunche" },
    { re: /shital|sheetal|शीतल/, needle: "shital" },
    { re: /khalte|खल्ते|खाल्टे/, needle: "khalte" },
    { re: /prithvi|पृथ्वी/, needle: "prithvi" },
    { re: /kimathanka|किमाथा/, needle: "kimathanka" },
    { re: /mechi|मेची/, needle: "mechi" },
    { re: /naubise|नौबिसे/, needle: "naubise" },
    { re: /malekhu|मालेखु/, needle: "malekhu" }
  ];
  var TOKEN_STOP = {
    today: 1, weather: 1, forecast: 1, rain: 1, road: 1, roads: 1, status: 1, highway: 1,
    map: 1, the: 1, from: 1, what: 1, about: 1, please: 1, aaja: 1, aaj: 1, bholi: 1,
    sadak: 1, bato: 1, baato: 1, mausam: 1, mousam: 1, naksa: 1, naxa: 1, open: 1,
    closed: 1, band: 1, khula: 1, mero: 1, ko: 1, ma: 1, and: 1, for: 1, how: 1,
    when: 1, where: 1, who: 1, why: 1, this: 1, that: 1, with: 1, your: 1, my: 1,
    आज: 1, भोलि: 1, भोली: 1, मौसम: 1, बाटो: 1, सडक: 1, नक्सा: 1, मेरो: 1, को: 1, मा: 1,
    के: 1, हो: 1, छ: 1, नाम: 1, खोज: 1, उद्धार: 1, राहत: 1, कोष: 1
  };

  var cache = { wx: null, roads: null, dash: null, lpg: null, hl: null, kb: null };
  var failed = {};
  var thread = [];
  var open = false;
  var askScrollY = 0;
  var inflight = null;
  var faqQuery = "";
  var faqOpen = true;

  function lang() {
    return (document.documentElement.getAttribute("lang") || "ne").slice(0, 2) === "en" ? "en" : "ne";
  }
  function t(key) {
    if (window.t) {
      var s = window.t(key);
      if (s && s !== key) return s;
    }
    var pack = (window.I18N && (window.I18N[lang()] || window.I18N.ne)) || {};
    return pack[key] != null ? pack[key] : key;
  }
  function tx(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    var l = lang();
    return obj[l] || obj.ne || obj.en || "";
  }
  function fmt(s) {
    return window.fmtNum ? window.fmtNum(String(s)) : String(s);
  }
  function ascii(s) {
    return String(s == null ? "" : s).replace(/[०-९]/g, function (d) {
      return "0123456789"["०१२३४५६७८९".indexOf(d)];
    });
  }
  function norm(s) {
    return ascii(s).normalize("NFKC").toLowerCase()
      .replace(/[\u200b-\u200d\ufeff]/g, "")
      .replace(/[’'`]/g, "")
      .replace(/[–—−-]/g, " ")
      .replace(/[.,;:()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function ktmISO(offset) {
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var ktm = new Date(utc + (5 * 60 + 45) * 60000);
    ktm.setDate(ktm.getDate() + (offset || 0));
    var m = String(ktm.getMonth() + 1);
    var d = String(ktm.getDate());
    if (m.length < 2) m = "0" + m;
    if (d.length < 2) d = "0" + d;
    return ktm.getFullYear() + "-" + m + "-" + d;
  }
  function has(q, re) { return re.test(q); }
  function includesAny(q, keys) {
    var n = norm(q);
    for (var i = 0; i < keys.length; i++) {
      if (n.indexOf(norm(keys[i])) >= 0) return true;
    }
    return false;
  }
  function findProvince(q) {
    var best = null;
    var bestLen = 0;
    PROVINCES.forEach(function (p) {
      p.keys.forEach(function (k) {
        if (norm(q).indexOf(norm(k)) >= 0 && k.length > bestLen) {
          best = p.id;
          bestLen = k.length;
        }
      });
    });
    return best;
  }
  function timelineDay(wx, iso) {
    var days = (wx && wx.timeline && wx.timeline.days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === iso) return days[i];
    return null;
  }
  function warningDay(wx, iso) {
    var days = (wx && wx.warning_days) || [];
    for (var i = 0; i < days.length; i++) if (days[i].date === iso) return days[i];
    return null;
  }
  function findDay(raw, wx) {
    if (!wx) return null;
    var q = norm(raw);
    var days = (wx.timeline && wx.timeline.days) || [];
    var m = q.match(/(?:asoj|ashwin|ashoj|असोज|आश्विन)\s*(\d{1,2})/);
    if (m) {
      for (var i = 0; i < days.length; i++) {
        var label = ascii(norm((days[i].ne || "") + " " + (days[i].en || "")));
        if (new RegExp("(?:asoj|असोज|ashwin|ashoj)\\s*" + m[1] + "\\b").test(label)) {
          return { date: days[i].date, meta: days[i] };
        }
      }
    }
    var wds = [
      [/wednesday|\bwed\b|बुध/, "Wed"],
      [/thursday|\bthu\b|बिही|बिहि/, "Thu"],
      [/friday|\bfri\b|शुक्र/, "Fri"],
      [/saturday|\bsat\b|शनि/, "Sat"],
      [/sunday|\bsun\b|आइत/, "Sun"]
    ];
    for (var w = 0; w < wds.length; w++) {
      if (wds[w][0].test(q)) {
        for (var j = 0; j < days.length; j++) {
          if (days[j].dow_en === wds[w][1]) return { date: days[j].date, meta: days[j] };
        }
      }
    }
    var off = null;
    if (has(q, /tomorrow|bholi|भोलि|भोली/)) off = 1;
    else if (has(q, /yesterday|hijo|हिजो/)) off = -1;
    else if (has(q, /today|\baaja\b|\baaj\b|आज/)) off = 0;
    if (off == null) return null;
    var iso = ktmISO(off);
    return { date: iso, meta: timelineDay(wx, iso), missing: !warningDay(wx, iso) && !timelineDay(wx, iso) };
  }
  function roadHay(road) {
    var bits = [road.ref, road.link];
    ["name", "section", "place", "district", "reason"].forEach(function (k) {
      var o = road[k];
      if (!o) return;
      if (typeof o === "string") bits.push(o);
      else bits.push(o.en, o.ne);
    });
    return norm(bits.join(" \n "));
  }
  function placeNeedles() {
    var set = [];
    function add(s) {
      norm(s).split(/[\s,/·|]+/).forEach(function (tok) {
        if (tok.length >= 4 && set.indexOf(tok) < 0) set.push(tok);
      });
    }
    PROVINCES.forEach(function (p) { p.keys.forEach(add); });
    PLACE_ALIASES.forEach(function (a) { add(a.needle); });
    ((cache.roads && cache.roads.roads) || []).forEach(function (r) { add(roadHay(r)); });
    return set;
  }
  function queryTokens(q) {
    return norm(q).split(/\s+/).filter(function (tok) {
      return tok.length >= 3 && !TOKEN_STOP[tok];
    });
  }
  function unmatchedTokens(q) {
    var needles = placeNeedles();
    return queryTokens(q).filter(function (tok) {
      if (/^nh\d+$/.test(tok.replace(/\s/g, ""))) return false;
      for (var i = 0; i < needles.length; i++) {
        if (needles[i].indexOf(tok) >= 0 || tok.indexOf(needles[i]) >= 0) return false;
      }
      return true;
    });
  }
  function findRoads(raw) {
    var data = cache.roads;
    if (!data || !data.roads) return [];
    var q = norm(raw);
    var nh = [];
    q.replace(/\bnh\s*0*(\d{1,3})\b/g, function (_, n) {
      var ref = "NH" + String(parseInt(n, 10));
      if (nh.indexOf(ref) < 0) nh.push(ref);
      return _;
    });
    var needles = [];
    PLACE_ALIASES.forEach(function (a) {
      if (a.re.test(q) && needles.indexOf(a.needle) < 0) needles.push(a.needle);
    });
    queryTokens(q).forEach(function (tok) {
      if (needles.indexOf(tok) < 0) needles.push(tok);
    });
    var hits = [];
    data.roads.forEach(function (road) {
      var hay = roadHay(road);
      var score = 0;
      if (nh.length && nh.indexOf(String(road.ref || "").toUpperCase()) >= 0) score += 12;
      if (!nh.length) {
        needles.forEach(function (needle) {
          if (needle.length >= 4 && hay.indexOf(needle) >= 0) score += Math.min(needle.length, 12);
        });
      }
      if (score > 0) hits.push({ road: road, score: score });
    });
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (!!b.road.priority !== !!a.road.priority) return b.road.priority ? 1 : -1;
      var rank = { closed: 0, partial: 1, opened: 2 };
      return (rank[a.road.status] == null ? 9 : rank[a.road.status]) - (rank[b.road.status] == null ? 9 : rank[b.road.status]);
    });
    var out = [];
    var seen = {};
    hits.forEach(function (h) {
      if (seen[h.road.id]) return;
      seen[h.road.id] = 1;
      out.push(h.road);
    });
    return out;
  }
  function classify(raw) {
    var q = norm(raw);
    if (!q) return { type: "empty" };
    var compact = q.replace(/\s+/g, "");
    if (HL_ORDER.indexOf(compact) >= 0) return { type: "helpline", topic: "helpline", raw: raw };
    var kbHit = matchKb(raw);
    if (kbHit) return kbHit;

    var weatherKw = has(q, /weather|forecast|mausam|mousam|barkha|barsha|varsha|monsoon|rainfall|\brain\b|मौसम|वर्षा|मनसुन|चेतावनी/);
    var roadKw = has(q, /road|highway|sadak|baato|\bbato\b|navigate|सडक|बाटो|राजमार्ग|blocked|closure|band\b|बन्द/);
    var mapKw = has(q, /\bmap\b|naksa|naxa|नक्सा/);
    var rescueKw = has(q, /rescue|rescued|uddar|uddhar|udhaar|sitrep|death|deaths|missing|injured|मृतक|मृत्यु|बेपत्ता|सम्पर्कविहीन|उपचार|उद्धार|घाइते/);
    var fundKw = has(q, /fund|rahat|relief|donate|nchl|fonepay|phonepay|pmdrf|कोष|राहत|दान|अर्थ मन्त्रालय|\bmof\b/);
    var hlKw = has(q, /helpline|help\s*line|hotline|हेल्पलाइन|हेल्पलाइन|आपातकाल|आपत्काल|emergency|\bhelp\b/);
    var lpgKw = has(q, /\blpg\b|elpiji|एलपीजी|एलपी|ग्यास|\bgas\b|सिलिन्डर|आपूर्ति|cylinder/);
    var nameKw = has(q, /नाम\s*खोज|naam\s*khoj|name\s*search|search\s+(?:a\s+)?name|(?:^|\s)(?:नाम|naam|name)(?:\s|$)/);
    var province = findProvince(q);
    var day = findDay(raw, cache.wx);
    var nh = /\bnh\s*0*\d{1,3}\b/.test(q);
    var roads = findRoads(raw);

    var nameRest = raw.match(/(?:नाम\s*खोज|naam\s*khoj|name\s*search|search\s+(?:a\s+)?name)\s+(.+)$/i);
    if (!nameRest) nameRest = raw.match(/^(?:नाम|naam|name)\s+(.+)$/i);

    var mktKw = has(q, /punji|capital market|share market|\bnepse\b|पूँजी|पुँजी|सेयर बजार|नेप्से/);
    var aboutKw = has(q, /about (?:this|the) bulletin|what is this|यो बुलेटिन|हाम्रो बारे|बारेमा/);
    if (mapKw && !province && !nh && !roads.length && !weatherKw) return { type: "map", topic: "map", raw: raw };
    if ((nh || roadKw || (roads.length && !province)) && !weatherKw && !rescueKw && !fundKw && !lpgKw && !mktKw) {
      return { type: mapKw && !roads.length && !nh ? "map" : "roads", roads: roads, map: mapKw, topic: mapKw && !roads.length && !nh ? "map" : "roads", raw: raw };
    }
    if ((weatherKw || province || (day && !roadKw)) && !rescueKw && !fundKw && !lpgKw && !mktKw) {
      return { type: "weather", province: province, day: day, topic: "weather", raw: raw };
    }
    if (rescueKw) return { type: "rescue", q: q, topic: "rescue", raw: raw };
    if (mktKw) return { type: "markets", topic: "markets", raw: raw };
    if (fundKw) return { type: "fund", topic: "fund", raw: raw };
    if (hlKw) return { type: "helpline", topic: "helpline", raw: raw };
    if (lpgKw) return { type: "lpg", topic: "lpg", raw: raw };
    if (aboutKw) return { type: "about", topic: "about", raw: raw };
    if (nameKw) {
      var rest = nameRest && nameRest[1] ? nameRest[1].trim() : "";
      if (/^(khoj|search|खोज)$/i.test(rest)) rest = "";
      return { type: "names", query: rest, topic: "names", raw: raw };
    }
    if (roads.length && !unmatchedTokens(raw).length) return { type: "roads", roads: roads, map: mapKw, topic: "roads", raw: raw };
    if (province) return { type: "weather", province: province, day: day, topic: "weather", raw: raw };
    if (looksLikeName(raw)) return { type: "names", query: raw.trim(), topic: "names", raw: raw };
    return { type: "fallback", topic: "about", raw: raw };
  }
  function faqList() {
    var kb = cache.kb;
    var out = [];
    if (!kb || !kb.topics) return out;
    Object.keys(kb.topics).forEach(function (id) {
      var topic = kb.topics[id] || {};
      (topic.faq || []).forEach(function (item) {
        out.push({ topic: id, item: item });
      });
    });
    return out;
  }
  function specFromRoute(route, raw, extra) {
    var spec = { type: route || "fallback", topic: route || "about", raw: raw || "" };
    if (route === "map") spec.map = true;
    if (route === "names") spec.query = "";
    if (extra && extra.static) spec.staticText = extra.static;
    if (extra && extra.topic) spec.topic = extra.topic;
    if (extra && extra.query != null) spec.query = extra.query;
    return spec;
  }
  function matchKb(raw) {
    var q = norm(raw);
    if (!q) return null;
    var items = faqList();
    for (var i = 0; i < items.length; i++) {
      var item = items[i].item;
      var candidates = [tx(item.q), tx(item.prompt)];
      for (var c = 0; c < candidates.length; c++) {
        if (candidates[c] && norm(candidates[c]) === q) {
          return specFromRoute(item.route || items[i].topic, raw, {
            static: item.static,
            topic: item.route || items[i].topic,
            query: item.route === "names" ? "" : undefined
          });
        }
      }
    }
    var prompts = (cache.kb && cache.kb.prompts) || {};
    var keys = Object.keys(prompts);
    for (var p = 0; p < keys.length; p++) {
      var prompt = prompts[keys[p]];
      if (prompt && norm(tx(prompt.q)) === q) {
        return specFromRoute(prompt.route || keys[p], raw, { topic: prompt.route || keys[p], query: prompt.route === "names" ? "" : undefined });
      }
    }
    return null;
  }
  function followupsFor(topic) {
    var kb = cache.kb;
    if (!kb || !kb.topics || !kb.prompts) return [];
    var topicRow = kb.topics[topic] || kb.topics.about;
    if (!topicRow) return [];
    var ids = topicRow.followups || [];
    var out = [];
    ids.forEach(function (id) {
      var prompt = kb.prompts[id];
      if (!prompt) return;
      out.push({ id: id, route: prompt.route || id, q: prompt.q, topic: prompt.route || id });
    });
    return out.slice(0, 4);
  }
  function chipModels() {
    var kb = cache.kb;
    if (kb && kb.topics && kb.chip_order) {
      return kb.chip_order.map(function (id) {
        var topic = kb.topics[id];
        if (!topic || !topic.label) return null;
        return { id: id === "map" ? "map" : id, label: tx(topic.label) };
      }).filter(Boolean);
    }
    return CHIPS.map(function (c) {
      return { id: c.id, label: t(c.key) };
    });
  }
  function looksLikeName(raw) {
    var q = norm(raw);
    if (!q || q.length < 2 || q.length > 80) return false;
    if (/^(what|why|how|when|where|who|hello|hi|ok|okay|thanks|thank you|status|update|ke ho|k ho|kasto|कस्तो|के हो|के छ|हेलो|नमस्ते)$/.test(q)) return false;
    var digits = q.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length >= q.replace(/\s/g, "").length - 1) return true;
    if (!/[a-z\u0900-\u097f]/.test(q)) return false;
    var tokens = queryTokens(q);
    if (!tokens.length) return false;
    if (tokens.length > 5) return false;
    var extra = unmatchedTokens(raw);
    if (!extra.length) return false;
    return true;
  }

  function provinceById(wx, id) {
    var list = (wx && wx.provinces) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function levelLabel(wx, bucket, id) {
    var bag = (wx && wx[bucket]) || {};
    var row = bag[id] || {};
    return { text: tx(row), color: row.color || "" };
  }
  function dayLabel(meta, iso) {
    if (meta) return tx({ ne: (meta.ne || "") + (meta.dow_ne ? " · " + meta.dow_ne : ""), en: (meta.en || "") + (meta.dow_en ? " · " + meta.dow_en : "") });
    return iso || "";
  }
  function fill(tpl, map) {
    return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ""; });
  }
  function line(text, color, tel) {
    return { text: text, color: color || "", tel: tel || "" };
  }
  function srcLine(name, asof) {
    var bits = [];
    if (name) bits.push(t("ask_src") + ": " + name);
    if (asof) bits.push(t("ask_asof") + " " + asof);
    return bits.join(" · ");
  }
  function card(lines, source, href, cta, extra) {
    return { lines: lines, source: source, href: href, cta: cta, extra: extra || null };
  }
  function nodata(href, cta) {
    return card([line(t("ask_nodata"))], "", href, cta);
  }

  function answerWeather(spec) {
    var wx = cache.wx;
    if (!wx) return nodata("notices.html#alert", t("ask_go_wx"));
    var ui = wx.ui || {};
    var provinceId = spec.province || null;
    var day = spec.day || null;
    if (!day && spec.raw) day = findDay(spec.raw, wx);
    if (!day && !provinceId) {
      var todayIso = ktmISO(0);
      if (warningDay(wx, todayIso)) day = { date: todayIso, meta: timelineDay(wx, todayIso) };
    }
    var lines = [];
    lines.push(line(tx(ui.title)));
    var issued = tx(ui.issued);
    if (day && day.missing) {
      lines.push(line(t("ask_noday")));
      if (tx(ui.sub)) lines.push(line(tx(ui.sub)));
      day = null;
    }
    if (day && warningDay(wx, day.date)) {
      var wd = warningDay(wx, day.date);
      var when = dayLabel(day.meta || timelineDay(wx, day.date), day.date);
      var ids = provinceId ? [provinceId] : (wx.keyboard_order || []).slice();
      var focusId = provinceId || wx.focus_province || "bagmati";
      function pushProv(id, withWhen) {
        var cell = wd.provinces && wd.provinces[id];
        var prov = provinceById(wx, id);
        if (!cell || !prov) return "";
        var lv = levelLabel(wx, "warn_levels", cell.level);
        var also = (cell.also || []).map(function (a) { return levelLabel(wx, "warn_levels", a).text; }).filter(Boolean);
        var name = lang() === "en" ? prov.en : prov.ne;
        var text = name + (withWhen ? " · " + when : "") + " · " + lv.text;
        if (withWhen && also.length) text += " · " + also.join(", ");
        if (withWhen) lines.push(line(text, lv.color));
        return name + " " + lv.text;
      }
      if (provinceId) {
        pushProv(provinceId, true);
      } else {
        pushProv(focusId, true);
        var rest = [];
        ids.forEach(function (id) {
          if (id === focusId) return;
          var bit = pushProv(id, false);
          if (bit) rest.push(bit);
        });
        if (rest.length) lines.push(line(rest.join(" · ")));
      }
    } else if (provinceId) {
      var prov2 = provinceById(wx, provinceId);
      var peak = prov2 && levelLabel(wx, "levels", prov2.level);
      var overview = tx(ui.day_overview) || tx(ui.sub);
      if (prov2 && peak) {
        lines.push(line((lang() === "en" ? prov2.en : prov2.ne) + " · " + overview + " · " + peak.text, peak.color));
        if (prov2.detail) lines.push(line(tx(prov2.detail)));
      }
    } else {
      if (tx(ui.sub)) lines.push(line(tx(ui.sub)));
      (wx.keyboard_order || []).forEach(function (id) {
        var prov3 = provinceById(wx, id);
        if (!prov3) return;
        var peak2 = levelLabel(wx, "levels", prov3.level);
        lines.push(line((lang() === "en" ? prov3.en : prov3.ne) + " · " + peak2.text, peak2.color));
      });
    }
    var showCorridor = !provinceId || provinceId === "bagmati" || provinceId === (wx.focus_province || "bagmati");
    if (showCorridor && wx.callout && tx(wx.callout.body)) {
      lines.push(line(tx(wx.callout.title) + ": " + tx(wx.callout.body) + (tx(wx.callout.meta) ? " · " + tx(wx.callout.meta) : "")));
    }
    var wxSrc = t("ask_src") + ": " + t("ask_src_dhm") + (issued ? " · " + issued : "");
    return card(lines, wxSrc, "notices.html#alert", t("ask_go_wx"));
  }

  function roadBits(road, ui) {
    var status = tx(ui[road.status] || { ne: road.status, en: road.status });
    var lines = [];
    lines.push(line((road.ref || "") + (road.link ? " · " + road.link : "") + " · " + status));
    if (tx(road.section)) lines.push(line(tx(road.section)));
    if (tx(road.reason)) lines.push(line(tx(road.reason)));
    var place = [tx(road.place), tx(road.district)].filter(Boolean).join(" · ");
    if (place) lines.push(line(tx(ui.place) + ": " + place));
    if (road.closed) lines.push(line(tx(ui.closed_on) + " " + tx(road.closed)));
    if (road.opened) lines.push(line(tx(ui.opened_on) + " " + tx(road.opened)));
    if (road.estimate && road.status !== "opened") lines.push(line(tx(ui.estimate) + " " + tx(road.estimate)));
    if (tx(road.note)) lines.push(line(tx(road.note)));
    return lines;
  }
  function answerRoads(spec) {
    if (spec && spec.raw && !(spec.roads && spec.roads.length)) {
      var found = findRoads(spec.raw);
      if (found.length) spec.roads = found;
    }
    var data = cache.roads;
    if (!data) return nodata(spec && spec.map ? "notices.html#dor-map" : "notices.html#roads", spec && spec.map ? t("ask_go_map") : t("ask_go_road"));
    var ui = data.ui || {};
    var lines = [];
    var matches = (spec && spec.roads) || [];
    if (spec && spec.type === "map" && !matches.length) {
      var pri = null;
      (data.roads || []).forEach(function (r) { if (r.priority || r.id === data.priority_id) pri = r; });
      if (data.counts) {
        lines.push(line(
          tx(ui.closed) + " " + fmt(data.counts.closed) + " · " +
          tx(ui.opened) + " " + fmt(data.counts.opened) + " · " +
          tx(ui.partial) + " " + fmt(data.counts.partial) + " · " +
          tx(ui.total) + " " + fmt(data.counts.total)
        ));
      }
      if (pri) roadBits(pri, ui).forEach(function (ln) { lines.push(ln); });
    } else if (matches.length) {
      matches.slice(0, 4).forEach(function (road, idx) {
        if (idx) lines.push(line("—"));
        roadBits(road, ui).forEach(function (ln) { lines.push(ln); });
      });
    } else {
      if (data.counts) {
        lines.push(line(
          tx(ui.closed) + " " + fmt(data.counts.closed) + " · " +
          tx(ui.opened) + " " + fmt(data.counts.opened) + " · " +
          tx(ui.partial) + " " + fmt(data.counts.partial) + " · " +
          tx(ui.total) + " " + fmt(data.counts.total)
        ));
      }
      var priority = null;
      (data.roads || []).forEach(function (r) { if (r.priority || r.id === data.priority_id) priority = r; });
      if (priority) roadBits(priority, ui).forEach(function (ln) { lines.push(ln); });
      if (tx(ui.also)) lines.push(line(tx(ui.also)));
    }
    var href = (spec && spec.map) ? "notices.html#dor-map" : "notices.html#roads";
    var cta = (spec && spec.map) ? t("ask_go_map") : t("ask_go_road");
    var asof = tx(data.as_of);
    var sourceName = (data.source && data.source.name) || "NAVIGATE";
    return card(lines, srcLine(sourceName, asof), href, cta);
  }
  function answerRescue(spec) {
    var dash = cache.dash;
    if (!dash) return nodata("index.html#overview", t("ask_go_rescue"));
    var cards = {};
    (dash.cards || []).forEach(function (c) { cards[c.id] = c; });
    var order = ["rescued", "dead", "miss", "injured"];
    var q = (spec && spec.q) || "";
    if (!q && spec && spec.raw) q = norm(spec.raw);
    var deadQ = has(q, /मृतक|मृत्यु|\bdeaths?\b/);
    var missQ = has(q, /सम्पर्कविहीन|बेपत्ता|missing/);
    var injQ = has(q, /उपचार|घाइते|injured|treatment/);
    var focus = null;
    if (deadQ && !missQ && !injQ) focus = "dead";
    else if (missQ && !deadQ && !injQ) focus = "miss";
    else if (injQ && !deadQ && !missQ) focus = "injured";
    var lines = [];
    var show = focus ? [focus] : order;
    show.forEach(function (id) {
      var c = cards[id];
      if (!c) return;
      var val = (c.value_display && (c.value_display[lang()] || c.value_display.ne)) || "";
      lines.push(line(tx(c.label) + " · " + val));
      if (focus && c.items) {
        c.items.forEach(function (item) {
          var label = tx(item.label);
          var idn = norm(item.id || "");
          var hit = q.indexOf(norm(label)) >= 0 || (idn && q.indexOf(idn.replace(/_/g, " ")) >= 0);
          if (!hit) return;
          var iv = (item.value_display && (item.value_display[lang()] || item.value_display.ne)) || "";
          if (iv) lines.push(line(label + " · " + iv));
        });
      }
    });
    var asof = tx(dash.as_of);
    return card(lines, srcLine(t("ask_src_ndrrma"), asof), "index.html#overview", t("ask_go_rescue"));
  }
  function answerFund() {
    var lines = FUND_ROWS.map(function (row) {
      return line(t(row[0]) + " · " + t(row[1]) + " · " + t(row[2]));
    });
    return card(lines, srcLine(t("ask_src_fund"), ""), "donate.html", t("ask_go_fund"));
  }
  function answerHelpline() {
    var rows = cache.hl && cache.hl.length ? cache.hl : HL_FALLBACK.map(function (row) {
      return { tel: row.tel, name: row.key ? t(row.key) : row.name };
    });
    var lines = rows.map(function (row) {
      var name = row.key ? t(row.key) : (row.name || row.tel);
      return line(name, "", row.tel);
    });
    return card(lines, srcLine(t("hl_title"), ""), "contact.html#helpline", t("ask_go_hl"));
  }
  function answerLpg() {
    var lpg = cache.lpg;
    if (!lpg || (!lpg.d25 && !lpg.d26)) return nodata("supply.html#lpg", t("ask_go_lpg"));
    var lines = [];
    lines.push(line(t("lpg_scope_k")));
    function row(dayKey, block) {
      if (!block || !block.mt) return;
      var bits = t(dayKey) + " · " + t("lpg_total") + " " + fmt(block.mt) + " " + t("lpg_unit_mt");
      if (block.cyl) bits += " · " + t("lpg_cyl") + " " + fmt(block.cyl);
      lines.push(line(bits));
    }
    row("lpg_day_25", lpg.d25);
    row("lpg_day_26", lpg.d26);
    if (lpg.d26 && lpg.d26.mt) lines.push(line(t("lpg_day_chg")));
    return card(lines, t("lpg_src"), "supply.html#lpg", t("ask_go_lpg"));
  }
  function answerNames(spec) {
    var q = (spec && spec.query) || "";
    var body = q ? t("ask_names_body") : t("ask_names_empty");
    return card([line(body)], srcLine(t("ask_src_names"), ""), "", t("ask_go_names"), { names: q });
  }
  function answerFallback() {
    return card([line(t("ask_fallback"))], "", "", "");
  }
  function answerMarkets(spec) {
    var lines = [];
    if (spec && spec.staticText) lines.push(line(tx(spec.staticText)));
    lines.push(line(t("nav_gov") + " · " + t("nav_markets")));
    var lead = t("home_markets_lead");
    if (lead && lead !== "home_markets_lead") lines.push(line(lead));
    var src = t("home_markets_src");
    if (src && src !== "home_markets_src") lines.push(line(src));
    return card(lines, "", "gov.html#gov-markets", t("ask_go_mkt"));
  }
  function answerAbout(spec) {
    var text = spec && spec.staticText ? tx(spec.staticText) : t("ask_about");
    var note = cache.kb && cache.kb.maintain ? tx(cache.kb.maintain) : t("ask_kb_note");
    var lines = [line(text)];
    if (note && note !== text) lines.push(line(note));
    return card(lines, "", "about.html", t("ask_go_about"));
  }
  function build(spec) {
    if (!spec || spec.type === "empty") return null;
    if (spec.type === "weather") return answerWeather(spec);
    if (spec.type === "roads" || spec.type === "map") return answerRoads(spec);
    if (spec.type === "rescue") return answerRescue(spec);
    if (spec.type === "fund") return answerFund();
    if (spec.type === "helpline") return answerHelpline();
    if (spec.type === "lpg") return answerLpg();
    if (spec.type === "names") return answerNames(spec);
    if (spec.type === "markets") return answerMarkets(spec);
    if (spec.type === "about") return answerAbout(spec);
    return answerFallback();
  }
  function needs(spec) {
    if (!spec) return false;
    if (spec.type === "weather") return !cache.wx && !failed.wx;
    if (spec.type === "roads" || spec.type === "map") return !cache.roads && !failed.roads;
    if (spec.type === "rescue") return !cache.dash && !failed.dash;
    if (spec.type === "lpg") return !cache.lpg && !failed.lpg;
    return false;
  }

  function bust(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(VER);
  }
  function load() {
    if (inflight) return inflight;
    failed = {};
    function getJSON(url, key) {
      return fetch(bust(url), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(key); return r.json(); })
        .then(function (j) { cache[key] = j; failed[key] = 0; })
        .catch(function () { failed[key] = 1; });
    }
    function getHTML(url, key, parse) {
      return fetch(bust(url), { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(key); return r.text(); })
        .then(function (html) { cache[key] = parse(html); failed[key] = 0; })
        .catch(function () { failed[key] = 1; });
    }
    inflight = Promise.all([
      getJSON("data/ask-kb.json", "kb"),
      getJSON("data/weather-alert.json", "wx"),
      getJSON("data/roads-dor.json", "roads"),
      getJSON("api/dashboard.json", "dash"),
      getHTML("supply.html", "lpg", parseSupply),
      getHTML("contact.html", "hl", parseHelpline)
    ]).then(function () {
      inflight = null;
      render();
    }, function () {
      inflight = null;
      render();
    });
    return inflight;
  }
  function textOf(node) {
    return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
  }
  function parseSupply(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    function kpi(sel) {
      var root = doc.querySelector(sel);
      if (!root) return null;
      var nums = root.querySelectorAll("strong.num");
      return {
        mt: nums[0] ? textOf(nums[0]) : "",
        cyl: nums[1] ? textOf(nums[1]) : ""
      };
    }
    return { d25: kpi(".lpg-kpi-d25"), d26: kpi(".lpg-kpi-d26") };
  }
  function parseHelpline(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var root = doc.querySelector("#helpline [data-dir-sec='nat']") || doc.querySelector("#helpline");
    if (!root) return null;
    var byTel = {};
    root.querySelectorAll("a.hl-row, a.pb-row").forEach(function (a) {
      var tel = textOf(a.querySelector(".pb-tel")).replace(/\s+/g, "");
      if (HL_ORDER.indexOf(tel) < 0 || byTel[tel]) return;
      var nameEl = a.querySelector(".pb-name");
      var key = nameEl && nameEl.getAttribute("data-i18n");
      byTel[tel] = { tel: tel, key: key || "", name: textOf(nameEl) };
    });
    var rows = [];
    HL_ORDER.forEach(function (tel) {
      if (!byTel[tel]) return;
      var row = byTel[tel];
      rows.push({ tel: tel, key: row.key || "", name: row.name });
    });
    return rows.length ? rows : null;
  }

  function renderLine(host, item) {
    var p = el("p", "ask-line");
    if (item.color) {
      var sw = el("i", "ask-swatch");
      sw.style.background = item.color;
      p.appendChild(sw);
    }
    p.appendChild(document.createTextNode(item.text));
    if (item.tel && /^[0-9]{3,5}$/.test(item.tel)) {
      p.appendChild(document.createTextNode(" · "));
      var a = el("a", "ask-tel");
      a.href = "tel:" + item.tel;
      a.textContent = fmt(item.tel);
      p.appendChild(a);
    }
    host.appendChild(p);
  }
  function renderCard(host, built, pending) {
    var art = el("article", "ask-card");
    if (pending) {
      renderLine(art, line(t("ask_loading")));
      host.appendChild(art);
      return;
    }
    (built.lines || []).forEach(function (item) {
      if (!item || !item.text) return;
      renderLine(art, item);
    });
    if (built.source) {
      var src = el("p", "ask-src");
      src.textContent = built.source;
      art.appendChild(src);
    }
    if (built.extra && built.extra.names != null) {
      var btn = el("button", "ask-go");
      btn.type = "button";
      btn.textContent = built.cta || t("ask_go_names");
      btn.addEventListener("click", function () { openNames(built.extra.names); });
      art.appendChild(btn);
    } else if (built.href && built.cta) {
      var link = el("a", "ask-go");
      link.href = built.href;
      link.textContent = built.cta;
      art.appendChild(link);
    }
    host.appendChild(art);
  }
  function askSpec(route, raw, extra) {
    var spec = specFromRoute(route, raw, extra || {});
    if (!spec.raw) spec.raw = raw || "";
    return spec;
  }
  function renderFollow(host, topic) {
    var items = followupsFor(topic);
    if (!items.length) return;
    var wrap = el("div", "ask-follow");
    var cap = el("p", "ask-chips-h");
    cap.textContent = t("ask_follow");
    wrap.appendChild(cap);
    var row = el("div", "ask-chip-row");
    items.forEach(function (f) {
      var b = el("button", "ask-chip ask-chip-next");
      b.type = "button";
      b.textContent = tx(f.q);
      b.addEventListener("click", function () {
        submit(tx(f.q), askSpec(f.route, tx(f.q), { topic: f.topic, query: f.route === "names" ? "" : undefined }));
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    host.appendChild(wrap);
  }
  function renderFaq() {
    var box = document.getElementById("ask-faq");
    var list = document.getElementById("ask-faq-list");
    var empty = document.getElementById("ask-faq-empty");
    var h = document.getElementById("ask-faq-h");
    var input = document.getElementById("ask-faq-q");
    var note = document.getElementById("ask-faq-note");
    var toggle = document.getElementById("ask-faq-toggle");
    if (!box || !list) return;
    if (h) h.textContent = t("ask_faq");
    if (input && document.activeElement !== input) input.setAttribute("placeholder", t("ask_faq_ph"));
    if (note) {
      var stamp = cache.kb && cache.kb.updated_at ? cache.kb.updated_at : "";
      note.textContent = t("ask_kb_note") + (stamp ? " · " + stamp : "");
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", faqOpen ? "true" : "false");
      toggle.setAttribute("aria-label", t("ask_faq"));
      toggle.textContent = faqOpen ? "–" : "+";
    }
    box.classList.toggle("is-open", faqOpen);
    var qn = norm(faqQuery);
    list.replaceChildren();
    var shown = 0;
    faqList().forEach(function (entry) {
      var label = tx(entry.item.q);
      var bag = entry.item.q || {};
      var hay = norm((bag.ne || "") + " " + (bag.en || "") + " " + label);
      if (qn && hay.indexOf(qn) < 0) return;
      shown += 1;
      var li = el("li");
      var b = el("button", "ask-faq-btn");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () {
        submit(label, askSpec(entry.item.route || entry.topic, label, {
          static: entry.item.static,
          topic: entry.item.route || entry.topic,
          query: (entry.item.route || entry.topic) === "names" ? "" : undefined
        }));
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    if (empty) {
      empty.hidden = shown !== 0;
      empty.textContent = failed.kb && !cache.kb ? t("ask_err") : t("ask_faq_empty");
    }
  }
  function render() {
    var log = document.getElementById("ask-log");
    var chips = document.getElementById("ask-chips");
    if (!log || !chips) return;
    log.replaceChildren();
    if ((failed.kb && !cache.kb) || (failed.wx && !cache.wx && thread.length)) {
      var err = el("p", "ask-error");
      err.textContent = t("ask_err");
      var retry = el("button", "ask-retry");
      retry.type = "button";
      retry.textContent = t("ask_retry");
      retry.addEventListener("click", function () { load(); });
      err.appendChild(document.createTextNode(" "));
      err.appendChild(retry);
      log.appendChild(err);
    }
    if (!thread.length) {
      var greet = el("p", "ask-greet");
      greet.textContent = t("ask_greet");
      log.appendChild(greet);
      var suggest = el("div", "ask-suggest");
      faqList().forEach(function (entry) {
        if (!entry.item.featured) return;
        var b = el("button", "ask-chip");
        b.type = "button";
        var label = tx(entry.item.q);
        b.textContent = label;
        b.addEventListener("click", function () {
          submit(label, askSpec(entry.item.route || entry.topic, label, {
            static: entry.item.static,
            topic: entry.item.route || entry.topic,
            query: (entry.item.route || entry.topic) === "names" ? "" : undefined
          }));
        });
        suggest.appendChild(b);
      });
      if (suggest.childNodes.length) log.appendChild(suggest);
    }
    thread.forEach(function (msg, idx) {
      if (msg.kind === "user") {
        var bubble = el("p", "ask-user");
        bubble.textContent = msg.text;
        log.appendChild(bubble);
        return;
      }
      var last = idx === thread.length - 1;
      if (needs(msg.spec)) {
        renderCard(log, null, true);
        return;
      }
      var built = build(msg.spec);
      renderCard(log, built || answerFallback(), false);
      if (last) renderFollow(log, (msg.spec && (msg.spec.topic || msg.spec.type)) || "about");
    });
    renderFaq();
    chips.replaceChildren();
    var cap = el("p", "ask-chips-h");
    cap.textContent = t("ask_chips");
    chips.appendChild(cap);
    var row = el("div", "ask-chip-row");
    chipModels().forEach(function (c) {
      var b = el("button", "ask-chip");
      b.type = "button";
      b.textContent = c.label;
      b.addEventListener("click", function () {
        submit(c.label, askSpec(c.id, c.label, { topic: c.id, query: c.id === "names" ? "" : undefined }));
      });
      row.appendChild(b);
    });
    chips.appendChild(row);
    var title = document.getElementById("ask-h");
    if (title) title.textContent = t("ask_title");
    var sub = document.getElementById("ask-sub");
    if (sub) {
      var stamp = cache.kb && cache.kb.updated_at ? " · " + cache.kb.updated_at : "";
      sub.textContent = t("ask_sub") + stamp;
    }
    var input = document.getElementById("ask-q");
    if (input && document.activeElement !== input) input.setAttribute("placeholder", t("ask_ph"));
    var send = document.getElementById("ask-send");
    if (send) send.textContent = t("ask_send");
    var x = document.getElementById("ask-x");
    if (x) x.setAttribute("aria-label", t("ask_close"));
    var qLab = document.getElementById("ask-q-lab");
    if (qLab) qLab.textContent = t("ask_title");
    var faqLab = document.getElementById("ask-faq-lab");
    if (faqLab) faqLab.textContent = t("ask_faq");
    var fab = document.getElementById("ask-fab");
    if (fab) {
      var lab = fab.querySelector(".ask-fab-lab");
      if (lab) lab.textContent = t("ask_fab");
      fab.setAttribute("aria-label", t("ask_fab_aria"));
    }
    log.scrollTop = log.scrollHeight;
  }
  function submit(text, spec) {
    var q = String(text || "").trim();
    if (!q && !(spec && spec.type)) return;
    var resolved = spec && spec.type ? spec : classify(q);
    if (!resolved.raw) resolved.raw = q;
    if (!resolved.topic) resolved.topic = resolved.type;
    if (resolved.type === "empty") return;
    if (resolved.type === "names") resolved.query = resolved.query != null ? resolved.query : q;
    thread.push({ kind: "user", text: q });
    thread.push({ kind: "card", spec: resolved });
    if (thread.length > 24) thread = thread.slice(thread.length - 24);
    render();
    if (resolved.type === "names") openNames(resolved.query || "");
    var input = document.getElementById("ask-q");
    if (input) input.value = "";
  }
  function openNames(q) {
    if (typeof window.__openNamesSearch === "function" && document.getElementById("search")) {
      window.__openNamesSearch(q || "");
      return;
    }
    location.href = "names.html" + (q ? "?q=" + encodeURIComponent(q) : "") + "#names";
  }
  function lockPage() {
    askScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add("ask-lock");
    document.body.classList.add("ask-lock");
    document.body.style.top = "-" + askScrollY + "px";
  }
  function unlockPage() {
    document.documentElement.classList.remove("ask-lock");
    document.body.classList.remove("ask-lock");
    document.body.style.top = "";
    window.scrollTo(0, askScrollY);
  }
  function placeSheet() {
    var sheet = document.getElementById("ask-sheet");
    var panel = sheet && sheet.querySelector(".ask-panel");
    if (!sheet || !panel) return;
    if (!open) {
      sheet.style.top = "";
      sheet.style.bottom = "";
      sheet.style.height = "";
      panel.style.maxHeight = "";
      return;
    }
    var vv = window.visualViewport;
    var narrow = window.matchMedia("(max-width: 759px)").matches;
    if (!narrow || !vv) {
      sheet.style.top = "";
      sheet.style.bottom = "";
      sheet.style.height = "";
      panel.style.maxHeight = "";
      return;
    }
    var top = vv.offsetTop || 0;
    var h = vv.height || window.innerHeight;
    sheet.style.top = top + "px";
    sheet.style.bottom = "auto";
    sheet.style.height = h + "px";
    panel.style.maxHeight = Math.max(220, h - 8) + "px";
  }
  function focusEl(node) {
    if (!node || !node.focus) return;
    try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) {} }
  }
  function setOpen(next) {
    open = !!next;
    var sheet = document.getElementById("ask-sheet");
    var fab = document.getElementById("ask-fab");
    if (!sheet || !fab) return;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    fab.classList.toggle("is-open", open);
    if (open) {
      var msg = document.getElementById("portal-contact");
      if (msg && msg.open) msg.open = false;
      document.querySelectorAll(".fab-dock details[open]").forEach(function (d) { d.open = false; });
      lockPage();
      sheet.hidden = false;
      placeSheet();
      window.requestAnimationFrame(function () {
        sheet.classList.add("is-open");
        placeSheet();
      });
      var input = document.getElementById("ask-q");
      window.setTimeout(function () { if (open) focusEl(input); }, 60);
      load();
    } else {
      sheet.classList.remove("is-open");
      placeSheet();
      window.setTimeout(function () {
        if (!open) sheet.hidden = true;
      }, 240);
      unlockPage();
      focusEl(fab);
    }
  }
  function mount() {
    if (document.getElementById("ask-fab")) return;
    var dock = document.querySelector(".fab-dock") || document.body;
    var fab = el("button", "ask-fab");
    fab.id = "ask-fab";
    fab.type = "button";
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "ask-sheet");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg><span class="ask-fab-lab"></span>';
    fab.addEventListener("click", function () { setOpen(!open); });
    dock.insertBefore(fab, dock.firstChild);

    var sheet = el("div", "ask-sheet");
    sheet.id = "ask-sheet";
    sheet.hidden = true;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "ask-h");
    sheet.innerHTML =
      '<div class="ask-backdrop" data-ask-close></div>' +
      '<div class="ask-panel" role="document">' +
        '<header class="ask-head">' +
          '<div><h2 id="ask-h"></h2><p id="ask-sub"></p></div>' +
          '<button type="button" class="ask-x" id="ask-x" data-ask-close>×</button>' +
        "</header>" +
        '<div class="ask-log" id="ask-log" role="log" aria-live="polite"></div>' +
        '<section class="ask-faq is-open" id="ask-faq">' +
          '<div class="ask-faq-bar">' +
            '<h3 id="ask-faq-h"></h3>' +
            '<button type="button" class="ask-faq-toggle" id="ask-faq-toggle" aria-expanded="true">–</button>' +
          "</div>" +
          '<div class="ask-faq-body" id="ask-faq-body">' +
            '<p class="ask-faq-note" id="ask-faq-note"></p>' +
            '<label class="sr-only" for="ask-faq-q" id="ask-faq-lab"></label>' +
            '<input id="ask-faq-q" type="search" autocomplete="off" enterkeyhint="search">' +
            '<ul class="ask-faq-list" id="ask-faq-list"></ul>' +
            '<p class="ask-faq-empty" id="ask-faq-empty" hidden></p>' +
          "</div>" +
        "</section>" +
        '<div class="ask-chips" id="ask-chips"></div>' +
        '<form class="ask-form" id="ask-form">' +
          '<label class="sr-only" for="ask-q" id="ask-q-lab"></label>' +
          '<input id="ask-q" type="text" autocomplete="off" enterkeyhint="send" maxlength="120">' +
          '<button type="submit" id="ask-send"></button>' +
        "</form>" +
      "</div>";
    document.body.appendChild(sheet);
    sheet.addEventListener("click", function (e) {
      var t = e.target;
      if (!t) return;
      if (t === sheet || (t.getAttribute && t.hasAttribute("data-ask-close"))) setOpen(false);
    });
    document.getElementById("ask-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("ask-q");
      var value = input ? input.value : "";
      submit(value, null);
      if (input) input.value = "";
    });
    var faqToggle = document.getElementById("ask-faq-toggle");
    var faqHead = document.querySelector(".ask-faq-bar");
    function flipFaq() {
      faqOpen = !faqOpen;
      render();
    }
    if (faqToggle) faqToggle.addEventListener("click", flipFaq);
    if (faqHead) faqHead.addEventListener("click", function (e) {
      if (e.target && e.target.id === "ask-faq-toggle") return;
      flipFaq();
    });
    var faqInput = document.getElementById("ask-faq-q");
    if (faqInput) {
      faqInput.addEventListener("input", function () {
        faqQuery = faqInput.value || "";
        renderFaq();
      });
      faqInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        var first = document.querySelector("#ask-faq-list button");
        if (first) first.click();
      });
    }
    faqOpen = !window.matchMedia("(max-width: 759px)").matches;
    sheet.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape") {
        var ov = document.getElementById("search");
        if (ov && !ov.hidden) return;
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      var nodes = sheet.querySelectorAll("button, a[href], input, select, textarea");
      var list = [];
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].disabled && nodes[i].offsetParent !== null) list.push(nodes[i]);
      }
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        focusEl(last);
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        focusEl(first);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !open) return;
      if (e.target && sheet.contains(e.target)) return;
      var ov = document.getElementById("search");
      if (ov && !ov.hidden) return;
      setOpen(false);
    });
    var askInput = document.getElementById("ask-q");
    if (askInput) {
      askInput.addEventListener("focus", function () {
        sheet.classList.add("is-typing");
        window.setTimeout(placeSheet, 40);
        window.setTimeout(placeSheet, 280);
        window.setTimeout(function () {
          var log = document.getElementById("ask-log");
          if (log) log.scrollTop = log.scrollHeight;
        }, 320);
      });
      askInput.addEventListener("blur", function () {
        sheet.classList.remove("is-typing");
        window.setTimeout(placeSheet, 80);
      });
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", placeSheet);
      window.visualViewport.addEventListener("scroll", placeSheet);
    }
    window.addEventListener("resize", placeSheet);
    document.querySelectorAll(".fab-dock details, #portal-contact").forEach(function (d) {
      d.addEventListener("toggle", function () { if (d.open) setOpen(false); });
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && open) load();
    });
    render();
  }

  mount();
  load();
  if (window.__addLangHook) window.__addLangHook(render);
})();
