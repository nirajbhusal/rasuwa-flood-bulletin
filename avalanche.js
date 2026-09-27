/*! Himlung Himal avalanche card. Reads data/avalanche.json. */
(function () {
  var mount = document.getElementById("avalanche-mount");
  if (!mount) return;

  var VER = window.PAGE_VER || "2026-09-27-himlung";
  var data = null;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null && node[l] !== "") return node[l];
    return node.ne || node.en || "";
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function digits(n) {
    var s = String(n);
    if (lang() === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return "०१२३४५६७८९"[d]; });
  }
  function grouped(n) {
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return digits(s);
  }
  function bust(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(VER);
  }
  function primarySource(inc) {
    var list = (inc && inc.sources) || [];
    for (var i = 0; i < list.length; i++) if (list[i].primary) return list[i];
    return list[0] || null;
  }
  function extLink(href, label) {
    var a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = label;
    return a;
  }
  function figureCredit(inc) {
    var src = primarySource(inc);
    var href = (src && src.url) || "";
    var p = el("p", "ava-src");
    if (lang() === "en") {
      p.appendChild(document.createTextNode("Source: Expedition Operators Association Nepal, via "));
      p.appendChild(extLink(href, "The Kathmandu Post"));
      p.appendChild(document.createTextNode(" · Asoj 11 · 10:27 AM"));
    } else {
      p.appendChild(document.createTextNode("स्रोत: एक्स्पिडिसन अपरेटर्स एसोसिएसन नेपाल · "));
      p.appendChild(extLink(href, "काठमाडौं पोस्ट"));
      p.appendChild(document.createTextNode(" · असोज ११ · बिहान १०:२७"));
    }
    return p;
  }
  function ensureLbClose(lb) {
    if (lb.__avaClose) return;
    lb.__avaClose = true;
    function close() {
      lb.hidden = true;
      lb.classList.remove("lb-single");
      document.body.style.overflow = "";
    }
    var x = document.getElementById("lb-close");
    if (x) x.addEventListener("click", close);
    lb.addEventListener("click", function (ev) {
      if (ev.target === lb) close();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !lb.hidden) close();
    });
  }
  function openLetter(e, href, alt) {
    var lb = document.getElementById("lightbox");
    var img = document.getElementById("lb-img");
    if (!lb || !img) return;
    e.preventDefault();
    img.src = href;
    img.alt = alt || "";
    var cap = document.getElementById("lb-cap");
    if (cap) cap.textContent = alt || "";
    lb.hidden = false;
    lb.classList.add("lb-single");
    document.body.style.overflow = "hidden";
    ensureLbClose(lb);
  }

  function renderIncident(inc) {
    var card = el("article", "ava-card");
    var peak = inc.peak || {};
    var dist = inc.district || {};
    var elev = peak.elevation_m != null ? grouped(peak.elevation_m) + (lang() === "en" ? " m" : " मि.") : "";
    var kicker = [tx(dist), tx(peak), elev].filter(Boolean).join(" · ");
    card.appendChild(el("p", "ava-k", kicker));
    card.appendChild(el("h3", "ava-h", tx(inc.headline)));

    var show = (data.render && data.render.show_figures) || [];
    var figs = inc.figures || {};
    if (show.indexOf("unaccounted") >= 0 && figs.unaccounted != null) {
      var kpi = el("div", "ava-kpi");
      kpi.appendChild(el("span", "ava-kpi-n", digits(figs.unaccounted)));
      kpi.appendChild(el("span", "ava-kpi-l", lang() === "en" ? "unaccounted for" : "सम्पर्कविहीन"));
      var chips = el("ul", "ava-chips");
      (figs.breakdown || []).forEach(function (row, i) {
        if (i) chips.appendChild(el("li", "ava-dot", "·"));
        chips.appendChild(el("li", "ava-chip", tx(row.operator) + " " + digits(row.count)));
      });
      kpi.appendChild(chips);
      kpi.appendChild(figureCredit(inc));
      card.appendChild(kpi);
    }

    if (inc.when) card.appendChild(el("p", "ava-when", tx(inc.when)));
    if (inc.summary) card.appendChild(el("p", "ava-sum", tx(inc.summary)));
    if (inc.official_response) card.appendChild(el("p", "ava-resp", tx(inc.official_response)));
    card.appendChild(figureCredit(inc));
    return card;
  }

  function renderAlert(row) {
    var hasImg = !!(row.image && row.image.repo_path);
    var box = el("article", "ava-row" + (hasImg ? "" : " ava-row-plain"));
    if (hasImg) {
      var img = row.image;
      var a = document.createElement("a");
      a.className = "ava-thumb";
      a.href = img.repo_path;
      a.target = "_blank";
      a.rel = "noopener";
      var alt = tx(img.alt);
      var pic = document.createElement("img");
      pic.src = img.repo_path;
      pic.alt = alt;
      pic.width = img.width;
      pic.height = img.height;
      pic.loading = "lazy";
      a.appendChild(pic);
      a.addEventListener("click", function (e) { openLetter(e, img.repo_path, alt); });
      box.appendChild(a);
    }
    var body = el("div", "ava-row-body");
    body.appendChild(el("p", "ava-issuer", tx(row.issuer)));
    body.appendChild(el("h3", "ava-title", tx(row.title)));
    if (row.valid) body.appendChild(el("p", "ava-valid", tx(row.valid)));
    body.appendChild(el("p", "ava-text", tx(row.text)));
    if (row.url && row.label) {
      var link = extLink(row.url, tx(row.label));
      link.className = "ava-link";
      body.appendChild(link);
    }
    box.appendChild(body);
    return box;
  }

  function render() {
    if (!data) return;
    mount.textContent = "";
    (data.incidents || []).forEach(function (inc) {
      if (!inc || inc.status !== "ongoing") return;
      mount.appendChild(renderIncident(inc));
    });

    var alerts = data.official_alerts || [];
    if (alerts.length) {
      mount.appendChild(el("h3", "ava-sub", lang() === "en" ? "Official alerts" : "आधिकारिक चेतावनी"));
      var list = el("div", "ava-alerts");
      alerts.forEach(function (row) { list.appendChild(renderAlert(row)); });
      mount.appendChild(list);
    }

    var season = data.season_context || [];
    if (season.length) {
      mount.appendChild(el("h3", "ava-sub", lang() === "en" ? "Earlier this season" : "यसअघि यो सिजन"));
      var ul = el("ul", "ava-season");
      season.forEach(function (row) {
        var li = el("li");
        var bits = [tx(row.headline), row.when ? tx(row.when) : "", row.status_text ? tx(row.status_text) : ""].filter(Boolean);
        li.appendChild(document.createTextNode(bits.join(" · ")));
        var src = (row.sources || [])[0];
        if (src && src.url) {
          li.appendChild(document.createTextNode(" "));
          var a = extLink(src.url, tx(src.label));
          a.className = "ava-link";
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      mount.appendChild(ul);
    }

    var help = el("p", "ava-help");
    var ha = document.createElement("a");
    ha.href = "contact.html#helpline";
    ha.textContent = lang() === "en" ? "Helpline 1155" : "हेल्पलाइन ११५५";
    help.appendChild(ha);
    mount.appendChild(help);
  }

  function boot() {
    fetch(bust("data/avalanche.json"), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("avalanche"); return r.json(); })
      .then(function (json) { data = json; render(); })
      .catch(function () {});
  }
  boot();
  var lastLang = lang();
  if (typeof MutationObserver === "function") {
    new MutationObserver(function () {
      var now = lang();
      if (now === lastLang) return;
      lastLang = now;
      if (data) render();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if (window.__addLangHook) window.__addLangHook(function () { if (data) render(); });
})();
