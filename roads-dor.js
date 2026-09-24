/*! Rasuwa flood bulletin · DoR NAVIGATE road status · driven by data/roads-dor.json */
(function () {
  var mounts = document.querySelectorAll("[data-dor-mount]");
  if (!mounts.length) return;

  var data = null;
  var VER = window.PAGE_VER || "2026-09-24-weather-12297";
  var DIGITS = { "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९" };

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "ne";
  }
  function tx(node) {
    if (node == null) return "";
    if (typeof node === "string") return node;
    var l = lang();
    if (node[l] != null) return node[l];
    return node.ne || node.en || "";
  }
  function num(n) {
    var s = String(n);
    if (lang() !== "ne") return s;
    return s.replace(/[0-9]/g, function (d) { return DIGITS[d]; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function roadById(id) {
    var list = (data && data.roads) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function inList(road, name) {
    return road.lists && road.lists.indexOf(name) !== -1;
  }
  function when(field) {
    if (!field) return "";
    return tx(field);
  }
  function telify(parent, text) {
    var re = /(\+?\d[\d\-]{6,}\d)/g;
    var last = 0;
    var m;
    var found = false;
    while ((m = re.exec(text))) {
      found = true;
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = "tel:" + m[1].replace(/[^\d+]/g, "");
      a.textContent = lang() === "ne" ? num(m[1]) : m[1];
      parent.appendChild(a);
      last = m.index + m[1].length;
    }
    if (!found) parent.appendChild(document.createTextNode(text));
    else if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function chips(host) {
    var c = data.counts || {};
    var ui = data.ui;
    var row = el("ul", "dor-chips");
    [["total", c.total, "dor-chip-total"], ["closed", c.closed, "dor-chip-closed"], ["opened", c.opened, "dor-chip-open"], ["partial", c.partial, "dor-chip-part"]].forEach(function (item) {
      var li = el("li", "dor-chip " + item[2]);
      li.appendChild(el("span", "dor-chip-k", tx(ui[item[0]])));
      li.appendChild(el("strong", "dor-chip-n", num(item[1])));
      row.appendChild(li);
    });
    host.appendChild(row);
  }
  function priority(host) {
    var road = roadById(data.priority_id);
    if (!road) return;
    var ui = data.ui;
    var box = el("div", "dor-priority");
    var top = el("p", "dor-pri-top");
    top.appendChild(el("span", "dor-pill dor-pill-closed", tx(ui.closed)));
    top.appendChild(el("strong", null, road.ref));
    box.appendChild(top);
    box.appendChild(el("p", "dor-pri-name", tx(road.name)));
    box.appendChild(el("p", "dor-pri-why", tx(road.reason)));
    var meta = el("p", "dor-pri-meta");
    meta.textContent = tx(ui.closed_on) + " " + when(road.closed) + " · " + tx(ui.corridor);
    box.appendChild(meta);
    host.appendChild(box);
  }
  function links(host, withSection) {
    var ui = data.ui;
    var p = el("p", "dor-links");
    if (withSection) {
      var more = document.createElement("a");
      more.href = data.source.section;
      more.textContent = tx(ui.more);
      p.appendChild(more);
      p.appendChild(document.createTextNode(" · "));
    }
    var ext = document.createElement("a");
    ext.href = data.source.url;
    ext.target = "_blank";
    ext.rel = "noopener";
    ext.textContent = tx(ui.dor);
    p.appendChild(ext);
    host.appendChild(p);
  }
  function row(road) {
    var ui = data.ui;
    var li = el("li", "dor-row dor-row-" + road.status);
    var head = el("p", "dor-row-h");
    head.appendChild(el("span", "dor-pill dor-pill-" + road.status, tx(ui[road.status] || road.status)));
    head.appendChild(el("strong", null, road.ref + (road.link ? " · " + road.link : "")));
    li.appendChild(head);
    li.appendChild(el("p", "dor-row-name", tx(road.name)));
    li.appendChild(el("p", "dor-row-sec", tx(ui.section_h) + ": " + tx(road.section)));
    li.appendChild(el("p", "dor-row-why", tx(road.reason)));
    var times = [];
    if (road.closed) times.push(tx(ui.closed_on) + " " + when(road.closed));
    if (road.opened) times.push(tx(ui.opened_on) + " " + when(road.opened));
    if (road.estimate && road.status !== "opened") times.push(tx(ui.estimate) + " " + when(road.estimate));
    if (times.length) li.appendChild(el("p", "dor-row-time", times.join(" · ")));
    var place = el("p", "dor-row-place", tx(ui.place) + ": " + tx(road.place) + " · " + tx(road.district));
    li.appendChild(place);
    if (road.contact) {
      var cp = el("p", "dor-row-contact");
      cp.appendChild(document.createTextNode(tx(ui.contact) + ": "));
      telify(cp, road.contact);
      li.appendChild(cp);
    }
    if (road.note) li.appendChild(el("p", "dor-row-note", tx(road.note)));
    return li;
  }
  function group(host, key, heading) {
    var items = (data.roads || []).filter(function (r) { return inList(r, key); });
    if (!items.length) return;
    host.appendChild(el("h3", "dor-gh", tx(heading)));
    var ul = el("ul", "dor-list");
    items.forEach(function (r) { ul.appendChild(row(r)); });
    host.appendChild(ul);
  }
  function renderMount(root) {
    var mode = root.getAttribute("data-dor-mode") || "home";
    var ui = data.ui;
    root.replaceChildren();
    var board = el("article", "dor" + (mode === "section" ? " dor-section" : " dor-home"));
    var head = el("header", "dor-head");
    head.appendChild(el("p", "dor-kicker", tx(ui.kicker)));
    head.appendChild(el("p", "dor-asof", tx(ui.asof) + " " + tx(data.as_of)));
    board.appendChild(head);
    var title = el(mode === "section" ? "h2" : "h2", "dor-title", tx(ui.title));
    board.appendChild(title);
    chips(board);
    priority(board);
    if (mode === "home") {
      board.appendChild(el("p", "dor-also", tx(ui.also)));
      board.appendChild(el("p", "dor-disc", tx(ui.disclaimer) + " " + tx(ui.check)));
      links(board, true);
    } else {
      board.appendChild(el("p", "dor-call", tx(ui.nh17)));
      board.appendChild(el("p", "dor-count", tx(ui.count_note)));
      board.appendChild(el("p", "dor-disc", tx(ui.disclaimer) + " " + tx(ui.check)));
      links(board, false);
      group(board, "closed", ui.g_closed);
      group(board, "partial", ui.g_partial);
      group(board, "opened", ui.g_opened);
      group(board, "ticker", ui.g_ticker);
    }
    root.appendChild(board);
  }
  function renderAll() {
    if (!data) return;
    mounts.forEach(renderMount);
  }
  function boot() {
    fetch("data/roads-dor.json?v=" + encodeURIComponent(VER), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("roads"); return r.json(); })
      .then(function (json) {
        data = json;
        renderAll();
        if (window.__addLangHook) window.__addLangHook(renderAll);
      })
      .catch(function () {
        mounts.forEach(function (m) { m.classList.add("dor-fallback"); });
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
