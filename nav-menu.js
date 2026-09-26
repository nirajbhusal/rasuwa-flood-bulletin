/*! Header menu — mobile drawer below 900px; horizontal section bar at 900px and up. */
(function () {
  var head = document.querySelector(".head-stick");
  if (head) {
    var syncArt = function () {
      head.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", syncArt, { passive: true });
    syncArt();
  }
  var homeBtn = document.querySelector(".head-home");
  if (homeBtn) {
    var path = location.pathname || "";
    var onHome = /\/$/.test(path) || /\/index\.html$/.test(path);
    if (onHome) {
      homeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      });
    }
  }
  var nav = document.querySelector("nav.chips");
  var btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;

  var root = document.documentElement;
  var body = document.body;
  var inner = document.getElementById("nav-chips") || nav.querySelector(".chips-inner");
  var mq = window.matchMedia("(max-width:760px)");
  var backdrop = document.querySelector(".nav-backdrop");
  var lastFocus = null;
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-backdrop";
    backdrop.setAttribute("aria-label", "मेनु बन्द");
    backdrop.setAttribute("tabindex", "-1");
    body.appendChild(backdrop);
  }

  if (!btn.querySelector(".nav-toggle-label")) {
    var lab = document.createElement("span");
    lab.className = "nav-toggle-label";
    lab.setAttribute("data-i18n", "nav_menu");
    lab.textContent = "मेनु";
    btn.appendChild(lab);
  }

  var deskMq = window.matchMedia("(min-width:900px)");
  function isMobile() { return mq.matches; }
  function isDesk() { return !!(deskMq && deskMq.matches); }
  function en() { return document.documentElement.lang === "en"; }

  function placeToggle() {
    btn.classList.remove("is-floating");
    var find = document.querySelector(".top-find");
    var form = find && find.querySelector("form.top-search");
    if (find && form && btn.parentNode !== find) find.insertBefore(btn, form);
    else if (find && btn.parentNode !== find) find.insertBefore(btn, find.firstChild);
  }

  function floatToggle() {
    placeToggle();
  }

  function clearDeskPos() {
    if (!inner) return;
    inner.style.left = "";
    inner.style.right = "";
    inner.style.top = "";
    inner.style.width = "";
    inner.style.maxHeight = "";
    inner.style.position = "";
    inner.style.zIndex = "";
    inner.style.justifyContent = "";
    inner.style.transform = "";
  }
  function placePanel() {
    if (!inner) return;
    if (isMobile() || !nav.classList.contains("is-open")) {
      clearDeskPos();
      return;
    }
    var r = btn.getBoundingClientRect();
    var width = Math.min(420, Math.max(220, window.innerWidth - 16));
    var left = Math.round(r.left);
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    var top = Math.round(r.bottom + 8);
    var maxH = Math.max(180, Math.min(560, Math.round(window.innerHeight * 0.7), window.innerHeight - top - 12));
    inner.style.position = "fixed";
    inner.style.zIndex = "2000";
    inner.style.left = left + "px";
    inner.style.right = "auto";
    inner.style.top = top + "px";
    inner.style.width = width + "px";
    inner.style.maxHeight = maxH + "px";
    inner.style.justifyContent = "flex-start";
    inner.style.transform = "none";
  }

  function ensureDrawerHead() {
    if (!inner || inner.querySelector(".nav-drawer-head")) return;
    var head = document.createElement("div");
    head.className = "nav-drawer-head";
    var title = document.createElement("span");
    title.className = "nav-drawer-title";
    title.setAttribute("data-i18n", "nav_menu");
    title.textContent = en() ? "Menu" : "मेनु";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "nav-drawer-close";
    closeBtn.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>';
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    head.appendChild(title);
    head.appendChild(closeBtn);
    inner.insertBefore(head, inner.firstChild);
  }

  var GROUPS = [
    { key: "home", ne: "गृह", en: "Home", hrefs: ["index.html"] },
    { key: "alerts", ne: "चेतावनी", en: "Alerts", hrefs: ["notices.html", "notices.html#roads", "electricity.html", "weather.html", "photos.html"] },
    { key: "people", ne: "मानिस", en: "People", hrefs: ["names.html", "contact.html"] },
    { key: "gov", ne: "सरकार", en: "Government", hrefs: ["gov.html", "markets.html"] },
    { key: "relief", ne: "राहत", en: "Relief", hrefs: ["donate.html", "response.html", "damage.html", "supply.html"] },
    { key: "more", ne: "थप", en: "More", hrefs: ["about.html"] }
  ];
  var ICONS = {
    "index.html": "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
    "names.html": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 19c.4-2.4 2.4-4 5-4s4.6 1.6 5 4H3zm10 .1c.3-1.6 1.4-2.9 3-3.6 1.6.4 2.8 1.5 3.2 3.5H13z",
    "donate.html": "M12 21s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z",
    "notices.html": "M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 1.5V9h4.5",
    "notices.html#roads": "M4 17h16M6 17V8l6-3 6 3v9",
    "weather.html": "M7 16h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1.5A3 3 0 0 0 7 16z",
    "contact.html": "M7 3h3l1.5 4-2 1.2a12 12 0 0 0 6.3 6.3L17 13l4 1.5V18a2 2 0 0 1-2.2 2A16 16 0 0 1 4 6.2 2 2 0 0 1 6 4z",
    "gov.html": "M4 10h16M6 10V20M10 10V20M14 10V20M18 10V20M3 20h18M12 3 3 9h18z",
    "markets.html": "M4 18V6M4 18h16M8 18V10M12 18V8M16 18v-5",
    "response.html": "M12 3 4 7v5c0 4.5 3.2 7.4 8 9 4.8-1.6 8-4.5 8-9V7z",
    "photos.html": "M4 7h3l2-2h6l2 2h3v12H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "damage.html": "M12 3 2 20h20L12 3zm0 6v5m0 3h.01",
    "supply.html": "M8 7h8l1 3H7zm-2 3h12v9H6z",
    "electricity.html": "M13 2 4 14h7l-1 8 9-12h-7z",
    "about.html": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-8h.01"
  };

  function byHref(href) {
    if (!inner) return null;
    var found = null;
    inner.querySelectorAll("a[href]").forEach(function (a) {
      if (!found && a.getAttribute("href") === href) found = a;
    });
    return found;
  }
  function makeLink(href, key, text) {
    var a = document.createElement("a");
    a.href = href;
    a.setAttribute("data-i18n", key);
    a.textContent = text;
    return a;
  }
  function iconFor(a) {
    var href = a.getAttribute("href") || "";
    if (a.querySelector("svg.nav-ico, svg")) return;
    var d = ICONS[href] || ICONS[href.split("#")[0]] || "M6 12h12";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "nav-ico");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
    a.insertBefore(svg, a.firstChild);
  }
  function splitLabel(a) {
    if (a.querySelector("[data-i18n]")) return;
    if (!a.hasAttribute("data-i18n")) return;
    var key = a.getAttribute("data-i18n");
    var span = document.createElement("span");
    span.setAttribute("data-i18n", key);
    span.textContent = (a.textContent || "").replace(/\s+/g, " ").trim();
    a.removeAttribute("data-i18n");
    Array.prototype.slice.call(a.childNodes).forEach(function (n) {
      if (n.nodeType === 3) a.removeChild(n);
    });
    a.appendChild(span);
  }
  function paintGroups() {
    if (!inner) return;
    inner.querySelectorAll(".nav-group").forEach(function (g) {
      g.textContent = en() ? g.getAttribute("data-en") : g.getAttribute("data-ne");
    });
    var title = inner.querySelector(".nav-drawer-title");
    if (title && !(window.I18N && window.t)) title.textContent = en() ? "Menu" : "मेनु";
    var x = inner.querySelector(".nav-drawer-close");
    if (x) x.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
    backdrop.setAttribute("aria-label", en() ? "Close menu" : "मेनु बन्द");
  }
  function groupLinks() {
    if (!inner || inner.getAttribute("data-grouped") === "1") {
      paintGroups();
      return;
    }
    if (!byHref("notices.html#roads")) {
      var roads = makeLink("notices.html#roads", "nav_roads", "सडक");
      var notices = byHref("notices.html");
      if (notices && notices.nextSibling) inner.insertBefore(roads, notices.nextSibling);
      else inner.appendChild(roads);
    }
    if (!byHref("electricity.html")) {
      var elec = makeLink("electricity.html", "nav_electricity", "बिजुली");
      var afterRoads = byHref("notices.html#roads") || byHref("notices.html");
      if (afterRoads && afterRoads.nextSibling) inner.insertBefore(elec, afterRoads.nextSibling);
      else inner.appendChild(elec);
    }
    if (!byHref("markets.html")) {
      var markets = makeLink("markets.html", "nav_markets", "पुँजी बजार");
      var gov = byHref("gov.html");
      if (gov && gov.nextSibling) inner.insertBefore(markets, gov.nextSibling);
      else inner.appendChild(markets);
    }
    var head = inner.querySelector(".nav-drawer-head");
    GROUPS.forEach(function (g) {
      var label = document.createElement("p");
      label.className = "nav-group";
      label.setAttribute("data-ne", g.ne);
      label.setAttribute("data-en", g.en);
      label.textContent = g.ne;
      inner.appendChild(label);
      g.hrefs.forEach(function (href) {
        var a = byHref(href);
        if (!a) return;
        splitLabel(a);
        iconFor(a);
        inner.appendChild(a);
      });
    });
    if (head) inner.insertBefore(head, inner.firstChild);
    inner.querySelectorAll("a[href]").forEach(function (a) {
      if (a.parentNode === inner) {
        splitLabel(a);
        iconFor(a);
      }
    });
    inner.setAttribute("data-grouped", "1");
    paintGroups();
    markCurrent();
  }

  function portalOut() {
    if (!inner || inner.parentNode === body) return;
    ensureDrawerHead();
    groupLinks();
    inner.classList.add("nav-drawer-panel");
    clearDeskPos();
    body.appendChild(inner);
  }
  function portalIn() {
    if (!inner) return;
    inner.classList.remove("nav-drawer-panel");
    if (inner.parentNode !== nav) nav.appendChild(inner);
  }
  function syncStick() {
    var h = document.querySelector(".head-stick");
    if (!h) return;
    root.style.setProperty("--stick", h.offsetHeight + "px");
  }
  function focusEl(node) {
    if (!node || !node.focus) return;
    try { node.focus({ preventScroll: true }); } catch (e) { try { node.focus(); } catch (e2) {} }
  }
  function focusables() {
    var host = inner;
    var nodes = host ? host.querySelectorAll("a[href], button") : [];
    var list = [];
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.disabled || node.getAttribute("aria-hidden") === "true") return;
      var rect = node.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) return;
      list.push(node);
    });
    if (btn && list.indexOf(btn) < 0) list.unshift(btn);
    return list;
  }
  function setOpen(on) {
    if (isDesk()) on = false;
    on = !!on;
    var mobile = isMobile();
    nav.classList.toggle("is-open", on);
    root.classList.toggle("nav-drawer-open", on && mobile);
    body.classList.toggle("nav-drawer-open", on && mobile);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) {
      lastFocus = document.activeElement;
      groupLinks();
      if (mobile) {
        portalOut();
        body.style.overflow = "hidden";
        floatToggle(true);
      } else {
        portalIn();
        body.style.overflow = "";
        floatToggle(false);
        placePanel();
        if (inner) inner.scrollTop = 0;
      }
      var first = inner && inner.querySelector("a[href]");
      focusEl(first || btn);
    } else {
      portalIn();
      floatToggle(false);
      body.style.overflow = "";
      var back = lastFocus && lastFocus !== document.body ? lastFocus : btn;
      lastFocus = null;
      focusEl(back);
    }
  }
  function close() { setOpen(false); }
  function toggle() { setOpen(!nav.classList.contains("is-open")); }

  btn.addEventListener("click", function (e) {
    if (isDesk()) return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });
  backdrop.addEventListener("click", function (e) {
    e.preventDefault();
    close();
  });
  document.addEventListener("click", function (e) {
    if (!nav.classList.contains("is-open") || isMobile()) return;
    var t = e.target;
    if (!t) return;
    if (t === btn || btn.contains(t)) return;
    if (inner && inner.contains(t)) return;
    close();
  });
  if (inner) {
    inner.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a");
      if (!a) return;
      setTimeout(close, 50);
    });
  }
  window.addEventListener("pagehide", function () {
    if (nav.classList.contains("is-open")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (!nav.classList.contains("is-open")) return;
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    var list = focusables();
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

  function markCurrent() {
    try {
      var file = (location.pathname || "").split("/").pop() || "index.html";
      if (!file) file = "index.html";
      var hash = location.hash || "";
      var host = inner || nav;
      if (!host) return;
      host.querySelectorAll("a[href]").forEach(function (a) {
        a.classList.remove("is-current");
        a.removeAttribute("aria-current");
        var href = a.getAttribute("href") || "";
        var base = href.split("#")[0].split("/").pop();
        var frag = href.indexOf("#") >= 0 ? "#" + href.split("#")[1] : "";
        var same = base === file || (file === "index.html" && (base === "index.html" || base === ""));
        if (!same) return;
        if (file === "notices.html" && hash === "#roads") {
          if (frag !== "#roads") return;
        } else if (frag && frag !== hash) return;
        a.classList.add("is-current");
        a.setAttribute("aria-current", "page");
      });
    } catch (e) {}
  }

  function onViewportChange() {
    if (isDesk()) {
      if (nav.classList.contains("is-open")) close();
      ensureDeskNav();
      layoutDeskNav();
      syncStick();
      return;
    }
    if (nav.classList.contains("is-open")) {
      if (isMobile()) {
        portalOut();
        root.classList.add("nav-drawer-open");
        body.classList.add("nav-drawer-open");
        body.style.overflow = "hidden";
        floatToggle(true);
      } else {
        portalIn();
        root.classList.remove("nav-drawer-open");
        body.classList.remove("nav-drawer-open");
        body.style.overflow = "";
        floatToggle(false);
        placePanel();
      }
    } else placeToggle();
    syncStick();
  }
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", onViewportChange);
  else if (typeof mq.addListener === "function") mq.addListener(onViewportChange);
  if (typeof deskMq.addEventListener === "function") deskMq.addEventListener("change", onViewportChange);
  else if (typeof deskMq.addListener === "function") deskMq.addListener(onViewportChange);
  window.addEventListener("resize", function () {
    syncStick();
    if (isDesk()) layoutDeskNav();
    else placePanel();
  });
  window.addEventListener("scroll", function () {
    if (nav.classList.contains("is-open") && !isMobile()) placePanel();
    queueDeskSpy();
  }, { passive: true });
  window.addEventListener("hashchange", function () {
    markCurrent();
    paintDeskCurrent();
  });

  /* Desktop tabs follow the grouped menu order. Short labels are the same
     sections, trimmed so the bar stays one row; overflow goes under थप / More. */
  var SHORT = {
    "index.html": { ne: "ड्यासबोर्ड", en: "Dashboard" },
    "notices.html": { ne: "सूचना", en: "Notices" },
    "notices.html#roads": { ne: "सडक", en: "Roads" },
    "electricity.html": { ne: "बिजुली", en: "Electricity" },
    "weather.html": { ne: "मौसम", en: "Weather" },
    "photos.html": { ne: "ग्यालरी", en: "Gallery" },
    "names.html": { ne: "नामावली", en: "Names" },
    "contact.html": { ne: "हेल्पलाइन", en: "Helpline" },
    "gov.html": { ne: "सरकार", en: "Government" },
    "markets.html": { ne: "बजार", en: "Markets" },
    "donate.html": { ne: "राहत", en: "Relief" },
    "response.html": { ne: "प्रतिक्रिया", en: "Response" },
    "damage.html": { ne: "क्षति", en: "Damage" },
    "supply.html": { ne: "एलपीजी", en: "LPG" },
    "about.html": { ne: "बारेमा", en: "About" }
  };
  /* Homepage blocks that already mirror a menu page. Missing ids stay page links. */
  var SECTION = {
    "index.html": "home",
    "weather.html": "wx-home",
    "notices.html#roads": "cat-roads",
    "electricity.html": "cat-electricity",
    "response.html": "home-response",
    "donate.html": "cat-rahat",
    "supply.html": "cat-supply",
    "markets.html": "cat-markets",
    "damage.html": "cat-infographics",
    "gov.html": "cat-gov"
  };
  var deskBar = null;
  var deskTabsHost = null;
  var deskMore = null;
  var deskMoreBtn = null;
  var deskMenu = null;
  var deskTabs = [];
  var spyTick = 0;
  var deskLaying = false;

  function fitTabs(widths, container, moreWidth, gap) {
    gap = gap || 0;
    var n = widths.length;
    function used(count, withMore) {
      var w = 0;
      var i;
      for (i = 0; i < count; i++) w += widths[i];
      if (count > 1) w += gap * (count - 1);
      if (withMore) w += moreWidth;
      return w;
    }
    if (used(n, false) <= container + 0.5) return n;
    var count = n;
    while (count > 0 && used(count, true) > container + 0.5) count -= 1;
    return count;
  }

  function onHomePage() {
    var path = location.pathname || "";
    return /\/$/.test(path) || /\/index\.html$/.test(path);
  }
  function tabIsCurrent(href) {
    var file = (location.pathname || "").split("/").pop() || "index.html";
    if (!file) file = "index.html";
    var hash = location.hash || "";
    href = href || "";
    var base = href.split("#")[0].split("/").pop();
    var frag = href.indexOf("#") >= 0 ? "#" + href.split("#")[1] : "";
    var same = base === file || ((file === "index.html" || file === "") && (base === "index.html" || base === ""));
    if (!same) return false;
    if (file === "notices.html" && hash === "#roads") return frag === "#roads";
    if (frag && frag !== hash) return false;
    return true;
  }
  function shortText(href) {
    var s = SHORT[href];
    if (!s) return "";
    return en() ? s.en : s.ne;
  }
  function cloneDeskIcon(a) {
    var svg = a.querySelector("svg");
    var node;
    if (svg) {
      node = svg.cloneNode(true);
    } else {
      var href = a.getAttribute("href") || "";
      var d = ICONS[href] || ICONS[href.split("#")[0]] || "M6 12h12";
      node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      node.setAttribute("viewBox", "0 0 24 24");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-linecap", "round");
      node.appendChild(path);
    }
    node.setAttribute("class", "hnav-ico");
    node.setAttribute("width", "16");
    node.setAttribute("height", "16");
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("focusable", "false");
    return node;
  }
  function deskSection(href) {
    if (!onHomePage()) return "";
    var id = SECTION[href];
    if (!id || !document.getElementById(id)) return "";
    return id;
  }
  function paintDeskLabels() {
    if (!deskBar) return;
    deskTabs.forEach(function (tab) {
      var href = tab.getAttribute("data-href") || "";
      var lab = tab.querySelector(".hnav-lab");
      var text = shortText(href);
      if (lab && text) lab.textContent = text;
    });
    var moreLab = deskMoreBtn && deskMoreBtn.querySelector(".hnav-lab");
    if (moreLab) moreLab.textContent = en() ? "More" : "थप";
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-label", en() ? "More" : "थप");
    deskBar.setAttribute("aria-label", en() ? "Sections" : "खण्डहरू");
  }
  function spyPick() {
    var stick = head ? head.offsetHeight : 0;
    var best = null;
    var bestTop = -1e9;
    deskTabs.forEach(function (tab) {
      var id = tab.getAttribute("data-section") || "";
      if (!id || id === "home") return;
      var el = document.getElementById(id);
      if (!el) return;
      var top = el.getBoundingClientRect().top;
      if (top <= stick + 12 && top > bestTop) {
        best = tab;
        bestTop = top;
      }
    });
    if (best) return best;
    var i;
    for (i = 0; i < deskTabs.length; i++) {
      if ((deskTabs[i].getAttribute("data-href") || "") === "index.html") return deskTabs[i];
    }
    return null;
  }
  function paintDeskCurrent() {
    if (!deskBar) return;
    var current = null;
    var mode = "page";
    if (onHomePage() && isDesk()) {
      current = spyPick();
      if (current && (current.getAttribute("data-section") || "") && current.getAttribute("data-section") !== "home") mode = "location";
    } else {
      var i;
      for (i = 0; i < deskTabs.length; i++) {
        if (tabIsCurrent(deskTabs[i].getAttribute("data-href") || "")) {
          current = deskTabs[i];
          break;
        }
      }
    }
    deskTabs.forEach(function (tab) {
      var on = tab === current;
      tab.classList.toggle("is-current", on);
      if (on) tab.setAttribute("aria-current", mode);
      else tab.removeAttribute("aria-current");
    });
    var inMore = !!(current && deskMenu && deskMenu.contains(current));
    if (deskMoreBtn) {
      deskMoreBtn.classList.toggle("is-current", inMore);
      if (inMore) deskMoreBtn.setAttribute("aria-current", "true");
      else deskMoreBtn.removeAttribute("aria-current");
    }
  }
  function queueDeskSpy() {
    if (!isDesk() || !deskBar) return;
    if (spyTick) return;
    spyTick = window.requestAnimationFrame(function () {
      spyTick = 0;
      paintDeskCurrent();
    });
  }
  function closeDeskMore() {
    if (!deskMenu) return;
    deskMenu.hidden = true;
    if (deskMore) deskMore.classList.remove("is-open");
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-expanded", "false");
  }
  function openDeskMore() {
    if (!deskMenu || !deskMenu.children.length) return;
    deskMenu.hidden = false;
    if (deskMore) deskMore.classList.add("is-open");
    if (deskMoreBtn) deskMoreBtn.setAttribute("aria-expanded", "true");
    var first = deskMenu.querySelector("a.hnav-tab");
    focusEl(first || deskMoreBtn);
  }
  function scrollDeskSection(id) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var behavior = reduce ? "auto" : "smooth";
    if (!id || id === "home") {
      window.scrollTo({ top: 0, behavior: behavior });
      return;
    }
    var el = document.getElementById(id);
    if (!el) return;
    var stick = head ? head.offsetHeight : 0;
    var top = el.getBoundingClientRect().top + window.scrollY - stick - 6;
    window.scrollTo({ top: Math.max(0, top), behavior: behavior });
  }
  function onDeskTabClick(e) {
    var tab = e.currentTarget;
    if (!tab || !isDesk()) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var id = tab.getAttribute("data-section") || "";
    if (!id) {
      closeDeskMore();
      return;
    }
    e.preventDefault();
    closeDeskMore();
    scrollDeskSection(id);
    try {
      var next = id === "home" ? location.pathname + location.search : "#" + id;
      history.replaceState(null, "", next);
    } catch (err) {}
    paintDeskCurrent();
  }
  function layoutDeskNav() {
    if (deskLaying || !deskBar || !isDesk() || !deskTabsHost) return;
    if (deskTabsHost.clientWidth < 20) return;
    deskLaying = true;
    try {
    closeDeskMore();
    deskTabs.forEach(function (tab) {
      tab.removeAttribute("role");
      deskTabsHost.appendChild(tab);
    });
    if (deskMore) deskMore.hidden = true;
    var full = deskTabsHost.clientWidth;
    var widths = deskTabs.map(function (tab) { return tab.getBoundingClientRect().width; });
    var moreW = 0;
    if (deskMore) {
      deskMore.hidden = false;
      moreW = deskMore.getBoundingClientRect().width || 0;
      deskMore.hidden = true;
    }
    var count = fitTabs(widths, full, moreW, 2);
    var i;
    if (count >= deskTabs.length) {
      if (deskMore) deskMore.hidden = true;
    } else {
      if (deskMore) deskMore.hidden = false;
      for (i = deskTabs.length - 1; i >= count; i--) {
        deskTabs[i].setAttribute("role", "menuitem");
        deskMenu.insertBefore(deskTabs[i], deskMenu.firstChild);
      }
    }
    paintDeskCurrent();
    } finally {
      deskLaying = false;
    }
  }
  function ensureDeskNav() {
    if (deskBar || !inner) return;
    groupLinks();
    var bar = document.createElement("nav");
    bar.className = "hnav";
    bar.setAttribute("aria-label", "खण्डहरू");
    bar.setAttribute("data-i18n-aria", "nav_sections");
    bar.style.display = "none";
    var wrap = document.createElement("div");
    wrap.className = "hnav-inner";
    var row = document.createElement("div");
    row.className = "hnav-row";
    var host = document.createElement("div");
    host.className = "hnav-tabs";
    var more = document.createElement("div");
    more.className = "hnav-more";
    more.hidden = true;
    var moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "hnav-more-btn";
    moreBtn.setAttribute("aria-expanded", "false");
    moreBtn.setAttribute("aria-haspopup", "true");
    moreBtn.setAttribute("aria-controls", "hnav-more-menu");
    moreBtn.setAttribute("aria-label", "थप");
    var moreIco = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    moreIco.setAttribute("class", "hnav-ico");
    moreIco.setAttribute("viewBox", "0 0 24 24");
    moreIco.setAttribute("width", "16");
    moreIco.setAttribute("height", "16");
    moreIco.setAttribute("aria-hidden", "true");
    moreIco.setAttribute("focusable", "false");
    var morePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    morePath.setAttribute("d", "M5 12h.01M12 12h.01M18 12h.01");
    morePath.setAttribute("fill", "none");
    morePath.setAttribute("stroke", "currentColor");
    morePath.setAttribute("stroke-width", "2.6");
    morePath.setAttribute("stroke-linecap", "round");
    moreIco.appendChild(morePath);
    var moreLab = document.createElement("span");
    moreLab.className = "hnav-lab";
    moreLab.textContent = "थप";
    var caret = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    caret.setAttribute("class", "hnav-caret");
    caret.setAttribute("viewBox", "0 0 24 24");
    caret.setAttribute("width", "14");
    caret.setAttribute("height", "14");
    caret.setAttribute("aria-hidden", "true");
    caret.setAttribute("focusable", "false");
    var caretPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    caretPath.setAttribute("d", "M6 9l6 6 6-6");
    caretPath.setAttribute("fill", "none");
    caretPath.setAttribute("stroke", "currentColor");
    caretPath.setAttribute("stroke-width", "2");
    caretPath.setAttribute("stroke-linecap", "round");
    caretPath.setAttribute("stroke-linejoin", "round");
    caret.appendChild(caretPath);
    moreBtn.appendChild(moreIco);
    moreBtn.appendChild(moreLab);
    moreBtn.appendChild(caret);
    var menu = document.createElement("div");
    menu.className = "hnav-menu";
    menu.id = "hnav-more-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    more.appendChild(moreBtn);
    more.appendChild(menu);
    row.appendChild(host);
    row.appendChild(more);
    wrap.appendChild(row);
    bar.appendChild(wrap);
    if (nav.parentNode) nav.parentNode.insertBefore(bar, nav);
    else document.body.appendChild(bar);

    var links = inner.querySelectorAll("a[href]");
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;
      var tab = document.createElement("a");
      tab.className = "hnav-tab";
      tab.setAttribute("data-href", href);
      var section = deskSection(href);
      if (section) {
        tab.setAttribute("data-section", section);
        tab.href = section === "home" ? "#home" : "#" + section;
      } else {
        tab.href = href;
      }
      tab.style.flex = "none";
      tab.style.whiteSpace = "nowrap";
      tab.appendChild(cloneDeskIcon(a));
      var lab = document.createElement("span");
      lab.className = "hnav-lab";
      lab.textContent = shortText(href) || (a.textContent || "").replace(/\s+/g, " ").trim();
      tab.appendChild(lab);
      tab.addEventListener("click", onDeskTabClick);
      host.appendChild(tab);
      deskTabs.push(tab);
    });

    moreBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (menu.hidden) openDeskMore();
      else closeDeskMore();
    });
    document.addEventListener("click", function (e) {
      if (!deskMenu || deskMenu.hidden) return;
      var t = e.target;
      if (t && deskMore && deskMore.contains(t)) return;
      closeDeskMore();
    });
    document.addEventListener("keydown", function (e) {
      if (!deskMenu || deskMenu.hidden) return;
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        closeDeskMore();
        focusEl(deskMoreBtn);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      var items = deskMenu.querySelectorAll("a.hnav-tab");
      if (!items.length) return;
      e.preventDefault();
      var i = Array.prototype.indexOf.call(items, document.activeElement);
      if (e.key === "Home") i = 0;
      else if (e.key === "End") i = items.length - 1;
      else if (e.key === "ArrowDown") i = i < 0 ? 0 : Math.min(items.length - 1, i + 1);
      else i = i < 0 ? items.length - 1 : Math.max(0, i - 1);
      focusEl(items[i]);
    });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (isDesk()) layoutDeskNav();
      });
      ro.observe(row);
    }

    deskBar = bar;
    deskTabsHost = host;
    deskMore = more;
    deskMoreBtn = moreBtn;
    deskMenu = menu;
    paintDeskLabels();
    layoutDeskNav();
    paintDeskCurrent();
  }

  placeToggle();
  groupLinks();
  markCurrent();
  ensureDeskNav();
  layoutDeskNav();
  syncStick();
  window.addEventListener("load", function () {
    syncStick();
    if (isDesk()) layoutDeskNav();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (isDesk()) {
        layoutDeskNav();
        syncStick();
      }
    });
  }
  if (window.__addLangHook) {
    window.__addLangHook(function () {
      paintGroups();
      paintDeskLabels();
      window.requestAnimationFrame(function () {
        layoutDeskNav();
        syncStick();
      });
    });
  }
})();
