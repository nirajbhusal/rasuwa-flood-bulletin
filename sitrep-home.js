/*! Homepage card for the national daily NDRRMA SitRep.
    Figures are read from data/ndrrma_sitrep_2283.json. This is not the
    monsoon flood casualty board. */
(function () {
  var host = document.getElementById("sitrep-home");
  if (!host) return;
  var doc = null;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function dev(n) {
    var s = String(n);
    if (lang() === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function tx(node) {
    if (!node) return "";
    if (typeof node === "string") return node;
    var l = lang();
    return node[l] || node.ne || node.en || "";
  }
  function thou(n) {
    var s = String(Math.round(Number(n)));
    var out = "";
    while (s.length > 3) {
      out = "," + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return dev(s + out);
  }
  function indian(n) {
    var s = String(Math.round(Number(n)));
    if (s.length <= 3) return dev(s);
    var head = s.slice(0, -3);
    var tail = s.slice(-3);
    var parts = [];
    while (head.length > 2) {
      parts.unshift(head.slice(-2));
      head = head.slice(0, -2);
    }
    if (head) parts.unshift(head);
    return dev(parts.join(",") + "," + tail);
  }
  function lossText(n) {
    if (n == null || !isFinite(Number(n))) return "";
    if (lang() === "en") {
      var m = Math.round(Number(n) / 10000) / 100;
      var s = m.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
      return "NPR " + s + "m";
    }
    return "रु. " + indian(n);
  }
  function shortDate() {
    var en = tx({ en: doc.as_of && doc.as_of.en, ne: "" });
    if (lang() === "en") return (doc.as_of && doc.as_of.en || "").split(",")[0];
    var ne = (doc.as_of && doc.as_of.ne) || "";
    var m = ne.match(/^([०-९0-9]+)\s+असोज/);
    if (m) return "असोज " + dev(m[1].replace(/[०-९]/g, function (d) { return "0123456789"["०१२३४५६७८९".indexOf(d)]; }));
    return ne;
  }
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function link(href, label) {
    var a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    return a;
  }
  function paint() {
    host.textContent = "";
    if (!doc || !doc.last_24h) return;
    var en = lang() === "en";
    var h = doc.last_24h;
    var fy = doc.fy_cumulative || {};
    var card = el("article", "sitrep-card");
    card.id = "sitrep-2283";
    var title = el("h2", "sitrep-title");
    title.textContent = en
      ? "Today's disaster situation · NDRRMA SitRep #" + doc.number
      : "आजको विपद् स्थिति · NDRRMA SitRep #" + dev(doc.number);
    card.appendChild(title);
    var win = tx(doc.window);
    if (win) {
      var w = el("p", "sitrep-window");
      w.textContent = win;
      card.appendChild(w);
    }
    var chips = el("div", "sitrep-chips");
    [
      [h.incidents, en ? "Incidents" : "घटना"],
      [h.deaths, en ? "Deaths" : "मृत्यु"],
      [h.injured, en ? "Injured" : "घाइते"],
      [lossText(h.estimated_loss_npr), en ? "Estimated loss" : "अनुमानित क्षति"],
      [h.livestock_loss, en ? "Livestock" : "चौपाया"]
    ].forEach(function (pair) {
      if (pair[0] == null || pair[0] === "") return;
      var chip = el("span", "sitrep-chip");
      var b = el("b");
      b.textContent = typeof pair[0] === "number" ? thou(pair[0]) : String(pair[0]);
      chip.appendChild(b);
      chip.appendChild(document.createTextNode(" " + pair[1]));
      chips.appendChild(chip);
    });
    card.appendChild(chips);
    if (fy.incidents != null) {
      var line = el("p", "sitrep-fy");
      var since = en
        ? ((fy.from && fy.from.en) || "1 Baisakh").replace(/\s+2083$/, "")
        : ((fy.from && fy.from.ne) || "१ वैशाख");
      line.textContent = en
        ? thou(fy.incidents) + " incidents · " + thou(fy.deaths) + " deaths · " + thou(fy.injured) + " injured · " + thou(fy.affected_families) + " families since " + since
        : since + " देखि: " + thou(fy.incidents) + " घटना · " + thou(fy.deaths) + " मृत्यु · " + thou(fy.injured) + " घाइते · " + thou(fy.affected_families) + " परिवार";
      card.appendChild(line);
    }
    var links = el("p", "sitrep-links");
    (doc.images || []).forEach(function (href, i) {
      if (links.childNodes.length) links.appendChild(document.createTextNode(" · "));
      links.appendChild(link(href, en ? "Sheet " + (i + 1) : "पाना " + dev(i + 1)));
    });
    if (doc.x_url) {
      if (links.childNodes.length) links.appendChild(document.createTextNode(" · "));
      links.appendChild(link(doc.x_url, "X"));
    }
    if (doc.source_url) {
      if (links.childNodes.length) links.appendChild(document.createTextNode(" · "));
      links.appendChild(link(doc.source_url, en ? "Bulletin" : "बुलेटिन"));
    }
    if (links.childNodes.length) card.appendChild(links);
    var src = el("p", "sitrep-src");
    src.textContent = "NDRRMA · " + shortDate();
    card.appendChild(src);
    host.appendChild(card);
  }

  fetch("data/ndrrma_sitrep_2283.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("sitrep"); return r.json(); })
    .then(function (json) { doc = json; paint(); })
    .catch(function () {});
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
