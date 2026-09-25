/*! Opening weather alert removed. This file stays so an old cached page cannot draw a popup. */
(function () {
  function clear() {
    var nodes = document.querySelectorAll(".open-alert-host, .open-alert");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    }
    var root = document.documentElement;
    root.classList.remove("has-open-alert");
    root.style.removeProperty("--open-alert-h");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", clear);
  else clear();
})();
