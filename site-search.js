/*! Header search — site sections, districts, roads, notices, helplines.
    The names index stays unloaded until someone chooses that result. */
(function () {
  var input = document.getElementById("top-names-q");
  var form = input && input.closest("form");
  if (!input || !form) return;

  var list = null;
  var open = false;
  var active = -1;
  var items = [];
  var catalog = [];
  var rich = false;
  var outsideBound = false;
  var blurTimer = 0;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function en() { return lang() === "en"; }
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[०-९]/g, function (d) { return "0123456789"["०१२३४५६७८९".indexOf(d)]; })
      .replace(/\s+/g, " ")
      .trim();
  }
  function add(row) {
    if (!row || !row.label) return;
    var key = (row.href || "") + "|" + row.label;
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i]._k === key) return;
    }
    row._k = key;
    row.hay = norm((row.label || "") + " " + (row.extra || "") + " " + (row.href || ""));
    catalog.push(row);
  }
  function seed() {
    document.querySelectorAll("#nav-chips a[href], nav.chips a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var label = (a.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) return;
      add({ label: label, href: href, kind: "page" });
    });
    [
      ["index.html", en() ? "Dashboard" : "ड्यासबोर्ड"],
      ["notices.html", en() ? "Notices" : "सूचना"],
      ["notices.html#roads", en() ? "Roads" : "सडक"],
      ["weather.html", en() ? "Weather" : "मौसम"],
      ["photos.html", en() ? "Gallery" : "ग्यालरी"],
      ["contact.html", en() ? "Helpline" : "हेल्पलाइन"]
    ].forEach(function (pair) { add({ label: pair[1], href: pair[0], kind: "page" }); });
    [
      ["1234", en() ? "Rescue helpline" : "उद्धार हेल्पलाइन"],
      ["100", en() ? "Police" : "प्रहरी"],
      ["1148", en() ? "Risk helpline" : "जोखिम हेल्पलाइन"],
      ["1111", en() ? "Nepal Army" : "नेपाली सेना"],
      ["1114", en() ? "Armed Police" : "सशस्त्र प्रहरी"],
      ["102", en() ? "Ambulance" : "एम्बुलेन्स"],
      ["1144", "NEOC"],
      ["1155", en() ? "Flood forecast" : "बाढी पूर्वानुमान"]
    ].forEach(function (pair) {
      add({ label: pair[1] + " " + pair[0], href: "tel:" + pair[0], kind: "tel", extra: pair[0] });
    });
    document.querySelectorAll("main h2").forEach(function (h, i) {
      if (i > 14) return;
      var label = (h.textContent || "").replace(/\s+/g, " ").trim();
      if (!label || label.length > 80) return;
      var id = h.id || (h.parentElement && h.parentElement.id) || "";
      if (!id) return;
      add({ label: label, href: "#" + id, kind: "section" });
    });
  }
  function addRoads(json) {
    var dao = json && json.dao_notice;
    if (!dao) return;
    (dao.provinces || []).forEach(function (p) {
      (p.districts || []).forEach(function (d) {
        var label = en() ? d.en : d.ne;
        if (!label) label = d.ne || d.en;
        if (!label) return;
        add({
          label: label,
          extra: (d.en || "") + " " + (d.ne || "") + " " + (p.en || "") + " " + (p.ne || ""),
          href: "notices.html#roads",
          kind: "road"
        });
      });
    });
    (json.roads || []).forEach(function (s) {
      if (!s) return;
      var name = s.section || s.name;
      var label = "";
      if (name && typeof name === "object") label = en() ? (name.en || name.ne) : (name.ne || name.en);
      var ref = s.ref || s.link || "";
      var dist = s.district ? (en() ? (s.district.en || s.district.ne) : (s.district.ne || s.district.en)) : "";
      if (ref) label = (ref + (label ? " " + label : "")).trim();
      if (!label) return;
      add({
        label: label,
        href: "notices.html#roads",
        kind: "road",
        extra: ref + " " + dist + " " + (s.name && s.name.en || "") + " " + (s.name && s.name.ne || "")
      });
    });
  }
  function addWeather(json) {
    (json && json.provinces || []).forEach(function (p) {
      var label = "";
      if (p.ne || p.en) label = en() ? (p.en || p.ne) : (p.ne || p.en);
      else if (p.name) label = typeof p.name === "object" ? (en() ? (p.name.en || p.name.ne) : (p.name.ne || p.name.en)) : p.name;
      if (!label) return;
      add({
        label: label,
        extra: (p.en || "") + " " + (p.ne || "") + " " + (p.id || ""),
        href: "weather.html",
        kind: "wx"
      });
    });
  }
  function enrich() {
    if (rich) return;
    rich = true;
    var ver = window.PAGE_VER || "";
    function get(url) {
      return fetch(url + "?v=" + encodeURIComponent(ver), { cache: "force-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    Promise.all([get("data/roads-dor.json"), get("data/weather-alert.json")]).then(function (pair) {
      addRoads(pair[0]);
      addWeather(pair[1]);
      if (open) paint();
    });
  }
  function matches(q) {
    if (!q) {
      return catalog.filter(function (row) { return row.kind === "page"; }).slice(0, 4);
    }
    var out = [];
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].hay.indexOf(q) >= 0) out.push(catalog[i]);
      if (out.length >= 8) break;
    }
    return out;
  }
  function ensureList() {
    if (list) return list;
    list = document.createElement("div");
    list.id = "site-results";
    list.className = "site-results";
    list.setAttribute("role", "listbox");
    list.hidden = true;
    document.body.appendChild(list);
    return list;
  }
  function place() {
    if (!list || list.hidden) return;
    var r = input.getBoundingClientRect();
    var gap = 6;
    list.style.left = Math.max(8, r.left) + "px";
    list.style.width = Math.min(r.width, window.innerWidth - 16) + "px";
    list.style.top = Math.round(r.bottom + gap) + "px";
    var room = window.innerHeight - r.bottom - gap - 12;
    list.style.maxHeight = Math.max(160, Math.min(room, 360)) + "px";
  }
  function namesLabel() {
    return en() ? "Search names" : "नाम खोज्नुहोस्";
  }
  function paint() {
    if (document.activeElement !== input) {
      close();
      return;
    }
    ensureList();
    var q = norm(input.value);
    items = matches(q);
    active = items.length ? 0 : -1;
    list.replaceChildren();
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "site-results-empty";
      empty.textContent = en() ? "No matching page." : "मिल्दो पृष्ठ भेटिएन।";
      list.appendChild(empty);
    }
    items.forEach(function (row, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "site-result" + (i === active ? " is-on" : "");
      b.setAttribute("role", "option");
      b.id = "site-opt-" + i;
      b.setAttribute("aria-selected", i === active ? "true" : "false");
      var k = document.createElement("span");
      k.className = "site-result-k";
      k.textContent = kindLabel(row.kind);
      var t = document.createElement("span");
      t.className = "site-result-t";
      t.textContent = row.label;
      b.appendChild(k);
      b.appendChild(t);
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { go(row); });
      list.appendChild(b);
    });
    if (q) {
      var names = document.createElement("button");
      names.type = "button";
      names.className = "site-result site-result-names";
      names.textContent = namesLabel();
      names.addEventListener("pointerdown", function (e) { e.preventDefault(); });
      names.addEventListener("click", openNames);
      list.appendChild(names);
    }
    input.setAttribute("aria-expanded", "true");
    if (active >= 0) input.setAttribute("aria-activedescendant", "site-opt-" + active);
    else input.removeAttribute("aria-activedescendant");
    list.hidden = false;
    open = true;
    place();
    syncClear();
  }
  function kindLabel(kind) {
    if (kind === "tel") return en() ? "Helpline" : "हेल्पलाइन";
    if (kind === "road") return en() ? "Roads" : "सडक";
    if (kind === "wx") return en() ? "Weather" : "मौसम";
    if (kind === "section") return en() ? "Section" : "खण्ड";
    return en() ? "Page" : "पृष्ठ";
  }
  function go(row) {
    close();
    if (!row || !row.href) return;
    if (row.href.indexOf("tel:") === 0) {
      location.href = row.href;
      return;
    }
    if (row.href.charAt(0) === "#") {
      location.hash = row.href;
      var el = document.getElementById(row.href.slice(1));
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
      return;
    }
    location.href = row.href;
  }
  function openNames() {
    var q = input.value || "";
    close();
    if (typeof window.__ensureNamesIndex === "function") {
      window.__ensureNamesIndex(function () {
        if (window.__openNamesSearch) window.__openNamesSearch(q);
      });
      return;
    }
    location.href = "names.html" + (q ? "?q=" + encodeURIComponent(q) : "") + "#search";
  }
  function close() {
    open = false;
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    if (list) list.hidden = true;
  }
  function move(delta) {
    if (!open) paint();
    if (!items.length) return;
    active = (active + delta + items.length) % items.length;
    var nodes = list.querySelectorAll(".site-result[role='option']");
    for (var i = 0; i < nodes.length; i++) {
      var on = i === active;
      nodes[i].classList.toggle("is-on", on);
      nodes[i].setAttribute("aria-selected", on ? "true" : "false");
    }
    input.setAttribute("aria-activedescendant", "site-opt-" + active);
    if (nodes[active] && nodes[active].scrollIntoView) nodes[active].scrollIntoView({ block: "nearest" });
  }
  function syncClear() {
    var btn = form.querySelector(".site-search-clear");
    if (btn) btn.hidden = !input.value;
  }
  function syncPh() {
    var text = en() ? "Search… notices, roads, weather" : "खोज्नुहोस्… सूचना, सडक, मौसम";
    input.setAttribute("placeholder", text);
    input.setAttribute("data-i18n-placeholder", "site_q");
    var clear = form.querySelector(".site-search-clear");
    if (clear) clear.setAttribute("aria-label", en() ? "Clear" : "मेट्नुहोस्");
  }
  function bindOutside() {
    if (outsideBound) return;
    outsideBound = true;
    document.addEventListener("pointerdown", function (e) {
      if (!open) return;
      var t = e.target;
      if (t === input || form.contains(t) || (list && list.contains(t))) return;
      close();
    });
    document.addEventListener("click", function (e) {
      if (!open) return;
      var a = e.target && e.target.closest && e.target.closest("a[href], #nav-toggle, #desk-nav-toggle");
      if (!a || form.contains(a) || (list && list.contains(a))) return;
      close();
    });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", function (e) {
      if (!open) return;
      var t = e.target;
      if (list && (t === list || (t && list.contains && list.contains(t)))) return;
      close();
    }, true);
    window.addEventListener("hashchange", function () { if (open) close(); });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", place);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (open && active >= 0 && items[active]) go(items[active]);
    else if (norm(input.value)) {
      paint();
      if (items[0]) go(items[0]);
    }
  });
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", "site-results");
  input.setAttribute("enterkeyhint", "search");
  if (!form.querySelector(".site-search-icon")) {
    var icon = document.createElement("span");
    icon.className = "site-search-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16.5 20 20.5"/></svg>';
    form.insertBefore(icon, input);
  }
  if (!form.querySelector(".site-search-clear")) {
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "site-search-clear";
    clear.hidden = true;
    clear.textContent = "×";
    clear.addEventListener("pointerdown", function (e) { e.preventDefault(); });
    clear.addEventListener("click", function (e) {
      e.preventDefault();
      input.value = "";
      syncClear();
      input.focus();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    form.appendChild(clear);
  }
  input.addEventListener("focus", function () {
    window.clearTimeout(blurTimer);
    seed();
    enrich();
    bindOutside();
    paint();
  });
  input.addEventListener("blur", function () {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(close, 160);
  });
  input.addEventListener("input", function () {
    seed();
    enrich();
    paint();
  });
  input.addEventListener("search", function () {
    if (!input.value) {
      syncClear();
      paint();
    }
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      go(items[active]);
    }
  });
  syncPh();
  if (window.__addLangHook) {
    window.__addLangHook(function () {
      syncPh();
      catalog = [];
      var again = rich;
      rich = false;
      seed();
      if (again) enrich();
      else if (open) paint();
    });
  }
})();
