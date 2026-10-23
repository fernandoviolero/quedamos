/* Quedamos · «Quién coincide con quién»: red animada e interactiva del grupo.
   Cada persona es un círculo. Una línea gruesa une a quienes recomendaron lo mismo;
   una fina, a quienes comparten tres o más temas. La física es sencilla y está hecha
   a mano (sin librerías): repulsión entre personas, muelles en las líneas y algo de gravedad. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h, D = Q.D;
  var NS = "http://www.w3.org/2000/svg";
  var reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var RED = null;

  function svg(tag, attrs, padre) {
    var el = document.createElementNS(NS, tag);
    for (var k in attrs || {}) if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(el);
    return el;
  }

  /* ------------------------------------------------------------ datos de la red (se calculan una vez) */
  function calcular() {
    if (RED) return RED;
    var nodos = D.personas.map(function (p, i) { return { i: i, id: p.id, nombre: p.nombre, aristas: [] }; });
    var porId = {};
    nodos.forEach(function (n) { porId[n.id] = n; });
    var todas = {};
    function par(a, b) {
      var x = porId[a], y = porId[b];
      if (!x || !y || x === y) return null;
      if (x.i > y.i) { var t = x; x = y; y = t; }
      var k = x.i + "|" + y.i;
      return todas[k] || (todas[k] = { a: x, b: y, recursos: [], temas: [] });
    }
    D.recursos.forEach(function (r) {
      for (var i = 0; i < r.personas.length; i++) for (var j = i + 1; j < r.personas.length; j++) { var e = par(r.personas[i], r.personas[j]); if (e) e.recursos.push(r); }
    });
    Q.temas.forEach(function (t) {
      for (var i = 0; i < t.personas.length; i++) for (var j = i + 1; j < t.personas.length; j++) { var e = par(t.personas[i], t.personas[j]); if (e) e.temas.push(t); }
    });
    var lista = Object.keys(todas).map(function (k) { return todas[k]; });
    var aristas = lista.filter(function (e) { return e.recursos.length || e.temas.length >= 3; });
    aristas.forEach(function (e) { e.a.aristas.push(e); e.b.aristas.push(e); });
    /* nadie se queda suelto: si alguien no tiene línea, se une por su tema más fuerte */
    nodos.forEach(function (n) {
      if (n.aristas.length) return;
      var mejor = lista.filter(function (e) { return e.a === n || e.b === n; }).sort(function (x, y) { return y.temas.length - x.temas.length; })[0];
      if (mejor) { aristas.push(mejor); mejor.a.aristas.push(mejor); mejor.b.aristas.push(mejor); }
    });
    aristas.forEach(function (e) { e.fuerte = e.recursos.length > 0; e.peso = e.recursos.length * 3 + e.temas.length; });
    nodos.forEach(function (n) { n.r = 13 + Math.min(9, Math.sqrt(n.aristas.length) * 2.2); });
    var media = Math.round(nodos.reduce(function (s, n) { return s + n.aristas.length; }, 0) / nodos.length);
    RED = { nodos: nodos, aristas: aristas, fuertes: aristas.filter(function (e) { return e.fuerte; }).length, media: media, ancho: 0 };
    return RED;
  }

  function motivo(e) {
    if (e.recursos.length) return Q.listaNombres(e.recursos.map(function (r) { return r.nombre; }), 2);
    return "Temas: " + Q.listaNombres(e.temas.map(function (t) { return t.nombre.toLowerCase(); }), 2);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ------------------------------------------------------------ componente */
  Q.redGrupo = function () {
    var red = calcular();
    var estrecho = window.innerWidth < 600;
    var ALTO = estrecho ? 500 : window.innerWidth < 860 ? 420 : 460;
    red.nodos.forEach(function (n) { n.rr = n.r * (estrecho ? 0.8 : 1); }); /* en móvil, círculos algo más pequeños */
    var W = 800, H = ALTO, alpha = 0, frame = null, arrastrando = null;
    var DECAE = 1 - Math.pow(0.002, 1 / 230);
    var seleccion = null, encima = null;

    var raiz = h("div", { class: "red__marco" });
    var lienzo = h("div", { class: "red__lienzo" });
    var panel = h("div", { class: "red__panel", "aria-live": "polite" });
    raiz.appendChild(lienzo);
    raiz.appendChild(panel);
    var el = svg("svg", { class: "red__svg red--montando", role: "group",
      "aria-label": "Red del grupo: " + red.nodos.length + " personas. Usa el tabulador para recorrerla." });
    el.style.height = ALTO + "px";
    lienzo.appendChild(el);
    var gA = svg("g", { class: "red__aristas" }, el);
    var gN = svg("g", { class: "red__nodos" }, el);
    var gL = svg("g", { class: "red__etiquetas", "aria-hidden": "true" }, el); /* nombres por encima de todo */

    red.aristas.forEach(function (e) {
      e.el = svg("line", { class: "red__arista" + (e.fuerte ? " red__arista--fuerte" : ""),
        "stroke-width": e.fuerte ? Math.min(5, 1.4 + e.recursos.length * 1.3) : 1 }, gA);
    });
    red.nodos.forEach(function (n, k) {
      var vecinos = n.aristas.length;
      var g = svg("g", { class: "red__nodo", tabindex: "0", role: "button",
        "aria-label": n.nombre + ", coincide con " + Q.plural(vecinos, "persona", "personas") }, gN);
      g.style.setProperty("--i", k);
      g.style.setProperty("--a", Q.colorDe(n.nombre));
      var cuerpo = svg("g", { class: "red__cuerpo" }, g);
      svg("circle", { class: "red__circulo", r: n.rr.toFixed(1) }, cuerpo);
      svg("text", { class: "red__ini", "text-anchor": "middle", dy: "0.36em" }, cuerpo).textContent = Q.iniciales(n.nombre);
      n.etiqueta = svg("text", { class: "red__etiqueta", "text-anchor": "middle", dy: (n.rr + 16).toFixed(1) }, gL);
      n.etiqueta.textContent = Q.nombreCorto(n.id);
      n.el = g;

      g.addEventListener("pointerenter", function (ev) { if (ev.pointerType === "mouse" && !arrastrando) { encima = n; enfocar(); } });
      g.addEventListener("pointerleave", function (ev) { if (ev.pointerType === "mouse" && encima === n) { encima = null; enfocar(); } });
      g.addEventListener("focus", function () { encima = n; enfocar(); });
      g.addEventListener("blur", function () { if (encima === n) { encima = null; enfocar(); } });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); seleccionar(n); } });
      g.addEventListener("pointerdown", function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault();
        var p0 = punto(ev), movido = false;
        try { g.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
        function mover(e2) {
          var p = punto(e2);
          if (!movido && Math.abs(p.x - p0.x) + Math.abs(p.y - p0.y) < 5) return;
          movido = true; arrastrando = n;
          n.fx = clamp(p.x, n.rr, W - n.rr); n.fy = clamp(p.y, n.rr, H - n.rr);
          calentar(0.35);
        }
        function soltar() {
          g.removeEventListener("pointermove", mover);
          g.removeEventListener("pointerup", soltar);
          g.removeEventListener("pointercancel", soltar);
          if (movido) { n.fx = n.fy = null; arrastrando = null; calentar(0.15); }
          else seleccionar(n);
        }
        g.addEventListener("pointermove", mover);
        g.addEventListener("pointerup", soltar);
        g.addEventListener("pointercancel", soltar);
      });
    });
    el.addEventListener("pointerdown", function (ev) { if (ev.target === el && seleccion) { seleccion = null; enfocar(); } });

    function punto(ev) {
      var r = el.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
    }

    /* ---------------------------------------------------------- física */
    function paso() {
      var ns = red.nodos, n = ns.length, i, j, a, b, dx, dy, d2, d, f, e;
      var cx = W / 2, cy = H / 2 - 6;
      var REP = 210 * Math.max(0.8, W / 900);
      for (i = 0; i < n; i++) {
        a = ns[i];
        for (j = i + 1; j < n; j++) {
          b = ns[j]; dx = b.x - a.x; dy = b.y - a.y; d2 = dx * dx + dy * dy || 0.01;
          if (d2 > 160000) continue;
          f = -REP * alpha / d2;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
      }
      for (i = 0; i < red.aristas.length; i++) {
        e = red.aristas[i]; a = e.a; b = e.b;
        dx = b.x + b.vx - a.x - a.vx; dy = b.y + b.vy - a.y - a.vy;
        d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        f = (d - (e.fuerte ? 62 : 125)) / d * alpha * (e.fuerte ? 0.16 : 0.025);
        dx *= f; dy *= f;
        b.vx -= dx * 0.5; b.vy -= dy * 0.5; a.vx += dx * 0.5; a.vy += dy * 0.5;
      }
      var gx = 0.012 * (900 / Math.max(W, 300)), gy = 0.05;
      for (i = 0; i < n; i++) {
        a = ns[i];
        a.vx += (cx - a.x) * gx * alpha; a.vy += (cy - a.y) * gy * alpha;
        if (a.fx != null) { a.x = a.fx; a.y = a.fy; a.vx = a.vy = 0; continue; }
        a.vx *= 0.6; a.vy *= 0.6;
        a.x += a.vx; a.y += a.vy;
      }
      for (var vuelta = 0; vuelta < 2; vuelta++) { /* choques: dos pasadas para que no se monten */
        for (i = 0; i < n; i++) {
          a = ns[i];
          for (j = i + 1; j < n; j++) {
            b = ns[j]; dx = b.x - a.x; dy = b.y - a.y; d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            var min = a.rr + b.rr + 8;
            if (d < min) {
              var o = (min - d) / d * 0.5;
              if (a.fx == null) { a.x -= dx * o; a.y -= dy * o; }
              if (b.fx == null) { b.x += dx * o; b.y += dy * o; }
            }
          }
        }
        for (i = 0; i < n; i++) { a = ns[i]; a.x = clamp(a.x, a.rr + 4, W - a.rr - 4); a.y = clamp(a.y, a.rr + 4, H - a.rr - 20); }
      }
      alpha += ((arrastrando ? 0.3 : 0) - alpha) * DECAE;
    }
    function dibujar() {
      var i, e, n;
      for (i = 0; i < red.aristas.length; i++) {
        e = red.aristas[i];
        e.el.setAttribute("x1", e.a.x.toFixed(1)); e.el.setAttribute("y1", e.a.y.toFixed(1));
        e.el.setAttribute("x2", e.b.x.toFixed(1)); e.el.setAttribute("y2", e.b.y.toFixed(1));
      }
      for (i = 0; i < red.nodos.length; i++) {
        n = red.nodos[i];
        var tr = "translate(" + n.x.toFixed(1) + " " + n.y.toFixed(1) + ")";
        n.el.setAttribute("transform", tr);
        n.etiqueta.setAttribute("transform", tr);
      }
    }
    function bucle() {
      if (!document.body.contains(el)) { frame = null; return; }
      paso(); dibujar();
      if (alpha > 0.004 || arrastrando) frame = requestAnimationFrame(bucle);
      else frame = null;
    }
    function calentar(a) { alpha = Math.max(alpha, a); if (!frame) frame = requestAnimationFrame(bucle); }

    /* ---------------------------------------------------------- foco y panel */
    function seleccionar(n) { seleccion = seleccion === n ? null : n; enfocar(); }
    function enfocar() {
      var f = encima || seleccion;
      el.classList.toggle("red--foco", !!f);
      red.nodos.forEach(function (x) { x.el.classList.remove("es-foco", "es-vecino", "es-elegido"); x.etiqueta.classList.remove("es-visible"); });
      red.aristas.forEach(function (e) { e.el.classList.remove("es-activa"); });
      if (seleccion) seleccion.el.classList.add("es-elegido");
      if (f) {
        f.el.classList.add("es-foco");
        f.etiqueta.classList.add("es-visible");
        gL.appendChild(f.etiqueta); /* su nombre, el último: queda encima de los demás */
        f.aristas.forEach(function (e) {
          var v = e.a === f ? e.b : e.a;
          e.el.classList.add("es-activa");
          gA.appendChild(e.el); /* las líneas activas, por encima */
          v.el.classList.add("es-vecino");
          v.etiqueta.classList.add("es-visible");
        });
        gL.appendChild(f.etiqueta);
      }
      pintarPanel(f);
    }
    function dato(num, texto) { return h("p", { class: "red__dato" }, h("strong", null, num), h("span", null, texto)); }
    function leyenda() {
      return h("div", { class: "red__leyenda", "aria-hidden": "true" },
        h("span", null, h("i", { class: "red__muestra red__muestra--fuerte" }), "Recomendaron lo mismo"),
        h("span", null, h("i", { class: "red__muestra" }), "Comparten varios temas"));
    }
    function pintarPanel(f) {
      Q.vaciar(panel);
      if (!f) {
        panel.appendChild(h("p", { class: "red__titulo" }, "Toca a alguien"));
        panel.appendChild(h("p", { class: "sub" }, "Verás con quién coincide y en qué. Los círculos se pueden arrastrar."));
        panel.appendChild(dato(red.fuertes, "parejas han recomendado exactamente lo mismo"));
        panel.appendChild(dato(red.media, "personas con las que coincide cada uno, de media"));
        panel.appendChild(leyenda());
        return;
      }
      var yo = Q.yo.actual();
      var esYo = !!(yo && yo.id === f.id);
      var vecinos = f.aristas.map(function (e) { return { n: e.a === f ? e.b : e.a, e: e }; })
        .sort(function (x, y) { return y.e.peso - x.e.peso || x.n.nombre.localeCompare(y.n.nombre, "es"); });
      panel.appendChild(h("div", { class: "red__quien" }, Q.avatar(f.id, null, true),
        h("div", null, h("p", { class: "red__titulo" }, esYo ? "Tú" : f.nombre),
          h("p", { class: "sub" }, (esYo ? "Coincides con " : "Coincide con ") + Q.plural(vecinos.length, "persona", "personas")))));
      var ul = h("ul", { class: "red__vecinos" });
      vecinos.slice(0, 6).forEach(function (v) {
        ul.appendChild(h("li", null, h("button", { type: "button", class: "red__vecino", onclick: function () { seleccion = v.n; encima = null; enfocar(); } },
          Q.avatar(v.n.id, "xs", true),
          h("span", { style: { minWidth: 0 } }, h("strong", null, v.n.nombre), h("span", { class: "tenue" }, motivo(v.e))))));
      });
      if (vecinos.length > 6) ul.appendChild(h("li", { class: "tenue red__mas" }, "Y " + Q.plural(vecinos.length - 6, "persona", "personas") + " más."));
      panel.appendChild(ul);
      panel.appendChild(h("a", { class: "boton boton--secundario boton--s", href: "#/persona/" + f.id, style: { alignSelf: "flex-start" } },
        esYo ? "Ver tu perfil" : "Ver el perfil de " + Q.nombreCorto(f.id)));
    }

    /* ---------------------------------------------------------- arranque */
    var iniciado = false;
    function iniciar() {
      if (iniciado) return;
      iniciado = true;
      W = Math.max(300, Math.round(lienzo.clientWidth || 800));
      el.setAttribute("viewBox", "0 0 " + W + " " + H);
      var yaColocada = red.ancho > 0;
      if (yaColocada && red.ancho !== W) red.nodos.forEach(function (n) { n.x = n.x * W / red.ancho; });
      if (!yaColocada) {
        red.nodos.forEach(function (n, k) {
          var ang = k * 2.399963, rad = reducido ? Math.min(W, H) * 0.36 : 4 + Math.sqrt(k) * 5;
          n.x = W / 2 + Math.cos(ang) * rad; n.y = H / 2 + Math.sin(ang) * rad * 0.7; n.vx = n.vy = 0;
        });
      }
      red.ancho = W;
      var animar = !yaColocada && !reducido;
      if (!animar) {
        if (!yaColocada) { alpha = 1; for (var t = 0; t < 320; t++) paso(); }
        alpha = 0;
        dibujar();
        el.classList.remove("red--montando");
        el.classList.add("red--lista");
        elegirYo();
        return;
      }
      alpha = 1;
      dibujar();
      /* dos fotogramas para que el navegador pinte el estado inicial y la transición se vea */
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove("red--montando"); }); });
      frame = requestAnimationFrame(bucle);
      setTimeout(function () { el.classList.add("red--lista"); elegirYo(); }, 2200);
    }
    function elegirYo() {
      var yo = Q.yo.actual();
      if (!seleccion && yo && yo.id) {
        var n = red.nodos.find(function (x) { return x.id === yo.id; });
        if (n) { seleccion = n; enfocar(); return; }
      }
      enfocar();
    }

    var io = null, ro = null, tRes = null;
    function observar() {
      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver(function (ents) { if (ents.some(function (x) { return x.isIntersecting; })) { io.disconnect(); iniciar(); } }, { threshold: 0.2 });
        io.observe(lienzo);
      } else iniciar();
      if ("ResizeObserver" in window) {
        ro = new ResizeObserver(function () {
          if (!iniciado) return;
          clearTimeout(tRes);
          tRes = setTimeout(function () {
            var nuevo = Math.max(300, Math.round(lienzo.clientWidth));
            if (Math.abs(nuevo - W) < 4) return;
            red.nodos.forEach(function (n) { n.x = n.x * nuevo / W; });
            W = nuevo; red.ancho = W;
            el.setAttribute("viewBox", "0 0 " + W + " " + H);
            calentar(0.25);
          }, 120);
        });
        ro.observe(lienzo);
      }
    }
    pintarPanel(null);

    return {
      el: raiz,
      montar: observar,
      destruir: function () { if (frame) cancelAnimationFrame(frame); if (io) io.disconnect(); if (ro) ro.disconnect(); arrastrando = null; red.nodos.forEach(function (n) { n.fx = n.fy = null; }); }
    };
  };
})();
