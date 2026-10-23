/* Quedamos · Inicio: panel con coincidencias, quedadas, ideas, mapa y fotos. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h, D = Q.D;
  var reducido = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var introHecha = false; /* la entrada animada solo se ve la primera vez que se abre la web */

  /* cuenta de 0 a n con frenada suave */
  function contar(el, n, retraso) {
    el.textContent = "0";
    setTimeout(function () {
      var inicio = null;
      requestAnimationFrame(function paso(t) {
        if (inicio === null) inicio = t;
        var p = Math.min(1, (t - inicio) / 900);
        el.textContent = String(Math.round(n * (1 - Math.pow(1 - p, 3))));
        if (p < 1 && document.body.contains(el)) requestAnimationFrame(paso);
      });
    }, retraso);
  }

  var FRASES_TEMA = {
    lectura: "personas han recomendado algún libro",
    sushi: "personas no dicen que no al sushi",
    sierra: "personas se escapan a la sierra",
    podcasts: "personas escuchan podcasts",
    miradores: "personas buscan miradores y atardeceres",
    manualidades: "personas disfrutan con las manualidades",
    juegos: "personas juegan a juegos de mesa",
    pasear: "personas recomiendan parques y paseos",
    teatro: "personas van al teatro",
    musica: "personas han compartido música"
  };
  function recurso(r) {
    var art = { "Parque del Retiro": "el ", "Templo de Debod": "el ", "Palacio Real y alrededores": "el " }[r.nombre] || "";
    return { n: r.n, personas: r.personas, frase: [r.n > 1 ? "personas recomiendan " + art : "persona recomienda ", h("em", null, r.nombre.replace(" y alrededores", ""))], accion: function () { Q.abrirRecurso(r.id); } };
  }
  function coincidencias() {
    var lineas = D.recursos.filter(function (r) { return r.n >= 3 && r.tipo === "recurso"; })
      .sort(function (a, b) { return b.n - a.n || Q.ordenAlfa(a, b); }).slice(0, 3).map(recurso);
    var temas = Q.temas.filter(function (t) { return FRASES_TEMA[t.id] && t.personas.length >= 3; }).slice(0, 5 - lineas.length);
    temas.forEach(function (t) { lineas.push({ n: t.personas.length, personas: t.personas, frase: [FRASES_TEMA[t.id]], enlace: "#/recursos/comun?tema=" + t.id }); });
    return lineas;
  }

  function pintar(cont) {
    var yo = Q.yo.actual();
    var intro = !introHecha && !reducido;
    introHecha = true;
    var totalRec = D.recursos.reduce(function (s, r) { return s + r.recomendaciones.length; }, 0);
    var compartidos = D.recursos.filter(function (r) { return r.n > 1; }).length;

    /* portada */
    var lista = h("ol", { class: "coincidencias", "aria-label": "Coincidencias del grupo" });
    coincidencias().forEach(function (c, i) {
      var el = h(c.enlace ? "a" : "button", { class: "coincidencia", href: c.enlace || null, type: c.enlace ? null : "button",
        style: { "--i": i, width: "100%", textAlign: "left", background: "none", borderLeft: 0, borderRight: 0, borderTop: 0, cursor: "pointer", font: "inherit" },
        onclick: c.accion || null },
        h("span", { class: "coincidencia__num" }, c.n),
        h("span", { class: "coincidencia__frase" }, c.frase),
        Q.pila(c.personas, 7, "xs", true));
      el.style.setProperty("--i", i);
      if (intro) {
        el.setAttribute("aria-label", el.textContent.replace(/^\d+/, c.n + " "));
        contar(el.querySelector(".coincidencia__num"), c.n, 650 + i * 110);
      }
      lista.appendChild(h("li", null, el));
    });
    var titulo = h("h1", { class: "portada__titulo", id: "tit-portada" });
    "Tenéis más en común de lo que parece.".split(" ").forEach(function (palabra, i) {
      var s = h("span", { class: "palabra" }, palabra);
      s.style.setProperty("--i", i);
      titulo.appendChild(s);
      titulo.appendChild(document.createTextNode(" "));
    });
    cont.appendChild(h("section", { class: "portada" + (intro ? " portada--intro" : ""), "aria-labelledby": "tit-portada" },
      h("div", null,
        h("p", { class: "portada__saludo" }, yo ? "Hola, " + yo.nombre.split(" ")[0] + "." : "Hola."),
        titulo,
        h("p", { class: "portada__resumen" }, D.personas.length + " personas respondieron al formulario de " + D.ediciones[D.ediciones.length - 1].nombre.toLowerCase() +
          ": " + totalRec + " recomendaciones, " + D.lugares.length + " sitios de Madrid y " + compartidos + " cosas que recomendáis varias personas a la vez."),
        h("div", { class: "portada__acciones" },
          h("a", { class: "boton boton--primario", href: "#/recursos" }, Q.icono("recursos", "ico--s"), "Ver todas las recomendaciones"),
          h("button", { type: "button", class: "boton boton--secundario", onclick: function () { Q.formQuedada(); } }, Q.icono("mas", "ico--s"), "Proponer una quedada"))),
      lista));

    /* red: quién coincide con quién */
    var red = Q.redGrupo();
    cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "t-red" },
      h("div", { class: "seccion__tit" }, h("h2", { id: "t-red" }, "Quién coincide con quién"), h("span", { class: "tenue" }, "Cada línea es algo en común")),
      red.el));
    red.montar();

    /* quedadas + ideas */
    var cajaQuedadas = h("div");
    var ideas = h("ul", { class: "ideas" });
    Q.ideasQuedada().slice(0, 3).forEach(function (i) { ideas.appendChild(Q.tarjetaIdea(i)); });
    cont.appendChild(h("div", { class: "seccion rejilla-inicio" },
      h("section", { "aria-labelledby": "t-prox" }, h("div", { class: "seccion__tit" }, h("h2", { id: "t-prox" }, "Próximas quedadas"), h("a", { href: "#/calendario" }, "Abrir el calendario")), cajaQuedadas),
      h("section", { "aria-labelledby": "t-ideas" }, h("div", { class: "seccion__tit" }, h("h2", { id: "t-ideas" }, "Ideas para quedar"), h("a", { href: "#/recursos/comun" }, "Intereses en común")), ideas)));

    /* mapa */
    var destacados = D.lugares.filter(function (l) { return l.personas.length > 1; });
    var lienzo = h("div", { class: "mapa-previa__lienzo", id: "mapa-inicio", "aria-label": "Mapa con los sitios más recomendados" });
    var capa = h("div", { class: "mapa-previa__capa" });
    destacados.forEach(function (l) {
      capa.appendChild(h("a", { class: "chip", href: "#/mapa?lugar=" + l.id, style: { background: "#fff" } }, h("span", { class: "chip__punto", style: { "--c": Q.tipoLugar[l.tipo].color } }), l.nombre, h("span", { class: "chip__num" }, l.personas.length)));
    });
    capa.querySelectorAll(".chip__punto").forEach(function (p, i) { p.style.setProperty("--c", Q.tipoLugar[destacados[i].tipo].color); });
    cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "t-mapa" },
      h("div", { class: "seccion__tit" }, h("h2", { id: "t-mapa" }, "Los sitios que más se repiten"), h("a", { href: "#/mapa" }, "Ver los " + D.lugares.length + " sitios en el mapa")),
      h("div", { class: "mapa-previa" }, lienzo, capa)));
    var mapa = null;
    Q.cargarLeaflet().then(function () {
      if (!document.body.contains(lienzo)) return;
      mapa = L.map(lienzo, { scrollWheelZoom: false, zoomControl: true }).setView([40.4168, -3.7038], 13);
      Q.capaBase().addTo(mapa);
      var puntos = [];
      D.lugares.forEach(function (l) {
        var cerca = Math.abs(l.lat - 40.4168) < 0.05 && Math.abs(l.lng + 3.7038) < 0.07;
        if (!cerca) return;
        puntos.push([l.lat, l.lng]);
        L.marker([l.lat, l.lng], { icon: Q.iconoMarcador(l), title: l.nombre, zIndexOffset: l.personas.length * 100 })
          .bindPopup(function () { return Q.fichaLugar(l); }, { maxWidth: 320, minWidth: 260 }).addTo(mapa);
      });
      var centrales = destacados.filter(function (l) { return Math.abs(l.lat - 40.4168) < 0.05 && Math.abs(l.lng + 3.7038) < 0.07; });
      if (centrales.length > 1) mapa.fitBounds(L.latLngBounds(centrales.map(function (l) { return [l.lat, l.lng]; })), { padding: [70, 70], maxZoom: 14 });
    }).catch(function () {
      Q.vaciar(lienzo).appendChild(h("div", { class: "vacio", style: { margin: "16px" } }, h("p", null, "El mapa necesita conexión a internet. Los sitios siguen en la lista de abajo.")));
    });

    /* fotos */
    var cajaFotos = h("div");
    cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "t-fotos" },
      h("div", { class: "seccion__tit" }, h("h2", { id: "t-fotos" }, "Últimas fotos"), h("a", { href: "#/galeria" }, "Ir a la galería")), cajaFotos));

    /* mensajes del formulario */
    if (D.mensajes && D.mensajes.length) {
      var msgs = h("div", { class: "mensajes" });
      D.mensajes.forEach(function (m) { msgs.appendChild(h("p", { class: "mensaje" }, h("strong", null, Q.nombre(m.persona)), m.texto)); });
      cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "t-msg" }, h("div", { class: "seccion__tit" }, h("h2", { id: "t-msg" }, "Lo que dijisteis de la idea")), msgs));
    }

    /* accesos */
    var atajos = h("nav", { class: "atajos", "aria-label": "Accesos rápidos" });
    cont.appendChild(h("section", { class: "seccion" }, atajos));

    function repintarVivos() {
      var est = Q.api.estado;
      Q.vaciar(cajaQuedadas);
      if (est.cargando && !est.quedadas.length) cajaQuedadas.appendChild(h("div", { class: "esqueleto", style: { height: "170px" } }));
      else if (est.error) cajaQuedadas.appendChild(h("div", { class: "error-bloque" }, h("p", null, est.error),
        h("button", { type: "button", class: "boton boton--secundario boton--s", style: { justifySelf: "start" }, onclick: function () { Q.api.cargar(); } }, "Reintentar")));
      else {
        var prox = Q.proximasQuedadas(3);
        if (!prox.length) cajaQuedadas.appendChild(h("div", { class: "vacio" }, h("h3", null, "Nada en el calendario todavía"),
          h("p", null, "Elige una de las ideas o propón tu propio plan."),
          h("button", { type: "button", class: "boton boton--primario boton--s", onclick: function () { Q.formQuedada(); } }, Q.icono("mas", "ico--s"), "Nueva quedada")));
        else { var ul = h("ul", { class: "lista-quedadas" }); prox.forEach(function (q) { ul.appendChild(h("li", null, Q.filaQuedada(q))); }); cajaQuedadas.appendChild(ul); }
      }
      Q.vaciar(cajaFotos);
      if (est.cargando && !est.fotos.length) cajaFotos.appendChild(h("div", { class: "esqueleto", style: { height: "150px" } }));
      else if (!est.error) {
        var fotos = Q.fotosOrdenadas().slice(0, 6);
        if (!fotos.length) cajaFotos.appendChild(h("div", { class: "vacio" }, h("p", null, "Aún no hay fotos. Después de la primera quedada, subidlas aquí."),
          h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { Q.subirFotos(); } }, Q.icono("subir", "ico--s"), "Subir fotos")));
        else {
          var ids = fotos.map(function (f) { return f.id; });
          var tira = h("div", { class: "fotos-tira" });
          fotos.forEach(function (f) {
            tira.appendChild(h("button", { type: "button", class: "foto-mini", style: { aspectRatio: "1" }, onclick: function () { Q.abrirFoto(f.id, ids); }, "aria-label": (f.titulo || "Foto") + ", de " + f.autor },
              h("img", { src: Q.api.urlFoto(f, 400), alt: f.titulo || "", loading: "lazy" })));
          });
          cajaFotos.appendChild(tira);
        }
      }
      Q.vaciar(atajos);
      var proximas = Q.proximasQuedadas().length;
      [["recursos", "#/recursos", "Banco de recursos", totalRec + " recomendaciones en " + D.categorias.length + " categorías"],
       ["mapa", "#/mapa", "Mapa de Madrid", D.lugares.length + " sitios con dirección"],
       ["calendario", "#/calendario", "Calendario", est.cargando ? "Cargando…" : Q.plural(proximas, "quedada próxima", "quedadas próximas")],
       ["galeria", "#/galeria", "Galería", est.cargando ? "Cargando…" : Q.plural(est.fotos.length, "foto", "fotos")]].forEach(function (a) {
        atajos.appendChild(h("a", { class: "atajo", href: a[1] }, Q.icono(a[0]), h("strong", null, a[2]), h("span", null, a[3])));
      });
    }
    var quitar = Q.api.suscribir(repintarVivos);
    repintarVivos();
    return function () { quitar(); red.destruir(); if (mapa) mapa.remove(); };
  }

  Q.vistas.inicio = { titulo: "Inicio", pintar: pintar };
})();
