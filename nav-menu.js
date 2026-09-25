/*! Header menu — one row with the brand, desktop panel, mobile drawer. */
(function () {
  var head = document.querySelector(".head-stick");
  if (head) {
    var syncArt = function () {
      head.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", syncArt, { passive: true });
    syncArt();
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

  function isMobile() { return mq.matches; }
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

  function placePanel() {
    if (!inner) return;
    if (isMobile() || !nav.classList.contains("is-open")) {
      inner.style.left = "";
      inner.style.right = "";
      inner.style.top = "";
      return;
    }
    var r = btn.getBoundingClientRect();
    var host = nav.getBoundingClientRect();
    var left = Math.max(8, Math.round(r.left - host.left));
    inner.style.left = left + "px";
    inner.style.right = "auto";
    inner.style.top = "8px";
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
    { key: "alerts", ne: "चेतावनी", en: "Alerts", hrefs: ["notices.html", "notices.html#roads", "weather.html", "photos.html"] },
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
    inner.style.left = "";
    inner.style.right = "";
    inner.style.top = "";
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
    if (e.key !== "Tab" || !isMobile()) return;
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
  window.addEventListener("resize", function () {
    syncStick();
    placePanel();
  });

  placeToggle();
  groupLinks();
  markCurrent();
  syncStick();
  window.addEventListener("load", syncStick);
  if (window.__addLangHook) {
    window.__addLangHook(function () {
      paintGroups();
      window.requestAnimationFrame(syncStick);
    });
  }
})();
