/* Quedamos · Banco de recursos, intereses en común, personas y perfiles. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h, D = Q.D;

  var PREGUNTAS = {};
  (D.preguntas || []).forEach(function (p) { PREGUNTAS[p.id] = p.nombre; });
  function pregunta(id) { var t = PREGUNTAS[id] || "Respuesta"; return t.charAt(0).toLowerCase() + t.slice(1); }
  var ORDENES = [
    { valor: "popular", texto: "Más recomendados primero" },
    { valor: "alfa", texto: "Orden alfabético" },
    { valor: "categoria", texto: "Por categoría" },
    { valor: "reciente", texto: "Más recientes primero" }
  ];

  /* ------------------------------------------------------------ tarjeta */
  Q.tarjetaRecurso = function (r, op) {
    op = op || {};
    var c = Q.categoria[r.categoria];
    var compartido = r.n > 1 && !op.sinDestacar;
    var b = h("button", { type: "button", class: "recurso" + (compartido ? " recurso--compartido" : "") + (r.tipo === "aficion" ? " recurso--aficion" : ""),
      onclick: function () { Q.abrirRecurso(r.id); }, "aria-label": r.nombre + ". " + Q.plural(r.n, "persona lo recomienda", "personas lo recomiendan") });
    b.style.setProperty("--c", c.color);
    var etiqueta = r.n > 1
      ? h("span", { class: "etiqueta etiqueta--compartido" }, Q.icono("personas"), r.n + " lo recomiendan")
      : r.tipo === "aficion" ? h("span", { class: "etiqueta etiqueta--aficion" }, "Afición") : null;
    b.appendChild(h("div", { class: "recurso__cabeza" },
      h("span", { class: "recurso__ico", title: c.nombre }, Q.icono(Q.iconoCategoria(r.categoria))), etiqueta));
    var lugar = r.lugares && r.lugares.length ? Q.lugar[r.lugares[0]] : null;
    var sub = [r.subtipo || (r.tipo === "aficion" ? null : c.nombre), lugar ? lugar.direccion.replace(/, Madrid$/, "") : null].filter(Boolean).join(", ");
    b.appendChild(h("div", null, h("div", { class: "recurso__nombre" }, r.nombre), sub ? h("div", { class: "recurso__sub" }, sub) : null));
    if (compartido) {
      r.recomendaciones.slice(0, 2).forEach(function (x) {
        b.appendChild(h("p", { class: "recurso__cita" }, "«" + x.texto + "»", h("span", { class: "tenue", style: { fontStyle: "normal" } }, ", " + Q.nombreCorto(x.persona))));
      });
    } else if (r.descripcion) b.appendChild(h("p", { class: "recurso__desc" }, r.descripcion));
    else b.appendChild(h("p", { class: "recurso__cita" }, "«" + r.recomendaciones[0].texto + "»"));
    var nombres = r.personas.map(Q.nombre);
    b.appendChild(h("div", { class: "recurso__pie" },
      h("span", { class: "recurso__quien" }, (r.n > 1 ? "" : "Lo recomienda ") + Q.listaNombres(nombres, 3)),
      Q.pila(r.personas, 4, "xs", true)));
    return b;
  };

  /* ------------------------------------------------------------ detalle de un recurso */
  Q.abrirRecurso = function (id) {
    var r = Q.recurso[id];
    if (!r) return;
    var c = Q.categoria[r.categoria];
    var cuerpo = h("div", { class: "detalle-recurso" });
    var etiquetas = h("div", { class: "chips" }, Q.etiquetaCat(r.categoria));
    if (r.n > 1) etiquetas.appendChild(h("span", { class: "etiqueta etiqueta--compartido" }, Q.icono("personas"), "Interés compartido"));
    if (r.subtipo) etiquetas.appendChild(h("span", { class: "etiqueta" }, r.subtipo));
    if (r.tipo === "aficion") etiquetas.appendChild(h("span", { class: "etiqueta etiqueta--aficion" }, "Afición"));
    cuerpo.appendChild(etiquetas);
    if (r.descripcion) cuerpo.appendChild(h("p", { class: "sub", style: { fontSize: "var(--t-l)" } }, r.descripcion));

    cuerpo.appendChild(h("h3", null, r.n > 1 ? "Lo recomiendan " + r.n + " personas" : "Lo recomienda"));
    var citas = h("ul", { class: "citas" });
    r.recomendaciones.forEach(function (x) {
      citas.appendChild(h("li", { class: "cita" }, Q.avatar(x.persona, "s"),
        h("div", { class: "cita__texto" },
          h("strong", null, h("a", { href: "#/persona/" + x.persona }, Q.nombre(x.persona)), h("span", { class: "tenue", style: { fontWeight: 500 } }, ", " + pregunta(x.pregunta) + " (" + (Q.edicion[x.edicion] || { nombre: x.edicion }).nombre.toLowerCase() + ")")),
          "«" + x.texto + "»")));
    });
    cuerpo.appendChild(citas);

    (r.lugares || []).forEach(function (lid) {
      var l = Q.lugar[lid], t = Q.tipoLugar[l.tipo];
      var placa = h("div", { class: "placa placa--color" }, l.nombre, h("span", { class: "placa__zona" }, t.nombre));
      placa.style.setProperty("--c", t.color);
      cuerpo.appendChild(h("div", { class: "panel", style: { display: "grid", gap: "12px" } },
        placa,
        h("p", { class: "ficha__dato" }, Q.icono("pin"), l.direccion),
        l.nota ? h("p", { class: "ficha__nota" }, l.nota) : null,
        h("div", { class: "acciones" },
          h("a", { class: "boton boton--secundario boton--s", href: "#/mapa?lugar=" + lid }, Q.icono("mapa", "ico--s"), "Ver en el mapa"),
          h("a", { class: "boton boton--secundario boton--s", href: Q.comoLlegar(l), target: "_blank", rel: "noopener" }, Q.icono("ruta", "ico--s"), "Cómo llegar"),
          h("a", { class: "boton boton--primario boton--s", href: "#/calendario?nueva=1&lugar=" + lid }, Q.icono("calendario", "ico--s"), "Proponer quedada aquí")),
        h("p", { class: "ficha__fuente" }, "Ubicación: " + l.fuente)));
    });
    if (r.sinUbicacion) {
      cuerpo.appendChild(h("div", { class: "vacio" },
        h("p", null, h("strong", null, "Sin ubicación en el mapa. "), r.sinUbicacion.motivo),
        h("a", { class: "boton boton--secundario boton--s", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(r.sinUbicacion.buscar), target: "_blank", rel: "noopener" }, Q.icono("externo", "ico--s"), "Buscar en Google Maps")));
    }
    var enl = Q.enlaceRecurso(r);
    if (enl && !(r.lugares && r.lugares.length) && !r.sinUbicacion) {
      cuerpo.appendChild(h("div", { class: "acciones" }, h("a", { class: "boton boton--secundario", href: enl.url, target: "_blank", rel: "noopener" }, Q.icono("externo", "ico--s"), enl.texto)));
    }
    if (r.temas.length) {
      var temas = h("div", { class: "chips" });
      r.temas.forEach(function (t) {
        var tc = Q.temaCalculado[t];
        if (!tc) return;
        temas.appendChild(h("a", { class: "chip", href: "#/recursos/comun?tema=" + t }, tc.nombre, h("span", { class: "chip__num" }, tc.personas.length)));
      });
      cuerpo.appendChild(h("div", { style: { display: "grid", gap: "8px" } }, h("h3", null, "Temas"), temas));
    }
    var dlg = Q.dialogo({ titulo: r.nombre, cuerpo: cuerpo, ancho: true });
    dlg.titulo.parentNode.insertBefore(h("span", { class: "recurso__ico", style: { "--c": c.color } }, Q.icono(Q.iconoCategoria(r.categoria))), dlg.titulo);
    dlg.titulo.previousSibling.style.setProperty("--c", c.color);
    dlg.titulo.style.marginRight = "auto";
    dlg.titulo.parentNode.style.gap = "12px";
    /* al navegar desde el diálogo, se cierra */
    dlg.el.addEventListener("click", function (e) { var a = e.target.closest("a[href^='#']"); if (a) dlg.cerrar(); });
  };

  /* ------------------------------------------------------------ cabecera y pestañas */
  function cabecera(cont, actual) {
    var totalRec = D.recursos.reduce(function (s, r) { return s + r.recomendaciones.length; }, 0);
    cont.appendChild(h("div", { class: "cabecera" },
      h("div", { class: "cabecera__texto" },
        h("h1", null, "Banco de recursos"),
        h("p", null, totalRec + " recomendaciones de " + D.personas.length + " personas. Cuando varias recomiendan lo mismo, aparece una sola vez con todos sus nombres."))));
    var tabs = h("nav", { class: "pestanas", "aria-label": "Vistas del banco de recursos" });
    [["todos", "Todos los recursos", "#/recursos"], ["comun", "Intereses en común", "#/recursos/comun"], ["personas", "Personas", "#/recursos/personas"]].forEach(function (t) {
      tabs.appendChild(h("a", { class: "pestana", href: t[2], "aria-current": t[0] === actual ? "page" : null }, t[1]));
    });
    cont.appendChild(tabs);
  }

  /* ------------------------------------------------------------ pestaña: todos */
  function vistaTodos(cont, query) {
    var f = {
      cat: query.cat || "", persona: query.persona || "", orden: query.orden || "popular",
      q: query.q || "", solo: query.solo || "", tipo: query.tipo || ""
    };
    var disposicion = h("div", { class: "recursos" });
    var filtros = h("aside", { class: "filtros", id: "filtros", "aria-label": "Filtros" });
    var principal = h("div");
    disposicion.appendChild(filtros); disposicion.appendChild(principal);
    cont.appendChild(disposicion);

    /* categorías */
    var grupoCat = h("div", { class: "filtros__grupo" }, h("p", { class: "filtros__tit", id: "f-cat" }, "Categoría"));
    var listaCat = h("div", { role: "group", "aria-labelledby": "f-cat", style: { display: "grid", gap: "2px" } });
    function botonCat(id, nombre, color, icono, num) {
      var b = h("button", { type: "button", class: "filtro-cat", "aria-pressed": String(f.cat === id), onclick: function () { f.cat = f.cat === id ? "" : id; aplicar(); } },
        h("span", { class: "filtro-cat__ico" }, Q.icono(icono)), nombre, h("span", { class: "filtro-cat__num" }, num));
      b.style.setProperty("--c", color);
      return b;
    }
    listaCat.appendChild(botonCat("", "Todas", "#18203A", "recursos", D.recursos.length));
    D.categorias.forEach(function (c) {
      listaCat.appendChild(botonCat(c.id, c.nombre, c.color, Q.iconoCategoria(c.id), D.recursos.filter(function (r) { return r.categoria === c.id; }).length));
    });
    grupoCat.appendChild(listaCat);
    filtros.appendChild(grupoCat);

    /* persona */
    var selPersona = Q.campo({ etiqueta: "Persona", tipo: "select", nombre: "persona",
      opciones: [{ valor: "", texto: "Cualquiera" }].concat(D.personas.slice().sort(Q.ordenAlfa).map(function (p) { return { valor: p.id, texto: p.nombre + " (" + Q.recursosDe[p.id].length + ")" }; })) });
    selPersona.el.querySelector("label .tenue").remove();
    selPersona.control.value = f.persona;
    selPersona.control.addEventListener("change", function () { f.persona = selPersona.control.value; aplicar(); });
    filtros.appendChild(selPersona.el);

    /* popularidad y tipo */
    function grupoChips(titulo, clave, opciones) {
      var g = h("div", { class: "filtros__grupo" }, h("p", { class: "filtros__tit" }, titulo));
      var chips = h("div", { class: "chips", role: "group", "aria-label": titulo });
      opciones.forEach(function (o) {
        chips.appendChild(h("button", { type: "button", class: "chip", "aria-pressed": String(f[clave] === o[0]), dataset: { clave: clave, valor: o[0] },
          onclick: function () { f[clave] = o[0]; aplicar(); } }, o[1]));
      });
      g.appendChild(chips);
      return g;
    }
    filtros.appendChild(grupoChips("Popularidad", "solo", [["", "Todas"], ["compartidos", "Compartidas (2 o más)"]]));
    filtros.appendChild(grupoChips("Tipo", "tipo", [["", "Todo"], ["recurso", "Recomendaciones"], ["aficion", "Aficiones"]]));

    /* barra superior */
    var buscador = h("input", { class: "entrada", type: "search", placeholder: "Busca un libro, un sitio, una canción, una persona…", "aria-label": "Buscar recursos", value: f.q });
    var tiempoBusqueda;
    buscador.addEventListener("input", function () { clearTimeout(tiempoBusqueda); tiempoBusqueda = setTimeout(function () { f.q = buscador.value; aplicar(true); }, 160); });
    var selOrden = h("select", { class: "selector", "aria-label": "Ordenar" });
    ORDENES.forEach(function (o) { selOrden.appendChild(h("option", { value: o.valor }, o.texto)); });
    selOrden.value = f.orden;
    selOrden.addEventListener("change", function () { f.orden = selOrden.value; aplicar(); });
    var botonFiltros = h("button", { type: "button", class: "boton boton--secundario boton-filtros-movil", "aria-expanded": "false", "aria-controls": "filtros",
      onclick: function () { var ab = filtros.classList.toggle("filtros--abierto"); botonFiltros.setAttribute("aria-expanded", String(ab)); } }, Q.icono("filtro", "ico--s"), "Filtros");
    principal.appendChild(h("div", { class: "barra-recursos" }, h("div", { class: "buscador" }, Q.icono("buscar"), buscador), selOrden, botonFiltros));
    var resumen = h("div", { class: "resumen-filtros", "aria-live": "polite" });
    var rejilla = h("div", { class: "rejilla-recursos" });
    principal.appendChild(resumen); principal.appendChild(rejilla);

    function ultimaEdicion(r) { return r.recomendaciones.reduce(function (m, x) { return x.edicion > m ? x.edicion : m; }, ""); }
    function filtrar() {
      var tokens = Q.normalizar(f.q).split(" ").filter(Boolean);
      var lista = D.recursos.filter(function (r) {
        if (f.cat && r.categoria !== f.cat) return false;
        if (f.persona && r.personas.indexOf(f.persona) < 0) return false;
        if (f.solo === "compartidos" && r.n < 2) return false;
        if (f.tipo && r.tipo !== f.tipo) return false;
        for (var i = 0; i < tokens.length; i++) if (r._texto.indexOf(tokens[i]) < 0) return false;
        return true;
      });
      var ordenCat = D.categorias.map(function (c) { return c.id; });
      lista.sort(function (a, b) {
        if (f.orden === "alfa") return Q.ordenAlfa(a, b);
        if (f.orden === "categoria") return ordenCat.indexOf(a.categoria) - ordenCat.indexOf(b.categoria) || b.n - a.n || Q.ordenAlfa(a, b);
        if (f.orden === "reciente") return ultimaEdicion(b).localeCompare(ultimaEdicion(a)) || b.n - a.n || Q.ordenAlfa(a, b);
        return b.n - a.n || (a.tipo === "aficion") - (b.tipo === "aficion") || Q.ordenAlfa(a, b);
      });
      return lista;
    }

    function aplicar(soloRejilla) {
      Q.reemplazarHash(Q.construirHash("recursos", null, { cat: f.cat, persona: f.persona, orden: f.orden === "popular" ? "" : f.orden, q: f.q, solo: f.solo, tipo: f.tipo }));
      listaCat.querySelectorAll(".filtro-cat").forEach(function (b, i) { b.setAttribute("aria-pressed", String((i === 0 ? "" : D.categorias[i - 1].id) === f.cat)); });
      filtros.querySelectorAll(".chip[data-clave]").forEach(function (b) { b.setAttribute("aria-pressed", String(f[b.dataset.clave] === b.dataset.valor)); });
      selPersona.control.value = f.persona;
      var lista = filtrar();
      Q.vaciar(resumen);
      resumen.appendChild(h("strong", null, Q.plural(lista.length, "resultado", "resultados")));
      function quitar(texto, fn) { resumen.appendChild(h("button", { type: "button", class: "chip", onclick: fn, "aria-label": "Quitar filtro " + texto }, texto, Q.icono("cerrar", "ico--s"))); }
      if (f.cat) quitar(Q.categoria[f.cat].nombre, function () { f.cat = ""; aplicar(); });
      if (f.persona) quitar(Q.nombre(f.persona), function () { f.persona = ""; aplicar(); });
      if (f.solo) quitar("Compartidas", function () { f.solo = ""; aplicar(); });
      if (f.tipo) quitar(f.tipo === "aficion" ? "Aficiones" : "Recomendaciones", function () { f.tipo = ""; aplicar(); });
      if (f.q) quitar("«" + f.q + "»", function () { f.q = ""; buscador.value = ""; aplicar(); });
      if (f.persona) resumen.appendChild(h("a", { href: "#/persona/" + f.persona }, "Ver el perfil de " + Q.nombreCorto(f.persona)));
      Q.vaciar(rejilla);
      if (!lista.length) {
        rejilla.appendChild(h("div", { class: "vacio", style: { gridColumn: "1 / -1" } },
          h("h3", null, "No hay nada con estos filtros"),
          h("p", null, f.q ? "Prueba con otra palabra o quita algún filtro." : "Quita algún filtro para ver más recomendaciones."),
          h("button", { type: "button", class: "boton boton--secundario", onclick: function () { f = { cat: "", persona: "", orden: f.orden, q: "", solo: "", tipo: "" }; buscador.value = ""; aplicar(); } }, "Quitar todos los filtros")));
        return;
      }
      lista.forEach(function (r) { rejilla.appendChild(Q.tarjetaRecurso(r, { sinDestacar: f.orden === "alfa" })); });
      if (!soloRejilla && filtros.classList.contains("filtros--abierto") && window.innerWidth < 960) { /* en móvil, cerrar tras elegir */ }
    }
    aplicar();
  }

  /* ------------------------------------------------------------ pestaña: intereses en común */
  function vistaComun(cont, query) {
    var repetidos = D.recursos.filter(function (r) { return r.n > 1; }).sort(function (a, b) { return b.n - a.n || Q.ordenAlfa(a, b); });
    cont.appendChild(h("p", { class: "sub", style: { maxWidth: "65ch", marginBottom: "24px" } },
      "Aquí se cruzan las respuestas: lo que habéis recomendado varias personas a la vez y los temas en los que coincidís aunque cada uno haya dicho una cosa distinta."));

    var s1 = h("section", { "aria-labelledby": "t-repetidos" },
      h("div", { class: "seccion__tit" }, h("h2", { id: "t-repetidos" }, "Lo que habéis recomendado varias personas"), h("span", { class: "tenue" }, Q.plural(repetidos.length, "coincidencia", "coincidencias"))));
    var rj = h("div", { class: "rejilla-recursos" });
    repetidos.forEach(function (r) { rj.appendChild(Q.tarjetaRecurso(r, { sinDestacar: true })); });
    s1.appendChild(rj);
    cont.appendChild(s1);

    /* afinidades */
    var s3 = h("section", { class: "seccion", "aria-labelledby": "t-afines" });
    s3.appendChild(h("div", { class: "seccion__tit" }, h("h2", { id: "t-afines" }, "Con quién tienes más en común")));
    var yo = Q.yo.actual();
    var sel = h("select", { class: "selector", "aria-label": "Persona", style: { maxWidth: "320px", marginBottom: "14px" } });
    sel.appendChild(h("option", { value: "" }, "Elige una persona"));
    D.personas.slice().sort(Q.ordenAlfa).forEach(function (p) { sel.appendChild(h("option", { value: p.id }, p.nombre)); });
    var cajaAfines = h("div");
    sel.addEventListener("change", function () { pintarAfines(sel.value); });
    s3.appendChild(sel); s3.appendChild(cajaAfines);
    function pintarAfines(pid) {
      Q.vaciar(cajaAfines);
      if (!pid) { cajaAfines.appendChild(h("p", { class: "tenue" }, "Elige a alguien para ver con quién coincide más.")); return; }
      cajaAfines.appendChild(Q.listaAfines(pid, 6));
    }
    if (yo && yo.id) sel.value = yo.id;
    pintarAfines(sel.value);
    cont.appendChild(s3);

    /* temas */
    var s2 = h("section", { class: "seccion", "aria-labelledby": "t-temas" });
    var temas = Q.temas.filter(function (t) { return t.personas.length > 1; });
    s2.appendChild(h("div", { class: "seccion__tit" }, h("h2", { id: "t-temas" }, "Temas en los que coincidís"), h("span", { class: "tenue" }, Q.plural(temas.length, "tema", "temas"))));
    var rejTemas = h("div", { class: "temas" });
    temas.forEach(function (t) {
      var lista = h("ul", { class: "tema__lista" });
      t.recursos.slice().sort(function (a, b) { return b.n - a.n || Q.ordenAlfa(a, b); }).forEach(function (r) {
        lista.appendChild(h("li", null, h("a", { href: "#", onclick: function (e) { e.preventDefault(); Q.abrirRecurso(r.id); } }, r.nombre),
          h("span", null, ", " + Q.listaNombres(r.personas.map(Q.nombreCorto), 3))));
      });
      var tarjeta = h("article", { class: "tema", id: "tema-" + t.id },
        h("div", { class: "tema__cabeza" }, h("h3", { class: "tema__nombre" }, t.nombre), h("span", { class: "tema__num", title: "personas" }, t.personas.length)),
        Q.pila(t.personas, 8, "xs"), lista,
        h("a", { class: "boton boton--secundario boton--s", style: { justifySelf: "start" }, href: "#/calendario?nueva=1&tema=" + t.id }, Q.icono("calendario", "ico--s"), "Proponer un plan"));
      if (query.tema === t.id) { tarjeta.style.borderColor = "var(--azulejo)"; tarjeta.style.boxShadow = "0 0 0 3px var(--azulejo-claro)"; }
      rejTemas.appendChild(tarjeta);
    });
    s2.appendChild(rejTemas);
    cont.appendChild(s2);
    if (query.tema) setTimeout(function () { var el = document.getElementById("tema-" + query.tema); if (el) el.scrollIntoView({ block: "center" }); }, 60);
  }

  Q.listaAfines = function (pid, max) {
    var afines = Q.afines(pid).slice(0, max || 5);
    if (!afines.length) return h("p", { class: "tenue" }, "Todavía no hay coincidencias con nadie.");
    var maxPuntos = afines[0].puntos;
    var cont = h("div", { class: "afines" });
    afines.forEach(function (a) {
      var cubiertos = {};
      a.recursos.forEach(function (r) { Q.recurso[r].temas.forEach(function (t) { cubiertos[t] = true; }); });
      var razones = a.recursos.map(function (r) { return Q.recurso[r].nombre; })
        .concat(a.temas.filter(function (t) { return !cubiertos[t]; }).map(function (t) { return Q.temaCalculado[t].nombre.toLowerCase(); }));
      cont.appendChild(h("a", { class: "afin", href: "#/persona/" + a.persona.id },
        Q.avatar(a.persona.id, null, true),
        h("div", null, h("strong", null, a.persona.nombre), h("p", { class: "afin__por" }, "Coincidís en " + Q.listaNombres(razones, 3))),
        h("span", { class: "afin__barra", title: "Afinidad" }, h("span", { style: { width: Math.round(100 * a.puntos / maxPuntos) + "%" } }))));
    });
    return cont;
  };

  /* ------------------------------------------------------------ pestaña: personas */
  function vistaPersonas(cont) {
    var buscador = h("input", { class: "entrada", type: "search", placeholder: "Busca a alguien", "aria-label": "Buscar personas" });
    var rej = h("div", { class: "personas" });
    cont.appendChild(h("div", { class: "barra-recursos" }, h("div", { class: "buscador" }, Q.icono("buscar"), buscador)));
    cont.appendChild(rej);
    function pintar() {
      Q.vaciar(rej);
      var f = Q.normalizar(buscador.value);
      var lista = D.personas.slice().sort(Q.ordenAlfa).filter(function (p) { return !f || Q.normalizar(p.nombre).indexOf(f) >= 0; });
      lista.forEach(function (p) {
        var n = Q.recursosDe[p.id].length;
        var compartidos = Q.recursosDe[p.id].filter(function (r) { return Q.recurso[r].n > 1; }).length;
        rej.appendChild(h("a", { class: "persona-tarjeta", href: "#/persona/" + p.id }, Q.avatar(p.id, null, true),
          h("div", null, h("strong", null, p.nombre), h("span", null, Q.plural(n, "recomendación", "recomendaciones") + (compartidos ? ", " + compartidos + " en común" : "")))));
      });
      if (!lista.length) rej.appendChild(h("p", { class: "tenue" }, "Nadie con ese nombre."));
    }
    buscador.addEventListener("input", pintar);
    pintar();
  }

  /* ------------------------------------------------------------ perfil de persona */
  function vistaPerfil(cont, pid) {
    var p = Q.persona[pid];
    if (!p) {
      cont.appendChild(h("div", { class: "vacio" }, h("h1", null, "No encontramos a esa persona"), h("a", { class: "boton boton--secundario", href: "#/recursos/personas" }, "Ver todas las personas")));
      return;
    }
    var resp = D.respuestas.filter(function (r) { return r.persona === pid; });
    var recursos = Q.recursosDe[pid].map(function (id) { return Q.recurso[id]; });
    var primera = resp.length ? Q.leerFecha(resp[0].fecha) : null;
    cont.appendChild(h("a", { href: "#/recursos/personas", class: "boton boton--fantasma boton--s", style: { marginBottom: "12px" } }, Q.icono("izq", "ico--s"), "Personas"));
    cont.appendChild(h("div", { class: "perfil__cabeza" }, Q.avatar(pid, "l", true),
      h("div", { style: { display: "grid", gap: "6px" } }, h("h1", null, p.nombre),
        h("p", { class: "sub" }, Q.plural(recursos.length, "recomendación", "recomendaciones") + (primera ? ". Respondió el formulario el " + primera.getDate() + " de " + Q.MESES[primera.getMonth()] + "." : "")))));

    var perfil = h("div", { class: "perfil" });
    var izq = h("div");
    var porCat = {};
    recursos.forEach(function (r) { (porCat[r.categoria] = porCat[r.categoria] || []).push(r); });
    D.categorias.forEach(function (c) {
      if (!porCat[c.id]) return;
      izq.appendChild(h("h2", { style: { margin: "8px 0 12px", fontSize: "var(--t-l)" } }, c.nombre));
      var rj = h("div", { class: "rejilla-recursos", style: { marginBottom: "24px" } });
      porCat[c.id].sort(function (a, b) { return b.n - a.n; }).forEach(function (r) { rj.appendChild(Q.tarjetaRecurso(r, { sinDestacar: true })); });
      izq.appendChild(rj);
    });
    var der = h("aside", { style: { display: "grid", gap: "24px" } });
    der.appendChild(h("section", { class: "panel", style: { display: "grid", gap: "12px" } }, h("h2", { style: { fontSize: "var(--t-l)" } }, "Con quién coincide más"), Q.listaAfines(pid, 5)));
    var mias = Q.quedadasOrdenadas().filter(function (q) { return q.estado !== "cancelada" && q.participantes.some(function (x) { return Q.normalizar(x) === Q.normalizar(p.nombre); }); });
    if (mias.length) {
      var lq = h("ul", { class: "lista-quedadas" });
      mias.slice(-4).forEach(function (q) { lq.appendChild(h("li", null, Q.filaQuedada(q))); });
      der.appendChild(h("section", { class: "panel", style: { display: "grid", gap: "12px" } }, h("h2", { style: { fontSize: "var(--t-l)" } }, "Sus quedadas"), lq));
    }
    if (resp.length) {
      var dl = h("dl", { style: { margin: 0 } });
      resp.forEach(function (r) {
        var ed = Q.edicion[r.edicion];
        Object.keys(r.campos || {}).forEach(function (k) {
          dl.appendChild(h("div", { class: "respuesta-original" }, h("dt", null, (PREGUNTAS[k] || k) + (D.ediciones.length > 1 && ed ? ", " + ed.nombre.toLowerCase() : "")), h("dd", null, r.campos[k])));
        });
      });
      der.appendChild(h("section", { class: "panel" }, h("h2", { style: { fontSize: "var(--t-l)", marginBottom: "4px" } }, "Sus respuestas, tal cual"), dl));
    }
    perfil.appendChild(izq); perfil.appendChild(der);
    cont.appendChild(perfil);
  }

  /* ------------------------------------------------------------ registro de vistas */
  Q.vistas.recursos = {
    titulo: "Banco de recursos",
    pintar: function (cont, ruta) {
      var pestana = ruta.param === "comun" ? "comun" : ruta.param === "personas" ? "personas" : "todos";
      cabecera(cont, pestana);
      if (pestana === "comun") vistaComun(cont, ruta.query);
      else if (pestana === "personas") vistaPersonas(cont);
      else vistaTodos(cont, ruta.query);
      if (ruta.query.r && Q.recurso[ruta.query.r]) Q.abrirRecurso(ruta.query.r);
    }
  };
  Q.vistas.persona = {
    titulo: "Perfil",
    seccionNav: "recursos",
    pintar: function (cont, ruta) { vistaPerfil(cont, ruta.param); }
  };
})();
