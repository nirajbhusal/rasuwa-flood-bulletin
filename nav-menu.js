/*! रसुवा बाढी · मोबाइल नेभ ड्रअर */
(function () {
  var nav = document.querySelector("nav.chips");
  var btn = document.getElementById("nav-toggle");
  if (!nav || !btn) return;

  var openedAt = 0;
  var root = document.documentElement;
  var body = document.body;
  var backdrop = document.querySelector(".nav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "nav-backdrop";
    backdrop.setAttribute("aria-label", "मेनु बन्द");
    backdrop.setAttribute("tabindex", "-1");
    body.appendChild(backdrop);
  }

  function setOpen(on) {
    nav.classList.toggle("is-open", !!on);
    root.classList.toggle("nav-drawer-open", !!on);
    body.classList.toggle("nav-drawer-open", !!on);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) {
      openedAt = Date.now();
      body.style.overflow = "hidden";
    } else {
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

  var inner = nav.querySelector(".chips-inner");
  if (inner) {
    inner.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }
  nav.querySelectorAll(".chips-inner a").forEach(function (a) {
    a.addEventListener("click", close);
  });

  document.addEventListener("click", function (e) {
    if (!nav.classList.contains("is-open")) return;
    if (Date.now() - openedAt < 280) return;
    if (e.target.closest("nav.chips")) return;
    if (e.target.closest(".nav-backdrop")) return;
    close();
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "Esc") close();
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width:761px)").matches) close();
  });
})();
