/* रसुवा बाढी · एकीकृत नाम खोज */
(function () {
  "use strict";

  var PAGE = 80;
  var HONOR = /^(श्रीमती|श्रीमान्?|श्री|smt\.?|shrimati|shri\.?|mr\.?|mrs\.?|ms\.?|miss|dr\.?)\s+/i;
  var NP = "०१२३४५६७८९";
  var STOP = {
    जना: 1, तथा: 1, समेत: 1, बाट: 1, माथि: 1, रहेको: 1, भएको: 1, परिवार: 1,
    सहित: 1, को: 1, का: 1, की: 1, मा: 1, र: 1, the: 1, of: 1, from: 1, and: 1,
    ward: 1, municipality: 1, rural: 1, gaupalika: 1, nagarpalika: 1,
    district: 1, nepal: 1, नेपाल: 1, हाल: 1, निवेदक: 1, सम्पर्क: 1, विहीन: 1,
    बेपत्ता: 1, उद्धार: 1, भई: 1, मा: 1, for: 1, with: 1, near: 1
  };

  var CHIP_DEFS = [
    { id: "all", group: "all", i18n: "chip_all", row: "main" },
    { id: "rescue", group: "status", i18n: "chip_res", row: "main" },
    { id: "treat", group: "status", i18n: "chip_treat", row: "main" },
    { id: "miss", group: "status", i18n: "chip_miss", row: "main" },
    { id: "found", group: "status", i18n: "chip_found", row: "main", hide: true },
    { id: "foreign", group: "nation", i18n: "chip_foreign", row: "main" },
    { id: "ndrrma", group: "source", i18n: "chip_ndrrma", row: "src" },
    { id: "timure", group: "source", i18n: "chip_timure", row: "src" },
    { id: "army", group: "source", i18n: "chip_army", row: "src" },
    { id: "hello", group: "source", i18n: "chip_hello", row: "src" },
    { id: "t1", group: "source", i18n: "chip_t1", row: "src" },
    { id: "ftoday", group: "source", i18n: "chip_ftoday", row: "src" },
    { id: "np", group: "nation", i18n: "chip_np", row: "nat" },
    { id: "in", group: "nation", i18n: "chip_in", row: "nat" },
    { id: "cn", group: "nation", i18n: "chip_cn", row: "nat" }
  ];

  var SRC_META = {
    family: { i18n: "src_family", jump: "#family", pill: "family" },
    hello: { i18n: "src_hello", jump: "#hello-sarkar", pill: "hello" },
    madhesh: { i18n: "src_madhesh", jump: "#hello-sarkar", pill: "hello" },
    timure: { i18n: "src_timure", jump: "#rasuwa-res", pill: "timure" },
    ndrrma: { i18n: "src_ndrrma", jump: "#dao-res", pill: "ndrrma" },
    india: { i18n: "src_india", jump: "#india-res", pill: "india" },
    t1: { i18n: "src_t1", jump: "#trishuli1-res", pill: "t1" },
    army: { i18n: "src_army", jump: "#army-heli-res", pill: "army" },
    foreign: { i18n: "src_foreign", jump: "#foreign-res", pill: "foreign" },
    cross: { i18n: "src_cross", jump: "#india-cross", pill: "cross" },
    ftoday: { i18n: "src_ftoday", jump: "#foreign-today", pill: "foreign" },
    treat: { i18n: "src_treat", jump: "#treat", pill: "treat" },
    shelter: { i18n: "src_shelter", jump: "#shelter", pill: "shelter" },
    surya: { i18n: "src_surya", jump: "#suryagadhi", pill: "surya" },
    heli: { i18n: "src_heli", jump: "#heli-ktm", pill: "heli" }
  };

  var recs = [];
  var filters = { rescue: true };
  var shown = PAGE;
  var lastHits = [];
  var ready = false;
  var jsonOk = { ndrrma: false, army: false, foreign: false, cross: false, ftoday: false };
  var overlayOpen = false;

  function isNamesPage() {
    return document.documentElement.classList.contains("names-page") || /names\.html(?:$|\?)/.test(location.pathname || "");
  }
  function afterSearchHash() {
    return isNamesPage() ? "" : "#home";
  }


  function tt(k, fb) {
    if (window.t) {
      var s = window.t(k);
      if (s && s !== k) return s;
    }
    var lang = (document.documentElement.getAttribute("lang") || "ne").slice(0, 2);
    var pack = (window.I18N && (window.I18N[lang] || window.I18N.ne)) || {};
    return pack[k] || fb || k;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }

  function asciiDigits(s) {
    return String(s == null ? "" : s).replace(/[०-९]/g, function (d) {
      return "0123456789"[NP.indexOf(d)];
    });
  }

  function onlyDigits(s) {
    return asciiDigits(s).replace(/\D/g, "");
  }

  function last10(s) {
    var d = onlyDigits(s);
    return d.length >= 10 ? d.slice(-10) : "";
  }

  function phonesOf(s) {
    var raw = asciiDigits(s || "");
    var out = [];
    raw.replace(/\d{7,15}/g, function (m) {
      if (m.length >= 10) out.push(m.slice(-10));
      else if (m.length >= 7) out.push(m);
      return m;
    });
    return out;
  }

  function parseAge(s) {
    if (s == null || s === "" || s === "-") return null;
    var t = asciiDigits(s);
    var m = t.match(/(\d{1,3})/);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return n >= 0 && n <= 120 ? n : null;
  }

  function normName(s) {
    s = String(s == null ? "" : s).normalize("NFKC").toLowerCase();
    s = s.replace(/[\u200b-\u200d\ufeff]/g, "");
    var prev;
    do {
      prev = s;
      s = s.replace(HONOR, "");
    } while (s !== prev);
    s = s.replace(/[.,;:()[\]{}'"`“”‘’]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function placeTokens(s) {
    var n = normName(s);
    if (!n) return [];
    return n.split(/[\s,·|/–—\-]+/).filter(function (t) {
      return t.length >= 3 && !STOP[t];
    });
  }

  function sharedPlace(a, b) {
    if (!a.length || !b.length) return false;
    var set = {};
    a.forEach(function (t) { set[t] = 1; });
    for (var i = 0; i < b.length; i++) if (set[b[i]]) return true;
    return false;
  }

  function fmtNum(n) {
    return window.fmtNum ? window.fmtNum(String(n)) : String(n);
  }

  function addRec(o) {
    var name = (o.name || "").trim();
    var nameNe = (o.name_ne || "").trim();
    var nameEn = (o.name_en || "").trim();
    if (!name && nameNe) name = nameNe;
    if (!name && nameEn) name = nameEn;
    if (!name) return;
    var norm = normName(name);
    var norm2 = normName(nameNe);
    var norm3 = normName(nameEn);
    if (norm2 && !norm) norm = norm2;
    if (norm3 && !norm) norm = norm3;
    var phoneList = o.phones && o.phones.length ? o.phones : phonesOf(o.phone || "");
    var place = (o.place || "").trim();
    var ageN = o.ageN != null ? o.ageN : parseAge(o.age);
    var src = o.source;
    var status = o.status;
    var nation = o.nation || "";
    var tags = {
      miss: status === "missing",
      found: status === "found",
      rescue: status === "rescue",
      treat: status === "treat" || src === "treat",
      ndrrma: src === "ndrrma",
      t1: src === "t1",
      army: src === "army",
      hello: src === "hello" || src === "madhesh",
      timure: src === "timure",
      np: nation === "nepali",
      foreign: nation === "foreign",
      ftoday: src === "ftoday",
      in: nation === "indian",
      cn: src === "cross" || nation === "china"
    };
    if (src === "ndrrma" || src === "timure" || src === "india" || src === "t1") {
      tags.rescue = true;
    }
    if (src === "army" || src === "foreign" || src === "ftoday") tags.rescue = true;
    if (src === "shelter" || src === "surya" || src === "heli") tags.rescue = true;
    if (status === "found") tags.rescue = true;
    if (src === "cross") { tags.cn = true; tags.in = true; }
    if (src === "india" || src === "t1") tags.in = true;
    if (src === "foreign" || src === "ftoday") tags.foreign = true;
    if (src === "ftoday" && nation === "china") tags.cn = true;
    var hay = [name, nameNe, nameEn, place, o.phone || "", phoneList.join(" "), src, nation, o.note || ""]
      .join(" ").normalize("NFKC").toLowerCase();
    hay += " " + onlyDigits(hay);
    recs.push({
      id: o.id,
      name: name,
      name_ne: nameNe,
      name_en: nameEn,
      norm: norm,
      norms: [norm, norm2, norm3].filter(function (x, i, a) { return x && a.indexOf(x) === i; }),
      age: o.age || (ageN != null ? String(ageN) : ""),
      ageN: ageN,
      place: place,
      placeTok: placeTokens(place),
      phone: o.phone || phoneList[0] || "",
      phones: phoneList,
      status: status,
      source: src,
      nation: nation,
      jump: o.jump || (SRC_META[src] && SRC_META[src].jump) || "#family",
      domId: o.domId || "",
      tags: tags,
      hay: hay,
      note: o.note || "",
      list: o.list || "",
      extraLabs: [],
      hideDup: false,
      dupOf: "",
      matches: []
    });
  }

  function scrapeTable(sel, map) {
    var rows = document.querySelectorAll(sel);
    var n = 0;
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var rec = map(tr, i);
      if (rec) { addRec(rec); n++; }
    }
    return n;
  }

  function cellText(tr, i) {
    var td = tr.children[i];
    return td ? (td.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function fromFamily(data) {
    function one(it, status) {
      if (!it || !it.name) return;
      addRec({
        id: "fam-" + (it.id || recs.length),
        name: it.name,
        age: it.age,
        place: it.place,
        phone: it.phone,
        status: status,
        source: "family",
        nation: "nepali",
        jump: status === "found" ? "#fam-found-h" : "#fam-public",
        domId: it.id ? "n-" + it.id : "",
        note: it.note || ""
      });
    }
    (data.missing || []).forEach(function (it) { one(it, "missing"); });
    (data.found || []).forEach(function (it) { one(it, "found"); });
  }

  function fromNdrrma(data) {
    (data.people || []).forEach(function (p, i) {
      var loc = p.rescued_location || {};
      var place = loc.title_ne || loc.title || "";
      var nat = p.nationality === "foreign" ? "foreign" : "nepali";
      var country = "";
      if (p.country) {
        country = typeof p.country === "string" ? p.country : (p.country.title || p.country.title_ne || "");
      }
      if (/india/i.test(country) || country === "भारत") nat = "indian";
      addRec({
        id: "ndrrma-" + (p.id || i),
        name: p.name_ne || p.name,
        name_ne: p.name_ne || "",
        name_en: p.name || "",
        age: p.age,
        place: place,
        status: "rescue",
        source: "ndrrma",
        nation: nat,
        jump: "#dao-res",
        note: p.remarks || ""
      });
    });
    jsonOk.ndrrma = true;
  }

  function fromArmy(data) {
    (data.people || []).forEach(function (p, i) {
      addRec({
        id: "army-" + i,
        name: p.n,
        age: p.age,
        place: p.a,
        status: "rescue",
        source: "army",
        nation: "nepali",
        jump: "#army-heli-res",
        note: p.r || ""
      });
    });
    jsonOk.army = true;
  }

  function fromForeign(data) {
    (data.people || []).forEach(function (p, i) {
      var c = p.c || p.c_ne || "";
      var nat = "foreign";
      if (/india|भारत/i.test(c)) nat = "indian";
      addRec({
        id: "foreign-" + i,
        name: p.n,
        name_ne: p.n,
        name_en: p.n_en || "",
        age: p.age,
        place: c,
        status: "rescue",
        source: "foreign",
        nation: nat,
        jump: "#foreign-res"
      });
    });
    jsonOk.foreign = true;
  }

  function fromCross(data) {
    (data.people || []).forEach(function (p, i) {
      addRec({
        id: "cross-" + (p.sn || i),
        name: p.name,
        name_en: p.name,
        status: "cross",
        source: "cross",
        nation: "indian",
        jump: "#india-cross"
      });
    });
    jsonOk.cross = true;
  }


  function fromFtoday(data) {
    (data.people || []).forEach(function (p, i) {
      var c = (p.c || "").toLowerCase();
      addRec({
        id: "ftoday-" + (p.s || i),
        name: p.n,
        name_en: p.n,
        age: p.age,
        place: p.r,
        status: "rescue",
        source: "ftoday",
        nation: c.indexOf("india") >= 0 ? "indian" : "china",
        jump: "#foreign-today",
        note: p.r || ""
      });
    });
    jsonOk.ftoday = true;
  }

  function scrapeDom() {
    scrapeTable("#hello-sarkar-body tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "hello-" + i,
        name: name.replace(/\s*\d{7,15}.*$/, "").replace(/\s+/g, " ").trim() || name,
        phone: tr.textContent,
        place: cellText(tr, 2),
        status: "missing",
        source: "hello",
        nation: /मलेसियन|malaysian|foreign|विदेशी/i.test(name) ? "foreign" : "nepali",
        jump: "#hello-sarkar"
      };
    });
    scrapeTable("#madhesh-body tr", function (tr, i) {
      var rescued = tr.classList.contains("rescued");
      return {
        id: "mad-" + i,
        name: cellText(tr, 1).replace(/\s*उद्धार.*$/, "").trim(),
        place: cellText(tr, 2),
        phone: cellText(tr, 3),
        status: rescued ? "found" : "missing",
        source: "madhesh",
        nation: "nepali",
        jump: "#hello-sarkar"
      };
    });
    scrapeTable("#rasuwa-res-body tr", function (tr, i) {
      return {
        id: "timure-" + i,
        name: cellText(tr, 1),
        age: cellText(tr, 2),
        place: cellText(tr, 3),
        status: "rescue",
        source: "timure",
        nation: /कोरियन|इटालेली|korean|italian|foreign/i.test(tr.textContent) ? "foreign" : "nepali",
        jump: "#rasuwa-res"
      };
    });
    if (!jsonOk.ndrrma) {
      scrapeTable("#dao-res-body tr", function (tr, i) {
        var name = cellText(tr, 1);
        var latin = /^[A-Za-z][A-Za-z .'-]+$/.test(name);
        return {
          id: "dao-" + i,
          name: name,
          place: cellText(tr, 2),
          age: cellText(tr, 3),
          status: "rescue",
          source: "ndrrma",
          nation: latin ? "foreign" : "nepali",
          jump: "#dao-res",
          note: cellText(tr, 5)
        };
      });
    }
    scrapeTable("#india-res-body tr", function (tr, i) {
      return {
        id: "india-" + i,
        name: cellText(tr, 1),
        name_en: cellText(tr, 1),
        status: "rescue",
        source: "india",
        nation: "indian",
        jump: "#india-res"
      };
    });
    scrapeTable("#trishuli1-res-body tr", function (tr, i) {
      return {
        id: "t1-" + i,
        name: cellText(tr, 1),
        name_en: cellText(tr, 1),
        status: "rescue",
        source: "t1",
        nation: "indian",
        jump: "#trishuli1-res"
      };
    });
    if (!jsonOk.army) {
      scrapeTable("#army-heli-res-body tr", function (tr, i) {
        return {
          id: "army-dom-" + i,
          name: cellText(tr, 1),
          place: cellText(tr, 2),
          age: cellText(tr, 3),
          status: "rescue",
          source: "army",
          nation: "nepali",
          jump: "#army-heli-res",
          note: cellText(tr, 5)
        };
      });
    }
    if (!jsonOk.foreign) {
      scrapeTable("#foreign-res-body tr", function (tr, i) {
        return {
          id: "foreign-dom-" + i,
          name: cellText(tr, 1),
          status: "rescue",
          source: "foreign",
          nation: "foreign",
          jump: "#foreign-res"
        };
      });
    }
    if (!jsonOk.ftoday) {
      scrapeTable("#foreign-today-body tr", function (tr, i) {
        var c = cellText(tr, 2);
        return {
          id: "ftoday-dom-" + i,
          name: cellText(tr, 1),
          place: cellText(tr, 5),
          age: cellText(tr, 3),
          status: "rescue",
          source: "ftoday",
          nation: /भारत|india/i.test(c) ? "indian" : "china",
          jump: "#foreign-today"
        };
      });
    }
    if (!jsonOk.cross) {
      scrapeTable("#india-cross-body tr", function (tr, i) {
        return {
          id: "cross-dom-" + i,
          name: cellText(tr, 1),
          status: "cross",
          source: "cross",
          nation: "indian",
          jump: "#india-cross"
        };
      });
    }
    scrapeTable("#treat-dhunche-body tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "treat-d-" + i,
        name: name,
        age: cellText(tr, 2),
        place: cellText(tr, 4),
        status: "treat",
        source: "treat",
        nation: "nepali",
        jump: "#treat-dhunche",
        note: (cellText(tr, 5) + " " + cellText(tr, 6)).trim(),
        list: "dhunche"
      };
    });
    scrapeTable("#treat-body tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "treat-k-" + i,
        name: name,
        age: cellText(tr, 2),
        place: cellText(tr, 3),
        phone: cellText(tr, 4),
        status: "treat",
        source: "treat",
        nation: "nepali",
        jump: "#treat",
        note: (cellText(tr, 6) + " " + cellText(tr, 7)).trim()
      };
    });
    scrapeTable("#shelter-body tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "shelter-" + i,
        name: name,
        age: cellText(tr, 2),
        place: cellText(tr, 4) || cellText(tr, 5),
        status: "rescue",
        source: "shelter",
        nation: "nepali",
        jump: "#shelter"
      };
    });
    scrapeTable("#surya-body tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "surya-" + i,
        name: name,
        place: cellText(tr, 2),
        status: "rescue",
        source: "surya",
        nation: "nepali",
        jump: "#suryagadhi"
      };
    });
    scrapeTable("#heli-ktm tbody tr", function (tr, i) {
      var name = cellText(tr, 1);
      if (!name) return null;
      return {
        id: "heli-" + i,
        name: name,
        status: "rescue",
        source: "heli",
        nation: "nepali",
        jump: "#heli-ktm"
      };
    });
  }

  function samePhone(a, b) {
    if (!a.phones.length || !b.phones.length) return false;
    for (var i = 0; i < a.phones.length; i++) {
      if (b.phones.indexOf(a.phones[i]) !== -1) return true;
    }
    return false;
  }

  function differentPhone(a, b) {
    return a.phones.length && b.phones.length && !samePhone(a, b);
  }

  function differentPlace(a, b) {
    return a.placeTok.length && b.placeTok.length && !sharedPlace(a.placeTok, b.placeTok);
  }

  function nameOverlap(a, b) {
    for (var i = 0; i < a.norms.length; i++) {
      if (a.norms[i] && b.norms.indexOf(a.norms[i]) !== -1) return a.norms[i];
    }
    return "";
  }

  function isRescueTreat(src) {
    return src === "ndrrma" || src === "timure" || src === "army" || src === "india" || src === "t1"
      || src === "foreign" || src === "ftoday" || src === "shelter" || src === "surya" || src === "heli"
      || src === "treat";
  }

  function scriptKind(s) {
    s = String(s || "");
    var dev = /[\u0900-\u097F]/.test(s);
    var lat = /[A-Za-z]/.test(s);
    if (dev && !lat) return "dev";
    if (lat && !dev) return "lat";
    return "mix";
  }

  function scriptClash(a, b) {
    var sa = scriptKind(a.name || a.norm);
    var sb = scriptKind(b.name || b.norm);
    return (sa === "dev" && sb === "lat") || (sa === "lat" && sb === "dev");
  }

  function extraLabFor(rec) {
    if (!rec) return "";
    if (rec.source === "treat") {
      return rec.list === "dhunche" || rec.jump === "#treat-dhunche"
        ? tt("ig_lab_care", "उपचाररत") + " · " + tt("ig_dhunche", "धुन्चे")
        : tt("ig_lab_care", "उपचाररत") + " · " + tt("src_treat", "उपचार");
    }
    var srcLab = tt((SRC_META[rec.source] || {}).i18n || "", rec.source);
    return tt("ig_lab_res", "उद्धार") + " · " + srcLab;
  }

  function computeMatches() {
    var by = {};
    recs.forEach(function (r, idx) {
      r.matches = [];
      r._i = idx;
      r.norms.forEach(function (n) {
        if (!n) return;
        (by[n] || (by[n] = [])).push(r);
      });
    });
    var seenPair = {};
    function pairKey(a, b) {
      return a._i < b._i ? a._i + ":" + b._i : b._i + ":" + a._i;
    }
    function addMatch(a, b, kind) {
      var k = pairKey(a, b);
      if (seenPair[k]) return;
      seenPair[k] = kind;
      a.matches.push({ id: b.id, kind: kind, source: b.source, jump: b.jump, name: b.name });
      b.matches.push({ id: a.id, kind: kind, source: a.source, jump: a.jump, name: a.name });
    }
    Object.keys(by).forEach(function (n) {
      var g = by[n];
      if (g.length < 2) return;
      var uniq = [];
      var seen = {};
      g.forEach(function (r) {
        if (!seen[r.id]) { seen[r.id] = 1; uniq.push(r); }
      });
      g = uniq;
      if (g.length < 2) return;
      var strongAt = {};
      for (var i = 0; i < g.length; i++) {
        for (var j = i + 1; j < g.length; j++) {
          var a = g[i], b = g[j];
          if (a.source === b.source && a.status === b.status) continue;
          if (scriptClash(a, b)) continue;
          if (differentPhone(a, b)) continue;
          var phoneHit = samePhone(a, b);
          var ageHit = a.ageN != null && b.ageN != null && Math.abs(a.ageN - b.ageN) <= 1;
          var placeHit = sharedPlace(a.placeTok, b.placeTok);
          if (phoneHit || (ageHit && placeHit)) {
            var rtPair = (a.status === "missing" && isRescueTreat(b.source))
              || (b.status === "missing" && isRescueTreat(a.source));
            var kind = rtPair ? "strong"
              : (a.source === "army" || b.source === "army" || a.source === "cross" || b.source === "cross" || a.source === "ftoday" || b.source === "ftoday")
                ? "link" : "strong";
            addMatch(a, b, kind);
            strongAt[a.id] = 1;
            strongAt[b.id] = 1;
          }
        }
      }
      if (g.length === 2 && !strongAt[g[0].id] && !strongAt[g[1].id]) {
        var x = g[0], y = g[1];
        if (x.source === y.source && x.status === y.status) return;
        if (scriptClash(x, y)) return;
        if (differentPhone(x, y) || differentPlace(x, y)) return;
        var softKind = "soft";
        addMatch(x, y, softKind);
      }
    });
    recs.forEach(function (r) {
      if (r.status !== "missing") return;
      r.matches.forEach(function (m) {
        if (m.kind !== "strong") return;
        var other = recs.filter(function (x) { return x.id === m.id; })[0];
        if (!other || !isRescueTreat(other.source)) return;
        r.extraLabs.push({
          text: extraLabFor(other),
          source: other.source,
          jump: other.jump,
          status: other.status
        });
        other.hideDup = true;
        other.dupOf = r.id;
        if (other.status === "rescue" || other.tags.rescue) r.tags.rescue = true;
        if (other.status === "treat" || other.tags.treat) r.tags.treat = true;
        if (other.tags.ndrrma) r.tags.ndrrma = true;
        if (other.tags.timure) r.tags.timure = true;
        if (other.tags.army) r.tags.army = true;
        if (other.tags.t1) r.tags.t1 = true;
        if (other.tags.foreign) r.tags.foreign = true;
        if (other.tags.ftoday) r.tags.ftoday = true;
      });
    });
  }

  function decorateCards() {
    var byDom = {};
    recs.forEach(function (r) {
      if (r.domId) byDom[r.domId] = r;
    });
    document.querySelectorAll("#fam-missing .fam-card, #fam-found .fam-card").forEach(function (card) {
      card.querySelectorAll(".ns-badge").forEach(function (b) { b.remove(); });
      var rec = byDom[card.id];
      if (!rec || !rec.matches.length) return;
      var box = document.createElement("div");
      box.className = "ns-badge";
      rec.matches.forEach(function (m) {
        var a = document.createElement("a");
        a.href = m.jump || "#";
        a.className = "ns-badge-a ns-k-" + m.kind;
        var srcLab = tt((SRC_META[m.source] || {}).i18n || "", m.source);
        var label;
        if (m.kind === "soft") label = tt("ns_soft", "सम्भावित मेल") + " · " + srcLab;
        else if (m.kind === "link") label = tt("ns_also", "यो पनि") + " · " + srcLab;
        else if (isRescueTreat(m.source)) {
          var fake = { source: m.source, jump: m.jump, status: m.source === "treat" ? "treat" : "rescue", list: m.jump === "#treat-dhunche" ? "dhunche" : "" };
          label = extraLabFor(fake);
        } else label = tt("ns_match", "मेल") + " · " + srcLab;
        a.textContent = label;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          goJump(m.jump, m.name);
        });
        box.appendChild(a);
      });
      card.appendChild(box);
    });
  }

  function passFilters(r) {
    var groups = { status: [], source: [], nation: [] };
    CHIP_DEFS.forEach(function (c) {
      if (c.group === "all") return;
      if (filters[c.id]) groups[c.group].push(c.id);
    });
    function any(list, group) {
      if (!list.length) return true;
      for (var i = 0; i < list.length; i++) {
        var id = list[i];
        if (group === "status" && (id === "rescue" || id === "found")) {
          if (r.tags.rescue || r.tags.found) return true;
          continue;
        }
        if (r.tags[id]) return true;
      }
      return false;
    }
    return any(groups.status, "status") && any(groups.source) && any(groups.nation);
  }

  function queryOf(raw) {
    return normName(raw || "");
  }

  function search(q) {
    q = queryOf(q);
    var tokens = q.split(" ").filter(Boolean);
    var qd = onlyDigits(q);
    var out = [];
    var filtered = [];
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (!passFilters(r)) continue;
      filtered.push(r);
    }
    for (var i = 0; i < filtered.length; i++) {
      var r = filtered[i];
      if (tokens.length) {
        var ok = true;
        for (var t = 0; t < tokens.length; t++) {
          if (r.hay.indexOf(tokens[t]) === -1) { ok = false; break; }
        }
        if (!ok && !(qd.length >= 4 && r.hay.indexOf(qd) !== -1)) continue;
      } else if (qd.length >= 4) {
        if (r.hay.indexOf(qd) === -1) continue;
      }
      var score = 0;
      if (q && r.norm === q) score += 80;
      else if (q && r.norm.indexOf(q) === 0) score += 50;
      if (r.matches.some(function (m) { return m.kind === "strong"; })) score += 20;
      if (r.matches.some(function (m) { return m.kind === "soft"; })) score += 8;
      if (r.status === "missing") score += 4;
      r._score = score;
      out.push(r);
    }
    var hitIds = {};
    out.forEach(function (r) { hitIds[r.id] = 1; });
    out = out.filter(function (r) {
      return !(r.hideDup && r.dupOf && hitIds[r.dupOf]);
    });
    out.sort(function (a, b) { return b._score - a._score; });
    return out;
  }

  function hasActiveFilter() {
    for (var k in filters) if (filters[k]) return true;
    return false;
  }

  function currentQuery() {
    var ov = document.getElementById("names-ov-q");
    var home = document.getElementById("names-home-q");
    var sec = document.getElementById("names-q");
    var fam = document.getElementById("fam-search");
    if (overlayOpen && ov) return ov.value || "";
    var active = document.activeElement;
    if (sec && active === sec) return sec.value || "";
    if (home && active === home) return home.value || "";
    if (fam && active === fam) return fam.value || "";
    if (sec && sec.value) return sec.value;
    if (ov && ov.value) return ov.value;
    if (home && home.value) return home.value;
    if (fam && fam.value) return fam.value;
    return (ov && ov.value) || "";
  }

  function syncInputs(q, except) {
    ["names-ov-q", "names-home-q", "names-q", "fam-search"].forEach(function (id) {
      if (id === except) return;
      var el = document.getElementById(id);
      if (el && el.value !== q) {
        el.value = q;
        if (id === "fam-search") {
          try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
        }
      }
    });
  }

  function renderChips(root, row) {
    if (!root) return;
    root.innerHTML = "";
    CHIP_DEFS.forEach(function (c) {
      if (c.hide) return;
      if (row && c.row !== row) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ns-chip";
      btn.setAttribute("data-chip", c.id);
      var on = c.id === "all" ? !hasActiveFilter() : !!filters[c.id];
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) btn.classList.add("on");
      if (c.id === "miss") btn.classList.add("tone-miss");
      if (c.id === "found" || c.id === "rescue") btn.classList.add("tone-ok");
      if (c.id === "treat") btn.classList.add("tone-treat");
      btn.textContent = tt(c.i18n, c.id);
      btn.addEventListener("click", function () {
        if (c.id === "all") filters = {};
        else if (c.group === "status") {
          var turn = !filters[c.id];
          var sid = c.id === "found" ? "rescue" : c.id;
          filters = {};
          if (turn) filters[sid] = true;
          if (turn && window.__namesSetCat) window.__namesSetCat(sid, { filter: false });
        } else {
          filters[c.id] = !filters[c.id];
          if (c.id === "foreign" && filters.foreign && window.__namesSetCat) {
            window.__namesSetCat("rescue", { filter: false, foreign: true });
          }
        }
        shown = PAGE;
        paintChips();
        renderResults();
        if (root.id === "fam-search-chips") openOverlay();
      });
      root.appendChild(btn);
    });
  }

  function paintChips() {
    renderChips(document.getElementById("names-ov-chips"));
    renderChips(document.getElementById("names-home-chips"), "main");
    renderChips(document.getElementById("fam-search-chips"), "main");
    renderChips(document.getElementById("names-sec-chips"), "main");
    renderChips(document.getElementById("names-src-chips"), "src");
    renderChips(document.getElementById("names-nat-chips"), "nat");
  }

  function resultHtml(r) {
    var en = r.name_en && normName(r.name_en) !== normName(r.name) ? r.name_en : "";
    var ne = r.name_ne && r.name_ne !== r.name ? r.name_ne : "";
    var bits = [];
    if (r.age) bits.push(tt("ns_age", "उमेर") + " " + esc(asciiDigits(r.age)));
    if (r.place) bits.push(esc(r.place));
    if (r.phone) bits.push('<span class="ns-phone">' + esc(r.phone) + "</span>");
    var pills = [];
    pills.push('<span class="ns-pill ns-st-' + r.status + '">' + esc(statusLabel(r)) + "</span>");
    pills.push('<span class="ns-pill ns-src-' + r.source + '">' + esc(tt((SRC_META[r.source] || {}).i18n || "", r.source)) + "</span>");
    if (r.nation) pills.push('<span class="ns-pill ns-nat">' + esc(natLabel(r.nation)) + "</span>");
    (r.extraLabs || []).forEach(function (x) {
      pills.push('<span class="ns-pill ns-xlab">' + esc(x.text) + "</span>");
    });
    r.matches.forEach(function (m) {
      if (m.kind === "strong" && isRescueTreat(m.source)) return;
      var lab = m.kind === "soft" ? tt("ns_soft", "सम्भावित मेल")
        : m.kind === "link" ? tt("ns_also", "यो पनि")
        : tt("ns_match", "मेल");
      pills.push('<span class="ns-pill ns-k-' + m.kind + '">' + esc(lab + " · " + tt((SRC_META[m.source] || {}).i18n || "", m.source)) + "</span>");
    });
    var title = esc(r.name);
    var sub = en ? "<small>" + esc(en) + "</small>" : (ne && ne !== r.name ? "<small>" + esc(ne) + "</small>" : "");
    return '<article class="ns-hit" data-id="' + esc(r.id) + '">' +
      "<h3>" + title + sub + "</h3>" +
      (bits.length ? "<p class=\"ns-meta\">" + bits.join(" · ") + "</p>" : "") +
      '<div class="ns-pills">' + pills.join("") + "</div>" +
      '<a class="ns-jump" href="' + esc(r.jump) + '">' + esc(tt("ns_jump", "सूचीमा जानुहोस्")) + " →</a>" +
      "</article>";
  }

  function statusLabel(r) {
    if (r.status === "missing") return tt("st_miss", "हराएको");
    if (r.status === "found") return tt("chip_found", "भेटिएको");
    if (r.status === "rescue") return tt("ig_lab_res", "उद्धार");
    if (r.status === "treat") return tt("chip_care", "उपचाररत");
    if (r.source === "cross") return tt("ig_cross", "चीनबाट प्रवेश");
    return tt("ig_lab_res", "उद्धार");
  }

  function natLabel(n) {
    if (n === "indian") return tt("chip_in", "भारतीय");
    if (n === "foreign") return tt("chip_foreign", "विदेशी");
    if (n === "china") return tt("chip_cn", "चीनबाट");
    return tt("chip_np", "नेपाली");
  }

  function renderResults() {
    var q = currentQuery();
    lastHits = ready ? search(q) : [];
    var slice = lastHits.slice(0, shown);
    var box = document.getElementById("names-ov-results");
    var count = document.getElementById("names-ov-count");
    var homeCount = document.getElementById("names-home-count");
    var emptyQ = false;
    if (count) {
      if (!ready) count.textContent = tt("ns_loading", "नाम तयार हुँदै…");
      else if (emptyQ) count.textContent = tt("ns_hint", "नाम वा नम्बर लेख्नुहोस्, वा फिल्टर छान्नुहोस्।") +
        " · " + fmtNum(recs.length) + " " + tt("ns_names", "नाम");
      else count.textContent = fmtNum(lastHits.length) + " " + tt("ns_names", "नाम");
    }
    if (homeCount) {
      if (!ready) homeCount.textContent = "";
      else if (emptyQ) homeCount.textContent = fmtNum(recs.length) + " " + tt("ns_names", "नाम");
      else homeCount.textContent = fmtNum(lastHits.length) + " " + tt("ns_names", "नाम");
    }
    var secCount = document.getElementById("names-sec-count");
    if (secCount) {
      if (!ready) secCount.textContent = "";
      else if (emptyQ) secCount.textContent = fmtNum(recs.length) + " " + tt("ns_names", "नाम");
      else secCount.textContent = fmtNum(lastHits.length) + " " + tt("ns_names", "नाम");
    }
    function paintBox(target, limit) {
      if (!target) return;
      if (!ready) {
        target.innerHTML = '<p class="ns-empty">' + esc(tt("ns_loading", "नाम तयार हुँदै…")) + "</p>";
        return;
      }
      if (emptyQ) {
        target.innerHTML = target.id === "names-sec-results" ? "" : '<p class="ns-empty">' + esc(tt("ns_hint", "नाम वा नम्बर लेख्नुहोस्, वा फिल्टर छान्नुहोस्।")) + "</p>";
        return;
      }
      if (!lastHits.length) {
        target.innerHTML = '<p class="ns-empty">' + esc(tt("ns_empty", "यो खोजसँग मिल्ने नाम भेटिएन।")) + "</p>";
        return;
      }
      var bit = lastHits.slice(0, limit);
      target.innerHTML = bit.map(resultHtml).join("");
      if (lastHits.length > limit) {
        var more = document.createElement("button");
        more.type = "button";
        more.className = "ns-more";
        more.textContent = tt("ns_more", "थप देखाउनुहोस्") + " · " + fmtNum(lastHits.length - limit);
        more.addEventListener("click", function () {
          shown += PAGE;
          renderResults();
        });
        target.appendChild(more);
      }
      target.querySelectorAll(".ns-hit").forEach(function (el) {
        var id = el.getAttribute("data-id");
        var rec = recs.filter(function (r) { return r.id === id; })[0];
        if (!rec) return;
        el.querySelectorAll(".ns-jump").forEach(function (a) {
          a.addEventListener("click", function (e) {
            e.preventDefault();
            goJump(rec.jump, rec.name, rec.domId);
          });
        });
      });
    }
    if (box) paintBox(box, shown);
    var secBox = document.getElementById("names-sec-results");
    if (secBox) {
      secBox.hidden = false;
      paintBox(secBox, shown);
    }
  }

  function catOfRec(rec, hash) {
    var src = rec && rec.source;
    var st = rec && rec.status;
    if (st === "treat" || src === "treat") return "treat";
    if (st === "missing" || src === "hello" || src === "madhesh") return "miss";
    if (src === "family" && st === "found") return "rescue";
    var id = (hash || "").replace(/^#/, "");
    if (id === "fam-found-h" || id === "fam-found") return "rescue";
    if (id === "treat" || id === "treat-dhunche") return "treat";
    if (id === "family" || id === "hello-sarkar" || id === "fam-public") return "miss";
    return "rescue";
  }

  function goJump(hash, name, domId) {
    closeOverlay(true);
    var target = (hash || "").replace(/^#/, "");
    if (!isNamesPage()) {
      location.href = "names.html" + (target ? "#" + target : "");
      return;
    }
    var fam = document.getElementById("fam-search");
    if (fam && name) {
      fam.value = name;
      fam.dispatchEvent(new Event("input", { bubbles: true }));
    }
    var rec = recs.filter(function (r) { return r.domId === domId || r.jump === hash; })[0];
    if (window.__namesSetCat) window.__namesSetCat(catOfRec(rec, hash), { filter: true });
    if (target) {
      try {
        history.pushState(null, "", location.pathname + location.search + "#" + target);
      } catch (err) {}
      try { window.dispatchEvent(new Event("hashchange")); } catch (err) {}
    }
    setTimeout(function () {
      var el = (domId && document.getElementById(domId)) || document.getElementById(target);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "auto" });
      if (el) {
        el.classList.add("ns-flash");
        setTimeout(function () { el.classList.remove("ns-flash"); }, 1600);
      }
    }, 80);
  }

  function openOverlay(q) {
    var ov = document.getElementById("search");
    if (!ov) return;
    overlayOpen = true;
    ov.hidden = false;
    ov.classList.add("on");
    document.body.classList.add("names-ov-lock");
    if (q != null) {
      var inp = document.getElementById("names-ov-q");
      if (inp) inp.value = q;
    }
    syncInputs((document.getElementById("names-ov-q") || {}).value || "", "names-ov-q");
    shown = PAGE;
    renderResults();
    var inp2 = document.getElementById("names-ov-q");
    if (inp2) {
      try { inp2.focus(); inp2.select(); } catch (e) {}
    }
  }

  function closeOverlay(keepHash) {
    var ov = document.getElementById("search");
    if (!ov) return;
    overlayOpen = false;
    ov.hidden = true;
    ov.classList.remove("on");
    document.body.classList.remove("names-ov-lock");
    if (!keepHash && location.hash === "#search") {
      try {
        history.replaceState(null, "", location.pathname + location.search + afterSearchHash());
      } catch (e) {}
    }
  }

  function onQueryInput(e) {
    var q = e.target.value || "";
    syncInputs(q, e.target.id);
    shown = PAGE;
    renderResults();
    if (e.target.id === "names-home-q" && q.trim() && window.matchMedia && window.matchMedia("(min-width:960px)").matches) {
      openOverlay(q);
    }
  }

  function bindUi() {
    paintChips();
    ["names-ov-q", "names-home-q", "names-q"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", onQueryInput);
      el.addEventListener("search", onQueryInput);
    });
    var famQ = document.getElementById("fam-search");
    if (famQ) {
      famQ.addEventListener("input", function (e) {
        syncInputs(e.target.value || "", "fam-search");
        shown = PAGE;
        renderResults();
      });
    }
    var homeQ = document.getElementById("names-home-q");
    if (homeQ) {
      homeQ.addEventListener("focus", function () {
        if (window.matchMedia && window.matchMedia("(min-width:960px)").matches) {
          openOverlay(homeQ.value || "");
        }
      });
    }
    document.querySelectorAll("[data-open-names]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var q = (document.getElementById("names-home-q") || document.getElementById("names-q") || document.getElementById("fam-search") || {}).value || "";
        openOverlay(q);
      });
    });
    document.querySelectorAll("[data-jump-names]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        var q = (document.getElementById("names-home-q") || document.getElementById("fam-search") || {}).value || "";
        var inp = document.getElementById("names-q");
        if (inp && q) inp.value = q;
        syncInputs(q, "names-q");
        if (window.__namesSetCat) window.__namesSetCat("miss", { filter: false });
        try { history.pushState(null, "", location.pathname + location.search + "#names"); } catch (err) {}
        try { window.dispatchEvent(new Event("hashchange")); } catch (err) {}
        shown = PAGE;
        renderResults();
        setTimeout(function () {
          var focus = document.getElementById("names-q");
          if (focus) { try { focus.focus(); } catch (err) {} }
        }, 80);
      });
    });
    var x = document.getElementById("names-ov-x");
    if (x) x.addEventListener("click", function () { closeOverlay(); });
    var ov = document.getElementById("search");
    if (ov) {
      ov.addEventListener("click", function (e) {
        if (e.target === ov) closeOverlay();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlayOpen) {
        e.preventDefault();
        closeOverlay();
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var t = e.target;
        var tag = (t && t.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
        e.preventDefault();
        openOverlay();
      }
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href="#search"], a[href$="#search"]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      openOverlay((document.getElementById("fam-search") || {}).value || "");
    }, true);
    if (location.hash === "#search") {
      openOverlay();
      try { history.replaceState(null, "", location.pathname + location.search + afterSearchHash()); } catch (err) {}
    }
    window.addEventListener("hashchange", function () {
      if (location.hash === "#search") {
        openOverlay();
        try { history.replaceState(null, "", location.pathname + location.search + afterSearchHash()); } catch (err) {}
      }
    });
    if (window.__addLangHook) {
      window.__addLangHook(function () {
        paintChips();
        renderResults();
        decorateCards();
      });
    }
  }

  function getJson(url) {
    return fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function boot() {
    bindUi();
    Promise.all([
      getJson("family.json"),
      getJson("ndrrma-rescue.json"),
      getJson("army-heli-rescue.json"),
      getJson("rasuwa-foreign-rescued.json"),
      getJson("indian-crossed-2026-08-28.json"),
      getJson("foreign-rescued-2026-08-29.json")
    ]).then(function (pack) {
      recs = [];
      if (pack[0]) fromFamily(pack[0]);
      if (pack[1] && pack[1].people) fromNdrrma(pack[1]);
      if (pack[2] && pack[2].people) fromArmy(pack[2]);
      if (pack[3] && pack[3].people) fromForeign(pack[3]);
      if (pack[4] && pack[4].people) fromCross(pack[4]);
      if (pack[5] && pack[5].people) fromFtoday(pack[5]);
      scrapeDom();
      computeMatches();
      ready = true;
      if (!hasActiveFilter()) filters = { rescue: true };
      renderResults();
      decorateCards();
      var n = 0;
      var t = setInterval(function () {
        n++;
        if (document.querySelector("#fam-missing .fam-card") || n > 40) {
          clearInterval(t);
          decorateCards();
        }
      }, 300);
    });
  }

  window.__namesOnCat = function (cat, opts) {
    if (opts && opts.filter === false) return;
    filters = {};
    if (cat === "miss") filters.miss = true;
    else if (cat === "found") filters.rescue = true;
    else if (cat === "treat") filters.treat = true;
    else if (cat === "rescue") {
      filters.rescue = true;
      if (opts && opts.foreign) filters.foreign = true;
    }
    shown = PAGE;
    paintChips();
    renderResults();
  };
  window.__openNamesSearch = openOverlay;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
