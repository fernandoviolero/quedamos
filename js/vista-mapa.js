/* Quedamos · Mapa de Madrid (Leaflet + OpenStreetMap/CARTO). */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h, D = Q.D;
  var CENTRO = [40.4168, -3.7038];

  function distanciaKm(a, b) {
    var R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLng = (b[1] - a[1]) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* ficha de un lugar (se usa en el mapa y en la portada) */
  Q.fichaLugar = function (l) {
    var t = Q.tipoLugar[l.tipo];
    var placa = h("div", { class: "placa placa--color" }, l.nombre, h("span", { class: "placa__zona" }, t.nombre));
    placa.style.setProperty("--c", t.color);
    var ficha = h("div", { class: "ficha" }, placa, h("p", { class: "ficha__dato" }, Q.icono("pin"), l.direccion));
    l.recursos.forEach(function (rid) {
      var r = Q.recurso[rid];
      ficha.appendChild(h("div", { class: "ficha__recurso" },
        h("strong", null, h("a", { href: "#", onclick: function (e) { e.preventDefault(); Q.abrirRecurso(rid); } }, r.nombre === l.nombre ? "Ver la recomendación" : r.nombre)),
        r.descripcion ? h("p", { class: "sub" }, r.descripcion) : null,
        h("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, Q.pila(r.personas, 5, "xs"),
          h("span", { class: "tenue" }, (r.n > 1 ? r.n + " lo recomiendan: " : "") + Q.listaNombres(r.personas.map(Q.nombreCorto), 3)))));
    });
    var proxima = Q.proximasQuedadas().find(function (q) { return q.lugarId === l.id; });
    if (proxima) {
      var d = Q.leerFecha(proxima.inicio);
      ficha.appendChild(h("button", { type: "button", class: "quedada-fila", onclick: function () { Q.abrirQuedada(proxima.id); } },
        h("span", { class: "fecha-bloque", style: { height: "48px" } }, h("span", { class: "fecha-bloque__dia", style: { fontSize: "1.2rem" } }, d.getDate()), h("span", { class: "fecha-bloque__mes" }, Q.MESES_C[d.getMonth()])),
        h("span", null, h("span", { class: "quedada-fila__tit" }, proxima.titulo), h("span", { class: "quedada-fila__meta" }, "Próxima quedada aquí, " + Q.hora(d)))));
    }
    if (l.nota) ficha.appendChild(h("p", { class: "ficha__nota" }, l.nota));
    ficha.appendChild(h("div", { class: "acciones" },
      h("a", { class: "boton boton--secundario boton--s", href: Q.comoLlegar(l), target: "_blank", rel: "noopener" }, Q.icono("ruta", "ico--s"), "Cómo llegar"),
      h("a", { class: "boton boton--primario boton--s", href: "#/calendario?nueva=1&lugar=" + l.id, style: { color: "#fff" } }, Q.icono("calendario", "ico--s"), "Proponer quedada")));
    ficha.appendChild(h("p", { class: "ficha__fuente" }, "Ubicación: " + l.fuente));
    return ficha;
  };

  function pintar(cont, ruta) {
    var query = ruta.query;
    var f = { q: query.q || "", tipo: query.tipo || "", persona: query.persona || "", lugar: query.lugar || "" };
    var sinUbicacion = D.recursos.filter(function (r) { return r.sinUbicacion; });

    var cambio = h("div", { class: "segmentado mapa-cambio", role: "group", "aria-label": "Mostrar" });
    var disp = h("div", { class: "mapa-disposicion", "data-modo": query.lugar ? "mapa" : "mapa" });
    function modo(m) { disp.dataset.modo = m; cambio.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.m === m)); }); if (m === "mapa" && mapa) setTimeout(function () { mapa.invalidateSize(); }, 30); }
    [["mapa", "Mapa"], ["lista", "Lista"]].forEach(function (x) { cambio.appendChild(h("button", { type: "button", dataset: { m: x[0] }, "aria-pressed": String(x[0] === "mapa"), onclick: function () { modo(x[0]); } }, x[1])); });

    cont.appendChild(h("div", { class: "cabecera cabecera--mapa" },
      h("div", { class: "cabecera__texto" }, h("h1", null, "Mapa de Madrid"),
        h("p", null, D.lugares.length + " sitios que habéis recomendado. El número de cada marcador es cuántas personas lo recomiendan.")),
      cambio));

    /* lateral */
    var buscador = h("input", { class: "entrada", type: "search", placeholder: "Busca un sitio, una calle o una persona", "aria-label": "Buscar lugares", value: f.q });
    var chips = h("div", { class: "chips", role: "group", "aria-label": "Tipo de lugar" });
    function chip(id, nombre, color, n) {
      var c = h("button", { type: "button", class: "chip", "aria-pressed": String(f.tipo === id), dataset: { tipo: id }, onclick: function () { f.tipo = f.tipo === id ? "" : id; aplicar(true); } },
        id ? h("span", { class: "chip__punto" }) : null, nombre, h("span", { class: "chip__num" }, n));
      if (color) c.style.setProperty("--c", color);
      return c;
    }
    chips.appendChild(chip("", "Todos", null, D.lugares.length));
    D.tiposLugar.forEach(function (t) {
      var n = D.lugares.filter(function (l) { return l.tipo === t.id; }).length;
      if (n) chips.appendChild(chip(t.id, t.nombre, t.color, n));
    });
    var selPersona = h("select", { class: "selector", "aria-label": "Recomendado por" });
    selPersona.appendChild(h("option", { value: "" }, "Recomendado por cualquiera"));
    D.personas.slice().sort(Q.ordenAlfa).forEach(function (p) {
      var n = D.lugares.filter(function (l) { return l.personas.indexOf(p.id) >= 0; }).length;
      if (n) selPersona.appendChild(h("option", { value: p.id }, p.nombre + " (" + n + ")"));
    });
    selPersona.value = f.persona;
    var lista = h("ul", { class: "mapa-lista", "aria-label": "Lugares" });
    var sin = h("details", { class: "mapa-sin" },
      h("summary", null, Q.plural(sinUbicacion.length, "recomendación sin ubicación exacta", "recomendaciones sin ubicación exacta")));
    var ulSin = h("ul");
    sinUbicacion.forEach(function (r) {
      ulSin.appendChild(h("li", null, h("a", { href: "#", onclick: function (e) { e.preventDefault(); Q.abrirRecurso(r.id); } }, r.nombre),
        h("span", { class: "tenue" }, " (" + r.sinUbicacion.motivo.replace(/\.$/, "").toLowerCase() + ")")));
    });
    sin.appendChild(ulSin);
    var lateral = h("div", { class: "mapa-lateral" },
      h("div", { class: "mapa-lateral__filtros" }, h("div", { class: "buscador" }, Q.icono("buscar"), buscador), chips, selPersona),
      lista, sin);
    var lienzo = h("div", { class: "mapa-lienzo" }, h("div", { id: "mapa", role: "region", "aria-label": "Mapa interactivo de los lugares" }));
    disp.appendChild(lateral); disp.appendChild(lienzo);
    cont.appendChild(disp);

    var mapa = null, grupo = null, marcadores = {}, visibles = [];

    function filtrar() {
      var tokens = Q.normalizar(f.q).split(" ").filter(Boolean);
      return D.lugares.filter(function (l) {
        if (f.tipo && l.tipo !== f.tipo) return false;
        if (f.persona && l.personas.indexOf(f.persona) < 0) return false;
        if (tokens.length) {
          var texto = Q.normalizar([l.nombre, l.direccion, (Q.tipoLugar[l.tipo] || {}).nombre,
            l.recursos.map(function (r) { return Q.recurso[r].nombre + " " + (Q.recurso[r].descripcion || ""); }).join(" "),
            l.personas.map(Q.nombre).join(" ")].join(" "));
          for (var i = 0; i < tokens.length; i++) if (texto.indexOf(tokens[i]) < 0) return false;
        }
        return true;
      }).sort(function (a, b) { return b.personas.length - a.personas.length || a.nombre.localeCompare(b.nombre, "es"); });
    }

    function marcarActivo(id, desplazar) {
      f.lugar = id || "";
      lista.querySelectorAll(".mapa-item").forEach(function (b) {
        var act = b.dataset.id === id;
        b.setAttribute("aria-current", act ? "true" : "false");
        if (act && desplazar) b.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      Object.keys(marcadores).forEach(function (k) { marcadores[k].setIcon(Q.iconoMarcador(Q.lugar[k], k === id)); });
      guardarUrl();
    }
    function guardarUrl() { Q.reemplazarHash(Q.construirHash("mapa", null, { q: f.q, tipo: f.tipo, persona: f.persona, lugar: f.lugar })); }

    function abrirEnMapa(id) {
      var m = marcadores[id];
      if (!m || !mapa) return;
      if (window.innerWidth < 960) modo("mapa");
      grupo.zoomToShowLayer(m, function () { m.openPopup(); });
      marcarActivo(id, false);
    }

    function pintarLista() {
      Q.vaciar(lista);
      if (!visibles.length) {
        lista.appendChild(h("li", { class: "vacio", style: { margin: "8px" } }, h("p", null, "Ningún sitio coincide con la búsqueda."),
          h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { f = { q: "", tipo: "", persona: "", lugar: "" }; buscador.value = ""; selPersona.value = ""; aplicar(true); } }, "Quitar filtros")));
        return;
      }
      visibles.forEach(function (l) {
        var t = Q.tipoLugar[l.tipo];
        var ico = h("span", { class: "mapa-item__ico" }, Q.icono(Q.iconoTipo(l.tipo)));
        ico.style.setProperty("--c", t.color);
        var b = h("button", { type: "button", class: "mapa-item", dataset: { id: l.id }, "aria-current": String(l.id === f.lugar),
          onclick: function () { abrirEnMapa(l.id); } },
          ico,
          h("span", { style: { minWidth: 0 } }, h("span", { class: "mapa-item__nombre", style: { display: "block" } }, l.nombre), h("span", { class: "mapa-item__dir", style: { display: "block" } }, l.direccion)),
          l.personas.length > 1 ? h("span", { class: "mapa-item__n" }, l.personas.length + " personas") : h("span", { class: "tenue", style: { fontSize: "var(--t-xs)" } }, Q.nombreCorto(l.personas[0])));
        b.addEventListener("mouseenter", function () { var m = marcadores[l.id]; if (m && m._icon) m._icon.style.zIndex = 9999; });
        lista.appendChild(h("li", null, b));
      });
    }

    function pintarMarcadores(ajustar) {
      if (!mapa) return;
      grupo.clearLayers(); marcadores = {};
      visibles.forEach(function (l) {
        var m = L.marker([l.lat, l.lng], { icon: Q.iconoMarcador(l, l.id === f.lugar), title: l.nombre, alt: l.nombre, riseOnHover: true });
        m.bindPopup(function () { return Q.fichaLugar(l); }, { maxWidth: 320, minWidth: 260, autoPanPadding: [30, 30] });
        m.on("click", function () { marcarActivo(l.id, true); });
        m.on("popupclose", function () { if (f.lugar === l.id) marcarActivo("", false); });
        grupo.addLayer(m);
        marcadores[l.id] = m;
      });
      if (ajustar && visibles.length) {
        var puntos = visibles.map(function (l) { return [l.lat, l.lng]; });
        var cerca = (f.tipo || f.persona || f.q) ? puntos : puntos.filter(function (p) { return distanciaKm(p, CENTRO) < 9; });
        if (!cerca.length) cerca = puntos;
        if (cerca.length === 1) mapa.setView(cerca[0], 15);
        else mapa.fitBounds(L.latLngBounds(cerca), { padding: [40, 40], maxZoom: 15 });
      }
    }

    function aplicar(ajustar) {
      visibles = filtrar();
      chips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.tipo === f.tipo)); });
      if (f.lugar && !visibles.some(function (l) { return l.id === f.lugar; })) f.lugar = "";
      pintarLista();
      pintarMarcadores(ajustar);
      guardarUrl();
    }

    var tBusq;
    buscador.addEventListener("input", function () { clearTimeout(tBusq); tBusq = setTimeout(function () { f.q = buscador.value; aplicar(true); }, 180); });
    selPersona.addEventListener("change", function () { f.persona = selPersona.value; aplicar(true); });

    visibles = filtrar();
    pintarLista();

    Q.cargarLeaflet().then(function () {
      if (!document.body.contains(lienzo)) return;
      mapa = L.map("mapa", { zoomControl: true, scrollWheelZoom: true, attributionControl: true }).setView(CENTRO, 13);
      Q.capaBase().addTo(mapa);
      grupo = L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 38, spiderfyOnMaxZoom: true,
        iconCreateFunction: function (c) { return L.divIcon({ html: '<div class="cluster">' + c.getChildCount() + "</div>", className: "", iconSize: [44, 44] }); }
      });
      mapa.addLayer(grupo);
      var Todo = L.Control.extend({
        options: { position: "topright" },
        onAdd: function () {
          var b = L.DomUtil.create("button", "boton boton--secundario boton--s");
          b.type = "button"; b.textContent = "Ver toda la Comunidad";
          L.DomEvent.on(b, "click", function (e) { L.DomEvent.stop(e); if (visibles.length) mapa.fitBounds(L.latLngBounds(visibles.map(function (l) { return [l.lat, l.lng]; })), { padding: [40, 40] }); });
          return b;
        }
      });
      mapa.addControl(new Todo());
      pintarMarcadores(true);
      if (f.lugar && marcadores[f.lugar]) setTimeout(function () { abrirEnMapa(f.lugar); }, 250);
    }).catch(function () {
      Q.vaciar(lienzo).appendChild(h("div", { class: "error-bloque", style: { margin: "16px" } },
        h("h3", null, "No se ha podido cargar el mapa"),
        h("p", null, "Hace falta conexión a internet para descargar el mapa. La lista de sitios sigue funcionando y cada uno tiene su botón de «Cómo llegar»."),
        h("button", { type: "button", class: "boton boton--secundario", onclick: function () { Q.irA(location.hash); } }, Q.icono("recargar", "ico--s"), "Reintentar")));
    });

    return function salir() { if (mapa) { mapa.remove(); mapa = null; } };
  }

  Q.vistas.mapa = { titulo: "Mapa de Madrid", pintar: pintar };
})();
