(function(){
  var body = document.getElementById("named-donors-body");
  if (!body) return;
  var all = [];
  var pageSize = 40;
  var page = 0;
  var q = "";
  function fmt(n){
    if (n == null || n === "") return "—";
    if (typeof n === "number") {
      var s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
      var parts = s.split(".");
      var x = parts[0];
      var last3 = x.slice(-3);
      var rest = x.slice(0, -3);
      var out = last3;
      while (rest.length > 2) { out = rest.slice(-2) + "," + out; rest = rest.slice(0, -2); }
      if (rest) out = rest + "," + out;
      return parts[1] ? out + "." + parts[1] : out;
    }
    return String(n);
  }
  function filtered(){
    if (!q) return all;
    var qq = q.toLowerCase();
    return all.filter(function(d){
      return (d.name || "").toLowerCase().indexOf(qq) >= 0 || String(d.date || "").indexOf(qq) >= 0;
    });
  }
  function render(){
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page >= pages) page = pages - 1;
    if (page < 0) page = 0;
    var slice = rows.slice(page * pageSize, page * pageSize + pageSize);
    body.innerHTML = slice.map(function(d){
      var amt = d.usd ? ("USD " + fmt(d.usd) + (d.npr ? " · रु. " + fmt(d.npr) : "")) : ("रु. " + fmt(d.npr));
      return "<tr><td class=\"dir-sn\">" + (d.sn || "") + "</td><td>" + (d.date || "") + "</td><td>" + (d.name || "") + "</td><td>" + (d.type || "") + "</td><td>" + (d.cheque || "") + "</td><td>" + amt + "</td></tr>";
    }).join("") || "<tr><td colspan=\"6\">—</td></tr>";
    var cnt = document.getElementById("named-count");
    if (cnt) cnt.textContent = rows.length + " / " + all.length;
    var pager = document.querySelector('[data-pager="named"]');
    if (pager) {
      var boxes = pager.querySelector(".pager-pages");
      var pc = pager.querySelector(".pager-count");
      if (pc) pc.textContent = (page + 1) + " / " + pages;
      if (boxes) {
        boxes.innerHTML = "";
        var maxShow = Math.min(pages, 10);
        var start = Math.max(0, Math.min(page - 4, pages - maxShow));
        for (var i = start; i < start + maxShow; i++) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "pbox" + (i === page ? " on" : "");
          b.textContent = String(i + 1);
          (function(ii){ b.addEventListener("click", function(){ page = ii; render(); }); })(i);
          boxes.appendChild(b);
        }
      }
      var prev = pager.querySelector(".pager-prev");
      var next = pager.querySelector(".pager-next");
      if (prev) prev.onclick = function(){ page--; render(); };
      if (next) next.onclick = function(){ page++; render(); };
    }
  }
  fetch("data/pmdrf-named-donors.json?v=" + (window.PAGE_VER || ""))
    .then(function(r){ return r.json(); })
    .then(function(data){
      all = data.donors || [];
      render();
    })
    .catch(function(){
      body.innerHTML = "<tr><td colspan=\"6\">लोड असफल</td></tr>";
    });
  var inp = document.getElementById("named-q");
  if (inp) inp.addEventListener("input", function(){ q = inp.value.trim(); page = 0; render(); });
})();
