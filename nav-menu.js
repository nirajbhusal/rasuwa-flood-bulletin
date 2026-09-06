/*! रसुवा बाढी · मोबाइल नेभ ड्रअर · body portal */
(function () {
  var nav = document.querySelector("nav.chips");
  var btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;

  var root = document.documentElement;
  var body = document.body;
  var inner = document.getElementById("nav-chips") || nav.querySelector(".chips-inner");
  var deskBtn = document.getElementById("desk-nav-toggle");
  var backdrop = document.querySelector(".nav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-backdrop";
    backdrop.setAttribute("aria-label", "मेनु बन्द");
    backdrop.setAttribute("tabindex", "-1");
    body.appendChild(backdrop);
  }

  function insertHome() {
    if (!inner) return;
    var after = deskBtn && deskBtn.parentNode === nav ? deskBtn : btn;
    if (after && after.parentNode === nav) {
      if (after.nextSibling) nav.insertBefore(inner, after.nextSibling);
      else nav.appendChild(inner);
    } else {
      nav.appendChild(inner);
    }
  }

  function portalOut() {
    if (!inner || inner.parentNode === body) return;
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

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width:761px)").matches) close();
  });
})();
