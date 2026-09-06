/*! रसुवा बाढी · क्लासिक ह्याम्बर्गर मेनु · body portal */
(function () {
  var nav = document.querySelector("nav.chips");
  var btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;

  var root = document.documentElement;
  var body = document.body;
  var inner = document.getElementById("nav-chips") || nav.querySelector(".chips-inner");
  var deskBtn = document.getElementById("desk-nav-toggle");
  var brandRow = document.querySelector(".brand-row");
  var topActions = document.querySelector(".top-actions");
  var mq = window.matchMedia("(max-width:760px)");
  var backdrop = document.querySelector(".nav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-backdrop";
    backdrop.setAttribute("aria-label", "मेनु बन्द");
    backdrop.setAttribute("tabindex", "-1");
    body.appendChild(backdrop);
  }

  /* Visible मेनु label on the hamburger (i18n-friendly) */
  if (!btn.querySelector(".nav-toggle-label")) {
    var lab = document.createElement("span");
    lab.className = "nav-toggle-label";
    lab.setAttribute("data-i18n", "nav_menu");
    lab.textContent = "मेनु";
    btn.appendChild(lab);
  }

  function isMobile() {
    return mq.matches;
  }

  function placeToggle() {
    if (isMobile()) {
      if (brandRow) {
        var brand = brandRow.querySelector(".brand");
        if (brand && brand.parentNode === brandRow) {
          if (btn.parentNode !== brandRow || btn.previousSibling !== brand) {
            if (brand.nextSibling) brandRow.insertBefore(btn, brand.nextSibling);
            else brandRow.appendChild(btn);
          }
        } else if (btn.parentNode !== brandRow) {
          brandRow.insertBefore(btn, brandRow.firstChild);
        }
      } else if (topActions && btn.parentNode !== topActions) {
        topActions.insertBefore(btn, topActions.firstChild);
      }
    } else if (btn.parentNode !== nav) {
      if (deskBtn && deskBtn.parentNode === nav) {
        nav.insertBefore(btn, deskBtn);
      } else if (inner && inner.parentNode === nav) {
        nav.insertBefore(btn, inner);
      } else {
        nav.insertBefore(btn, nav.firstChild);
      }
    }
  }

  function ensureDrawerHead() {
    if (!inner || inner.querySelector(".nav-drawer-head")) return;
    var head = document.createElement("div");
    head.className = "nav-drawer-head";
    var title = document.createElement("span");
    title.className = "nav-drawer-title";
    title.setAttribute("data-i18n", "nav_menu");
    title.textContent = "मेनु";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "nav-drawer-close";
    closeBtn.setAttribute("aria-label", "मेनु बन्द");
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

  function insertHome() {
    if (!inner) return;
    var after = deskBtn && deskBtn.parentNode === nav ? deskBtn : null;
    if (after) {
      if (after.nextSibling) nav.insertBefore(inner, after.nextSibling);
      else nav.appendChild(inner);
    } else if (btn.parentNode === nav) {
      if (btn.nextSibling) nav.insertBefore(inner, btn.nextSibling);
      else nav.appendChild(inner);
    } else {
      nav.appendChild(inner);
    }
  }

  function portalOut() {
    if (!inner || inner.parentNode === body) return;
    ensureDrawerHead();
    inner.classList.add("nav-drawer-panel");
    body.appendChild(inner);
  }

  function portalIn() {
    if (!inner) return;
    inner.classList.remove("nav-drawer-panel");
    if (inner.parentNode !== nav) insertHome();
  }

  function setOpen(on) {
    on = !!on;
    nav.classList.toggle("is-open", on);
    root.classList.toggle("nav-drawer-open", on);
    body.classList.toggle("nav-drawer-open", on);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) {
      portalOut();
      body.style.overflow = "hidden";
    } else {
      portalIn();
      body.style.overflow = "";
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
    e.stopPropagation();
    close();
  });

  if (inner) {
    inner.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        /* allow default navigation; close after tick so portal move cannot cancel nav */
        setTimeout(close, 50);
      });
    });
  }

  window.addEventListener("pagehide", function () {
    if (nav.classList.contains("is-open")) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") close();
  });

  function onViewportChange() {
    placeToggle();
    if (!isMobile()) close();
  }

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onViewportChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onViewportChange);
  }
  window.addEventListener("resize", onViewportChange);

  placeToggle();
})();
