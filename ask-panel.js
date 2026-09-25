/*! Rasuwa flood bulletin · homepage Ask panel.
    The sheet, chips, and FAQ stay here. Sentences come from ask-answers.js,
    which reads the published JSON and writes a short reply. */
(function () {
  "use strict";

  var VER = window.PAGE_VER || "2026-09-25-home-title";
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
  var faqOpen = false;
  var thinkToken = 0;

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
    if (offset) now = new Date(now.getTime() + offset * 86400000);
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now);
    } catch (e) {
      var m = String(now.getMonth() + 1);
      var d = String(now.getDate());
      if (m.length < 2) m = "0" + m;
      if (d.length < 2) d = "0" + d;
      return now.getFullYear() + "-" + m + "-" + d;
    }
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
  function dataCtx() {
    var rows = cache.hl && cache.hl.length ? cache.hl : HL_FALLBACK;
    var lpg = null;
    if (cache.lpg) {
      lpg = {
        d25: cache.lpg.d25 ? { mt: cache.lpg.d25.mt, cyl: cache.lpg.d25.cyl, label: t("lpg_day_25") } : null,
        d26: cache.lpg.d26 ? { mt: cache.lpg.d26.mt, cyl: cache.lpg.d26.cyl, label: t("lpg_day_26") } : null
      };
    }
    return {
      lang: lang(),
      now: ktmISO(0),
      wx: cache.wx,
      wxnow: cache.now,
      roads: cache.roads,
      dash: cache.dash,
      gallery: cache.gallery,
      lpg: lpg,
      hl: rows.map(function (row) {
        return { tel: row.tel, name: row.key ? t(row.key) : (row.name || row.tel) };
      }),
      t: t
    };
  }
  function build(spec) {
    if (!window.AskAnswers) {
      return { text: t("ask_err"), source: "", href: "", cta: "", links: [], followups: [], suggest: false, chips: [] };
    }
    return window.AskAnswers.compose(spec, dataCtx());
  }
  function needs(spec) {
    if (!spec) return false;
    var f = spec.family || spec.type || "";
    if (f === "weather") return (!cache.wx && !failed.wx) || (!cache.now && !failed.now);
    if (f === "roads" || f === "map") return !cache.roads && !failed.roads;
    if (f === "rescue") return !cache.dash && !failed.dash;
    if (f === "lpg") return !cache.lpg && !failed.lpg;
    if (f === "cause" || f === "gallery") return !cache.gallery && !failed.gallery;
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
      getJSON("data/weather/now.json", "now"),
      getJSON("data/roads-dor.json", "roads"),
      getJSON("api/dashboard.json", "dash"),
      getJSON("data/gallery-path.json", "gallery"),
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

  function narrowAsk() {
    return window.matchMedia("(max-width: 759px)").matches;
  }
  function lastTopic() {
    for (var i = thread.length - 1; i >= 0; i--) {
      if (thread[i].kind === "card" && thread[i].spec) return thread[i].spec.topic || thread[i].spec.type || "";
    }
    return "";
  }
  function wireChip(btn, label, spec) {
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", function () { submit(label, spec); });
  }
  function fillSuggest(host, limit) {
    host.replaceChildren();
    var cap = el("p", "ask-chips-h");
    cap.textContent = t("ask_suggest");
    host.appendChild(cap);
    var row = el("div", "ask-chip-row");
    chipModels().slice(0, limit || 5).forEach(function (c) {
      var b = el("button", "ask-chip ask-chip-next");
      wireChip(b, c.label, askSpec(c.id, c.label, { topic: c.id, query: c.id === "names" ? "" : undefined }));
      row.appendChild(b);
    });
    host.appendChild(row);
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
  function renderTyping(host, isNew) {
    var row = el("div", "ask-typing" + (isNew ? " is-new" : ""));
    row.setAttribute("role", "status");
    row.innerHTML = "<span></span><span></span><span></span>";
    var em = el("em");
    em.textContent = t("ask_thinking");
    row.appendChild(em);
    host.appendChild(row);
  }
  function topicLabel(topic) {
    var models = chipModels();
    for (var i = 0; i < models.length; i++) {
      if (models[i].id === topic) return models[i].label;
    }
    return "";
  }
  function renderCard(host, built, topic, isNew) {
    built = built || { text: t("ask_fallback"), suggest: true, chips: [] };
    var art = el("article", "ask-card ask-bubble" + (topic ? " is-" + topic : "") + (isNew ? " is-new" : ""));
    var body = el("p", "ask-answer");
    body.textContent = built.text || "";
    art.appendChild(body);
    if (built.source) {
      var src = el("p", "ask-src");
      src.textContent = built.source;
      art.appendChild(src);
    }
    var more = el("p", "ask-more");
    var linked = false;
    if (built.openNames != null) {
      var btn = el("button", "ask-go ask-details");
      btn.type = "button";
      btn.textContent = built.cta || (lang() === "en" ? "View details" : "विवरण हेर्नुहोस्");
      btn.addEventListener("click", function () { openNames(built.openNames || ""); });
      more.appendChild(btn);
      linked = true;
    } else if (built.href && built.cta) {
      var link = el("a", "ask-go ask-details");
      link.href = built.href;
      link.textContent = built.cta;
      more.appendChild(link);
      linked = true;
    }
    (built.links || []).slice(0, 1).forEach(function (item) {
      if (!item || !item.href) return;
      var a = el("a", "ask-also");
      a.href = item.href;
      a.textContent = item.label || (lang() === "en" ? "More" : "थप");
      more.appendChild(a);
      linked = true;
    });
    if (linked) art.appendChild(more);
    if (built.suggest) {
      var sug = el("div", "ask-suggest");
      var chips = built.chips || [];
      if (chips.length) {
        sug.replaceChildren();
        var cap = el("p", "ask-chips-h");
        cap.textContent = t("ask_suggest");
        sug.appendChild(cap);
        var row = el("div", "ask-chip-row");
        chips.slice(0, 3).forEach(function (c) {
          var label = lang() === "en" ? c.en : c.ne;
          var b = el("button", "ask-chip ask-chip-next");
          b.type = "button";
          b.textContent = label;
          b.addEventListener("click", function () { submit(label, null); });
          row.appendChild(b);
        });
        sug.appendChild(row);
      } else fillSuggest(sug, 3);
      art.appendChild(sug);
    }
    host.appendChild(art);
  }
  function askSpec(route, raw, extra) {
    var spec = specFromRoute(route, raw, extra || {});
    if (!spec.raw) spec.raw = raw || "";
    return spec;
  }
  function renderFollow(host, items) {
    if (!items || !items.length) return;
    var wrap = el("div", "ask-follow");
    var cap = el("p", "ask-chips-h");
    cap.textContent = t("ask_follow");
    wrap.appendChild(cap);
    var row = el("div", "ask-chip-row");
    items.slice(0, 3).forEach(function (f) {
      var label = f.q ? tx(f.q) : (lang() === "en" ? f.en : f.ne);
      if (!label) return;
      var b = el("button", "ask-chip ask-chip-next");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () { submit(label, null); });
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
    box.classList.toggle("is-open", !!(faqOpen || norm(faqQuery)));
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
    var sug = document.getElementById("ask-faq-suggest");
    if (sug) {
      sug.hidden = shown !== 0;
      if (shown === 0) fillSuggest(sug, 4);
      else sug.replaceChildren();
    }
  }
  function render(opts) {
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
    var topicNow = lastTopic();
    var fresh = !!(opts && opts.stick);
    var lastUser = -1;
    for (var u = thread.length - 1; u >= 0; u--) {
      if (thread[u].kind === "user") { lastUser = u; break; }
    }
    thread.forEach(function (msg, idx) {
      var last = idx === thread.length - 1;
      if (msg.kind === "user") {
        var mine = idx === lastUser;
        var bubble = el("p", "ask-user" + (fresh && mine ? " is-new" : ""));
        if (mine) bubble.setAttribute("data-ask-anchor", "1");
        bubble.textContent = msg.text;
        log.appendChild(bubble);
        return;
      }
      var topic = (msg.spec && (msg.spec.topic || msg.spec.type)) || "about";
      if (msg.pending || needs(msg.spec)) {
        renderTyping(log, fresh && last);
        if (last) {
          var tip = log.lastElementChild;
          if (tip) tip.setAttribute("data-ask-latest", "1");
        }
        return;
      }
      var built = build(msg.spec);
      renderCard(log, built, topic, fresh && last);
      if (last) {
        var latest = log.querySelector(".ask-card:last-of-type");
        if (latest) latest.setAttribute("data-ask-latest", "1");
        if (!built || !built.suggest) renderFollow(log, built && built.followups);
      }
    });
    renderFaq();
    chips.replaceChildren();
    var cap = el("p", "ask-chips-h");
    cap.textContent = t("ask_chips");
    chips.appendChild(cap);
    var row = el("div", "ask-chip-row");
    chipModels().forEach(function (c) {
      var b = el("button", "ask-chip" + (topicNow && topicNow === c.id ? " is-on" : ""));
      wireChip(b, c.label, askSpec(c.id, c.label, { topic: c.id, query: c.id === "names" ? "" : undefined }));
      row.appendChild(b);
    });
    chips.appendChild(row);
    var sheet = document.getElementById("ask-sheet");
    if (sheet) sheet.classList.toggle("is-thread", thread.length > 0);
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
    log.setAttribute("aria-busy", thread.some(function (m) { return m.pending; }) ? "true" : "false");
    if (fresh) pinLog(log);
  }
  function pinLog(log) {
    function place() {
      if (!log || !log.isConnected) return;
      var card = log.querySelector("[data-ask-latest]");
      var bubble = log.querySelector("[data-ask-anchor]");
      if (!card && !bubble) return;
      var base = log.getBoundingClientRect().top;
      function y(node) {
        return node.getBoundingClientRect().top - base + log.scrollTop;
      }
      var view = log.clientHeight;
      if (card && bubble) {
        var by = y(bubble);
        var cy = y(card);
        var span = card.offsetHeight + (cy - by);
        log.scrollTop = span <= view - 12 ? Math.max(0, by - 4) : Math.max(0, cy - 4);
      } else {
        log.scrollTop = Math.max(0, y(card || bubble) - 4);
      }
    }
    place();
    window.requestAnimationFrame(function () {
      place();
      window.requestAnimationFrame(place);
    });
  }
  function reveal(msg, token, started, spec) {
    var wait = Math.max(0, 280 - (Date.now() - started));
    window.setTimeout(function () {
      if (!msg.pending) return;
      msg.pending = false;
      render({ stick: token === thinkToken });
      if (token === thinkToken && spec && spec.intent === "names" && spec.query) openNames(spec.query);
    }, wait);
  }
  function bindDrag(sheet) {
    var panel = sheet.querySelector(".ask-panel");
    var grab = document.getElementById("ask-grab");
    var head = sheet.querySelector(".ask-head");
    if (!panel || !grab) return;
    var dragging = false;
    var startY = 0;
    var dy = 0;
    var pointerId = null;
    function reset() {
      dragging = false;
      dy = 0;
      panel.style.transition = "";
      panel.style.transform = "";
    }
    function down(e) {
      if (!open || !narrowAsk()) return;
      if (e.button != null && e.button !== 0) return;
      var t = e.target;
      if (t && t.closest && t.closest("button, a, input, textarea")) return;
      dragging = true;
      pointerId = e.pointerId;
      startY = e.clientY;
      dy = 0;
      panel.style.transition = "none";
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
    function move(e) {
      if (!dragging || e.pointerId !== pointerId) return;
      dy = Math.max(0, e.clientY - startY);
      panel.style.transform = "translateY(" + dy + "px)";
    }
    function up(e) {
      if (!dragging || (e && e.pointerId != null && e.pointerId !== pointerId)) return;
      var drop = dy;
      dragging = false;
      pointerId = null;
      if (drop > 88) {
        panel.style.transition = "";
        setOpen(false);
        window.requestAnimationFrame(function () { panel.style.transform = ""; });
        return;
      }
      reset();
    }
    [grab, head].forEach(function (node) {
      node.addEventListener("pointerdown", down);
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
    var backdrop = sheet.querySelector(".ask-backdrop");
    if (backdrop) {
      backdrop.addEventListener("touchmove", function (e) { if (open) e.preventDefault(); }, { passive: false });
    }
  }
  function submit(text, spec) {
    var q = String(text || "").trim();
    if (!q && !(spec && (spec.type || spec.hint))) return;
    var hint = spec && (spec.hint || spec.topic || spec.type) || "";
    var resolved = window.AskAnswers
      ? window.AskAnswers.classify(q, { hint: hint })
      : { intent: "fallback", family: "about", topic: "", raw: q };
    if (!resolved.raw) resolved.raw = q;
    if (resolved.intent === "fallback" && !q) return;
    faqOpen = false;
    faqQuery = "";
    var faqIn = document.getElementById("ask-faq-q");
    if (faqIn) faqIn.value = "";
    var msg = { kind: "card", spec: resolved, pending: true };
    thread.push({ kind: "user", text: q });
    thread.push(msg);
    if (thread.length > 24) thread = thread.slice(thread.length - 24);
    thinkToken += 1;
    var token = thinkToken;
    var started = Date.now();
    render({ stick: true });
    var input = document.getElementById("ask-q");
    if (input) input.value = "";
    function go() { reveal(msg, token, started, resolved); }
    if (needs(resolved) || (!cache.kb && !failed.kb)) load().then(go, go);
    else go();
  }
  function openNames(q) {
    if (typeof window.__openNamesSearch === "function" && document.getElementById("search")) {
      window.__openNamesSearch(q || "");
      return;
    }
    location.href = "names.html" + (q ? "?q=" + encodeURIComponent(q) : "") + "#names";
  }
  function lockPage() {
    if (document.documentElement.classList.contains("ask-lock")) return;
    askScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = "-" + askScrollY + "px";
    document.documentElement.classList.add("ask-lock");
    document.body.classList.add("ask-lock");
  }
  function unlockPage() {
    if (!document.documentElement.classList.contains("ask-lock")) return;
    var y = askScrollY;
    document.documentElement.classList.remove("ask-lock");
    document.body.classList.remove("ask-lock");
    document.body.style.top = "";
    window.scrollTo(0, y);
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
      panel.style.height = "";
      return;
    }
    var vv = window.visualViewport;
    var narrow = window.matchMedia("(max-width: 759px)").matches;
    if (!narrow || !vv) {
      sheet.style.top = "";
      sheet.style.bottom = "";
      sheet.style.height = "";
      panel.style.maxHeight = "";
      panel.style.height = "";
      return;
    }
    var top = vv.offsetTop || 0;
    var h = vv.height || window.innerHeight;
    var panelH = Math.max(280, Math.round(h - 8));
    sheet.style.top = top + "px";
    sheet.style.bottom = "auto";
    sheet.style.height = h + "px";
    panel.style.height = panelH + "px";
    panel.style.maxHeight = panelH + "px";
  }
  function focusEl(node) {
    if (!node || !node.focus) return;
    try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) {} }
  }
  var closeTimer = 0;
  function finishClose(sheet, panel, fab) {
    if (open) return;
    sheet.hidden = true;
    sheet.classList.remove("is-closing");
    if (panel) {
      panel.style.transform = "";
      panel.style.transition = "";
      panel.style.height = "";
      panel.style.maxHeight = "";
    }
    unlockPage();
    focusEl(fab);
  }
  function setOpen(next) {
    open = !!next;
    var sheet = document.getElementById("ask-sheet");
    var fab = document.getElementById("ask-fab");
    if (!sheet || !fab) return;
    var panel = sheet.querySelector(".ask-panel");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    fab.classList.toggle("is-open", open);
    window.clearTimeout(closeTimer);
    if (open) {
      if (panel) {
        panel.style.transform = "";
        panel.style.transition = "";
      }
      var msg = document.getElementById("portal-contact");
      if (msg && msg.open) msg.open = false;
      document.querySelectorAll(".fab-dock details[open]").forEach(function (d) { d.open = false; });
      lockPage();
      sheet.classList.remove("is-closing");
      sheet.hidden = false;
      placeSheet();
      if (reduceMotion) {
        sheet.classList.add("is-open");
      } else {
        window.requestAnimationFrame(function () {
          if (!open) return;
          sheet.classList.add("is-open");
          placeSheet();
        });
      }
      var input = document.getElementById("ask-q");
      if (!narrowAsk()) window.setTimeout(function () { if (open) focusEl(input); }, 80);
      load();
    } else {
      sheet.classList.remove("is-open");
      sheet.classList.add("is-closing");
      if (panel) panel.style.transition = "";
      if (reduceMotion) {
        finishClose(sheet, panel, fab);
        return;
      }
      closeTimer = window.setTimeout(function () { finishClose(sheet, panel, fab); }, 280);
    }
  }
  function mount() {
    if (document.getElementById("ask-fab")) return;
    var fab = el("button", "ask-fab");
    fab.id = "ask-fab";
    fab.type = "button";
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "ask-sheet");
    fab.setAttribute("aria-haspopup", "dialog");
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg><span class="ask-fab-lab"></span>';
    fab.addEventListener("click", function () { setOpen(!open); });
    document.body.appendChild(fab);

    var sheet = el("div", "ask-sheet");
    sheet.id = "ask-sheet";
    sheet.hidden = true;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "ask-h");
    sheet.innerHTML =
      '<div class="ask-backdrop" data-ask-close></div>' +
      '<div class="ask-panel" role="document">' +
        '<div class="ask-grab" id="ask-grab" aria-hidden="true"></div>' +
        '<header class="ask-head">' +
          '<div><h2 id="ask-h"></h2><p id="ask-sub"></p></div>' +
          '<button type="button" class="ask-x" id="ask-x" data-ask-close>×</button>' +
        "</header>" +
        '<div class="ask-log" id="ask-log" role="log" aria-live="polite"></div>' +
        '<section class="ask-faq" id="ask-faq">' +
          '<div class="ask-faq-bar">' +
            '<div class="ask-faq-title">' +
              '<h3 id="ask-faq-h"></h3>' +
              '<button type="button" class="ask-faq-toggle" id="ask-faq-toggle" aria-expanded="false" aria-controls="ask-faq-body">+</button>' +
            "</div>" +
            '<label class="sr-only" for="ask-faq-q" id="ask-faq-lab"></label>' +
            '<input id="ask-faq-q" type="search" autocomplete="off" enterkeyhint="search">' +
          "</div>" +
          '<div class="ask-faq-body" id="ask-faq-body">' +
            '<p class="ask-faq-note" id="ask-faq-note"></p>' +
            '<ul class="ask-faq-list" id="ask-faq-list"></ul>' +
            '<p class="ask-faq-empty" id="ask-faq-empty" hidden></p>' +
            '<div class="ask-faq-suggest" id="ask-faq-suggest" hidden></div>' +
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
      faqInput.addEventListener("focus", function () {
        faqOpen = true;
        renderFaq();
      });
      faqInput.addEventListener("input", function () {
        faqQuery = faqInput.value || "";
        if (norm(faqQuery)) faqOpen = true;
        renderFaq();
      });
      faqInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        var first = document.querySelector("#ask-faq-list button") || document.querySelector("#ask-faq-suggest button");
        if (first) first.click();
      });
    }
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
        var node = nodes[i];
        if (node.disabled || node.getAttribute("aria-hidden") === "true") continue;
        var rect = node.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        list.push(node);
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
        if (narrowAsk()) sheet.classList.add("is-typing");
        window.setTimeout(placeSheet, 40);
        window.setTimeout(placeSheet, 280);
      });
      askInput.addEventListener("blur", function () {
        sheet.classList.remove("is-typing");
        window.setTimeout(placeSheet, 80);
      });
    }
    bindDrag(sheet);
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
