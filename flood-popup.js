/*! NDRRMA special flood alert card. Separate from open-alert.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FloodPopup = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var HOUR = 60 * 60 * 1000;
  var PREFIX = "ndrrmaFloodPopup:";

  function storageKey(id) {
    return PREFIX + String(id || "");
  }

  function shouldShow(alert, nowMs, closedAt) {
    if (!alert || alert.active !== true || alert.popup !== true) return false;
    if (closedAt == null || closedAt === "") return true;
    var closed = Number(closedAt);
    if (!isFinite(closed)) return true;
    return nowMs - closed >= HOUR;
  }

  function issuedMs(alert) {
    var t = Date.parse(alert && alert.issued_npt || "");
    return isFinite(t) ? t : 0;
  }

  function newestPopup(doc) {
    var rows = ((doc && doc.alerts) || []).filter(function (alert) {
      return alert && alert.active === true && alert.popup === true;
    });
    rows.sort(function (a, b) { return issuedMs(b) - issuedMs(a); });
    return rows[0] || null;
  }

  function present(alert) {
    if (!alert) return null;
    var action = (alert.actions && alert.actions[0]) || null;
    var names = [];
    var districts = alert.districts || [];
    var levels = [];
    var i;
    for (i = 0; i < districts.length; i++) {
      if (districts[i] && districts[i].en) names.push(districts[i].en);
    }
    function pushLevel(label, value, approx) {
      var v;
      var shown;
      if (!label || value == null || value === "") return;
      v = Number(value);
      if (!isFinite(v)) return;
      shown = approx || Math.abs(v - Math.round(v)) > 1e-9 ? v.toFixed(1) : String(Math.round(v));
      levels.push(label + " " + (approx ? "~" : "") + shown + " m");
    }
    pushLevel(alert.popup_current_label, alert.current_m, false);
    pushLevel(alert.popup_danger_label, alert.danger_m, false);
    pushLevel(alert.popup_peak_label, alert.expected_peak_m, alert.popup_peak_approx === true);
    return {
      headlineNe: alert.popup_headline_ne || "",
      headlineEn: alert.popup_headline_en || "",
      levels: levels.join(" / "),
      districts: names.join(", "),
      action: action && action.ne && action.en ? action.ne + " / " + action.en : "",
      detailsLabel: alert.popup_details_label || "",
      href: alert.popup_href || "",
      closeLabel: alert.popup_close_label || "",
      image: alert.image || ""
    };
  }

  function readClosed(key) {
    try { return window.localStorage.getItem(key); } catch (err) { return null; }
  }

  function writeClosed(key) {
    try { window.localStorage.setItem(key, String(Date.now())); } catch (err) {}
  }

  function pageName() {
    var path = "";
    try { path = window.location.pathname || ""; } catch (err) { path = ""; }
    var name = path.split("/").pop() || "";
    return name || "index.html";
  }

  function focusables(card) {
    return Array.prototype.slice.call(card.querySelectorAll("a[href], button:not([disabled])"));
  }

  function render(alert, key) {
    var view = present(alert);
    var previous = document.activeElement;
    var host = document.createElement("div");
    var card = document.createElement("div");
    var scroll = document.createElement("div");
    var layout = document.createElement("div");
    var copy = document.createElement("div");
    var closeBtn = document.createElement("button");
    var title = document.createElement("h2");
    var shielded = [];
    var removed = false;

    if (!view || document.getElementById("flood-popup")) return;

    host.className = "flood-popup";
    host.id = "flood-popup";
    card.className = "flood-popup-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.tabIndex = -1;
    scroll.className = "flood-popup-scroll";
    layout.className = "flood-popup-layout";
    copy.className = "flood-popup-copy";

    closeBtn.type = "button";
    closeBtn.className = "flood-popup-close";
    closeBtn.setAttribute("aria-label", view.closeLabel || "Close");
    closeBtn.textContent = "\u00d7";

    if (view.headlineNe) {
      title.id = "flood-popup-title";
      title.className = "flood-popup-title";
      title.lang = "ne";
      title.textContent = view.headlineNe;
      card.setAttribute("aria-labelledby", "flood-popup-title");
      copy.appendChild(title);
    }
    if (view.headlineEn) {
      var en = document.createElement("p");
      en.className = "flood-popup-en";
      en.lang = "en";
      en.textContent = view.headlineEn;
      copy.appendChild(en);
    }
    if (view.levels) {
      var levels = document.createElement("p");
      levels.className = "flood-popup-levels";
      levels.lang = "en";
      levels.textContent = view.levels;
      copy.appendChild(levels);
    }
    if (view.districts) {
      var places = document.createElement("p");
      places.className = "flood-popup-districts";
      places.lang = "en";
      places.textContent = view.districts;
      copy.appendChild(places);
    }
    if (view.action) {
      var action = document.createElement("p");
      action.className = "flood-popup-action";
      action.textContent = view.action;
      copy.appendChild(action);
    }
    if (view.image) {
      var img = document.createElement("img");
      img.className = "flood-popup-thumb";
      img.src = view.image;
      img.alt = "";
      img.width = 1131;
      img.height = 1600;
      img.decoding = "async";
      layout.appendChild(img);
    }
    if (view.detailsLabel && view.href) {
      var details = document.createElement("a");
      details.className = "flood-popup-details";
      details.href = view.href;
      details.textContent = view.detailsLabel;
      details.addEventListener("click", function (e) {
        var href = details.getAttribute("href") || "";
        var hashAt = href.indexOf("#");
        var page = hashAt >= 0 ? href.slice(0, hashAt) : href;
        var hash = hashAt >= 0 ? href.slice(hashAt) : "";
        var same = !page || page === pageName();
        writeClosed(key);
        if (!same) return;
        e.preventDefault();
        finish(false);
        if (hash.length > 1) {
          var target = document.getElementById(hash.slice(1));
          if (target) {
            target.scrollIntoView({ block: "start" });
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus();
            try { history.pushState(null, "", hash); } catch (err) { location.hash = hash; }
          }
        }
      });
      copy.appendChild(details);
    }

    layout.appendChild(copy);
    scroll.appendChild(layout);
    card.appendChild(closeBtn);
    card.appendChild(scroll);
    host.appendChild(card);

    function onKey(e) {
      var items;
      var first;
      var last;
      if (e.key === "Escape") {
        e.preventDefault();
        finish(true);
        return;
      }
      if (e.key !== "Tab") return;
      items = focusables(card);
      if (!items.length) {
        e.preventDefault();
        card.focus();
        return;
      }
      first = items[0];
      last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === card || !card.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !card.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }

    function onFocusIn(e) {
      if (removed || card.contains(e.target)) return;
      var items = focusables(card);
      (items[0] || card).focus();
    }

    function finish(store) {
      if (removed) return;
      removed = true;
      if (store) writeClosed(key);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocusIn);
      document.documentElement.classList.remove("flood-popup-open");
      shielded.forEach(function (el) { el.removeAttribute("inert"); });
      if (host.parentNode) host.parentNode.removeChild(host);
      if (previous && typeof previous.focus === "function") {
        try { previous.focus(); } catch (err) {}
      }
    }

    host.addEventListener("click", function (e) {
      if (e.target === host) finish(true);
    });
    closeBtn.addEventListener("click", function () { finish(true); });
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocusIn);
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === host || el.hasAttribute("inert")) return;
      el.setAttribute("inert", "");
      shielded.push(el);
    });
    document.body.appendChild(host);
    document.documentElement.classList.add("flood-popup-open");
    card.focus();
  }

  function boot() {
    if (typeof document === "undefined") return;
    fetch("data/ndrrma_flood_alerts.json", { cache: "no-store" }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json();
    }).then(function (doc) {
      var alert = newestPopup(doc);
      var key;
      if (!alert) return;
      key = storageKey(alert.id);
      if (!shouldShow(alert, Date.now(), readClosed(key))) return;
      render(alert, key);
    }).catch(function () {});
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  return {
    HOUR: HOUR,
    storageKey: storageKey,
    shouldShow: shouldShow,
    newestPopup: newestPopup,
    present: present
  };
});
