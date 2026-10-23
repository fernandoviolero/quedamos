/* Quedamos · Calendario de quedadas: vistas mes/semana/próximas, ficha y formulario. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h, D = Q.D;

  /* ------------------------------------------------------------ ideas para quedar */
  var PLANES_POR_TEMA = [
    { tema: "miradores", titulo: "Atardecer en el Templo de Debod", lugar: "templo-debod" },
    { tema: "pasear", titulo: "Paseo y picnic por el Retiro", lugar: "retiro" },
    { tema: "sierra", titulo: "Ruta por la sierra desde Cercedilla", lugar: "cercedilla" },
    { tema: "juegos", titulo: "Tarde de juegos de mesa", lugar: "replay" },
    { tema: "sushi", titulo: "Cena de sushi", lugar: "enkai" },
    { tema: "teatro", titulo: "Ir juntos al teatro", lugar: "teatro-lara" },
    { tema: "manualidades", titulo: "Pintar cerámica y tomar un café", lugar: "mama-pottery" },
    { tema: "lectura", titulo: "Club de lectura: elegir un libro y leerlo a la vez", lugar: null },
    { tema: "cafes", titulo: "Brunch o merienda", lugar: "salon-des-fleurs" },
    { tema: "podcasts", titulo: "Ver juntos un directo de podcast", lugar: null },
    { tema: "fiesta", titulo: "Salir de fiesta", lugar: null },
    { tema: "deporte", titulo: "Salir a correr o al gym juntos", lugar: "retiro" }
  ];
  Q.ideasQuedada = function () {
    var ideas = (D.propuestas || []).map(function (p, i) {
      return { id: "prop" + i, titulo: p.texto.replace(/\.$/, ""), propuesta: true, por: p.persona, personas: [p.persona], lugar: null };
    });
    PLANES_POR_TEMA.forEach(function (pl) {
      var t = Q.temaCalculado[pl.tema];
      if (!t || t.personas.length < 3) return;
      ideas.push({ id: "tema-" + pl.tema, titulo: pl.titulo, tema: t, personas: t.personas, lugar: pl.lugar && Q.lugar[pl.lugar] ? pl.lugar : null });
    });
    return ideas.sort(function (a, b) { return (b.propuesta ? 99 : 0) - (a.propuesta ? 99 : 0) || b.personas.length - a.personas.length; });
  };
  Q.tarjetaIdea = function (idea) {
    var lugar = idea.lugar ? Q.lugar[idea.lugar] : null;
    return h("li", { class: "idea" + (idea.propuesta ? " idea--propuesta" : "") },
      h("div", { class: "idea__tit" }, idea.titulo),
      h("p", { class: "idea__por" }, idea.propuesta
        ? "Propuesta de " + Q.nombre(idea.por) + " en el formulario."
        : idea.personas.length + " personas comparten «" + idea.tema.nombre.toLowerCase() + "»" + (lugar ? ". Sitio recomendado: " + lugar.nombre + "." : ".")),
      h("div", { class: "idea__acciones" },
        Q.pila(idea.personas, 6, "xs"),
        h("button", { type: "button", class: "boton boton--secundario boton--s", style: { marginLeft: "auto" },
          onclick: function () { Q.formQuedada({ titulo: idea.titulo, lugarId: idea.lugar }); } }, Q.icono("mas", "ico--s"), "Proponer fecha")));
  };

  /* ------------------------------------------------------------ fila de quedada (lista) */
  Q.filaQuedada = function (q) {
    var d = Q.leerFecha(q.inicio);
    var rel = Q.relativo(d);
    var tit = h("span", { class: "quedada-fila__tit" }, q.titulo);
    if (q.ejemplo) tit.appendChild(h("span", { class: "etiqueta etiqueta--ejemplo" }, "Ejemplo"));
    if (q.estado === "cancelada") tit.appendChild(h("span", { class: "etiqueta etiqueta--cancelada" }, "Cancelada"));
    return h("button", { type: "button", class: "quedada-fila", onclick: function () { Q.abrirQuedada(q.id); } },
      h("span", { class: "fecha-bloque", "aria-hidden": "true" }, h("span", { class: "fecha-bloque__dia" }, d.getDate()), h("span", { class: "fecha-bloque__mes" }, Q.MESES_C[d.getMonth()])),
      h("span", { style: { minWidth: 0 } }, tit,
        h("span", { class: "quedada-fila__meta" },
          h("span", null, Q.icono("reloj", "ico--s"), (rel ? rel.charAt(0).toUpperCase() + rel.slice(1) + ", " : Q.fechaCorta(d) + ", ") + Q.hora(d)),
          q.lugarNombre ? h("span", null, Q.icono("pin", "ico--s"), q.lugarNombre) : null)),
      Q.pila(q.participantes, 4, "xs", true));
  };

  /* ------------------------------------------------------------ añadir a mi calendario (.ics) */
  function ics(q) {
    function f(s) { return s.replace(/[-:]/g, "") + "00"; }
    var fin = q.fin || Q.isoLocal(new Date(Q.leerFecha(q.inicio).getTime() + 2 * 3600e3));
    function esc(t) { return String(t || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
    var texto = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Quedamos//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:" + q.id + "@quedamos", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART;TZID=Europe/Madrid:" + f(q.inicio), "DTEND;TZID=Europe/Madrid:" + f(fin),
      "SUMMARY:" + esc(q.titulo), "DESCRIPTION:" + esc(q.descripcion),
      "LOCATION:" + esc([q.lugarNombre, q.lugarDireccion].filter(Boolean).join(", ")), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var url = URL.createObjectURL(new Blob([texto], { type: "text/calendar;charset=utf-8" }));
    var a = h("a", { href: url, download: Q.normalizar(q.titulo).replace(/ /g, "-") + ".ics" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ------------------------------------------------------------ ficha de quedada (cajón) */
  Q.abrirQuedada = function (id) {
    var q = Q.quedadaPorId(id);
    if (!q) { Q.toast("Esa quedada ya no existe o aún no ha cargado.", "aviso"); return; }
    var cuerpo = h("div", { class: "detalle-quedada" });
    var dlg = Q.dialogo({ titulo: q.titulo, cuerpo: cuerpo, cajon: true });
    var quitar = Q.api.suscribir(function () { var nueva = Q.quedadaPorId(id); if (nueva) { q = nueva; pintar(); } });
    dlg.el.addEventListener("close", quitar);
    dlg.el.addEventListener("click", function (e) { var a = e.target.closest("a[href^='#']"); if (a) dlg.cerrar(); });

    var recien = null; /* nombre de quien se acaba de apuntar, para animar su entrada */
    function pintar() {
      Q.vaciar(cuerpo);
      dlg.titulo.textContent = q.titulo;
      var d = Q.leerFecha(q.inicio), fin = q.fin ? Q.leerFecha(q.fin) : null;
      var etiquetas = h("div", { class: "chips" });
      if (q.ejemplo) etiquetas.appendChild(h("span", { class: "etiqueta etiqueta--ejemplo" }, "Quedada de ejemplo"));
      if (q.estado === "cancelada") etiquetas.appendChild(h("span", { class: "etiqueta etiqueta--cancelada" }, "Cancelada"));
      if (etiquetas.children.length) cuerpo.appendChild(etiquetas);
      var rel = Q.relativo(d);
      cuerpo.appendChild(h("div", { class: "detalle-quedada__fecha" },
        h("span", { class: "fecha-bloque", style: { width: "64px" } }, h("span", { class: "fecha-bloque__dia" }, d.getDate()), h("span", { class: "fecha-bloque__mes" }, Q.MESES_C[d.getMonth()])),
        h("div", null, h("strong", { style: { fontSize: "var(--t-l)" } }, Q.fechaLarga(d).replace(/^./, function (c) { return c.toUpperCase(); })),
          h("p", { class: "sub" }, Q.hora(d) + (fin ? " a " + Q.hora(fin) : "") + (rel ? " (" + rel + ")" : "")))));

      if (q.lugarNombre) {
        var bloqueLugar = h("div", { class: "panel", style: { display: "grid", gap: "10px", padding: "14px" } },
          h("div", { class: "ficha__dato", style: { color: "var(--tinta)" } }, Q.icono("pin"), h("div", null, h("strong", null, q.lugarNombre), q.lugarDireccion ? h("p", { class: "sub" }, q.lugarDireccion) : null)));
        var mini = null;
        if (q.lat && q.lng) {
          mini = h("div", { class: "mini-mapa", "aria-hidden": "true" });
          bloqueLugar.appendChild(mini);
        }
        bloqueLugar.appendChild(h("div", { class: "acciones" },
          q.lugarId && Q.lugar[q.lugarId] ? h("a", { class: "boton boton--secundario boton--s", href: "#/mapa?lugar=" + q.lugarId }, Q.icono("mapa", "ico--s"), "Ver en el mapa") : null,
          h("a", { class: "boton boton--secundario boton--s", target: "_blank", rel: "noopener", href: q.lat ? Q.comoLlegar(q) : Q.comoLlegarTexto([q.lugarNombre, q.lugarDireccion, "Madrid"].filter(Boolean).join(", ")) }, Q.icono("ruta", "ico--s"), "Cómo llegar")));
        cuerpo.appendChild(bloqueLugar);
        if (mini) Q.cargarLeaflet().then(function () {
          if (!document.body.contains(mini)) return;
          var m = L.map(mini, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false }).setView([q.lat, q.lng], 15);
          Q.capaBase().addTo(m);
          var lug = Q.lugar[q.lugarId] || { tipo: "mirador", personas: [] };
          L.marker([q.lat, q.lng], { icon: Q.iconoMarcador({ tipo: lug.tipo, personas: [] }), interactive: false }).addTo(m);
        }).catch(function () { mini.remove(); });
      }
      if (q.descripcion) cuerpo.appendChild(h("p", { style: { whiteSpace: "pre-line" } }, q.descripcion));

      var yoVoy = Q.yo.actual() && q.participantes.some(function (p) { return Q.yo.es(p); });
      var botonIr = q.estado === "cancelada" ? null : h("button", { type: "button", class: "boton " + (yoVoy ? "boton--secundario" : "boton--primario"),
        onclick: function () {
          Q.yo.asegurar("Elige tu nombre para apuntarte a la quedada.").then(function (yo) {
            if (!yo) return;
            var voy = q.participantes.some(function (p) { return Q.yo.es(p); });
            ocupado(botonIr, voy ? "Quitándote…" : "Apuntándote…");
            recien = voy ? null : yo.nombre;
            Q.api.hacer(voy ? "desapuntarse" : "apuntarse", { id: q.id }).then(function () {
              Q.toast(voy ? "Ya no apareces en «" + q.titulo + "»." : "Te has apuntado a «" + q.titulo + "».");
            }, function (e) { recien = null; Q.toast(e.message, "error"); pintar(); });
          });
        } }, yoVoy ? Q.icono("cerrar", "ico--s") : Q.icono("check", "ico--s"), yoVoy ? "Ya no voy" : "Me apunto");
      var part = h("div", { class: "participantes" });
      q.participantes.forEach(function (p) {
        var nuevo = recien && Q.normalizar(p) === Q.normalizar(recien);
        part.appendChild(h("span", { class: "participante" + (nuevo ? " participante--nuevo" : "") }, Q.avatar(p, "xs", true), p));
      });
      recien = null;
      if (!q.participantes.length) part.appendChild(h("p", { class: "tenue" }, "Aún no se ha apuntado nadie."));
      cuerpo.appendChild(h("section", { style: { display: "grid", gap: "10px" } },
        h("div", { class: "seccion__tit", style: { marginBottom: 0 } }, h("h3", null, "Van " + q.participantes.length), botonIr),
        h("p", { class: "sub" }, "Organiza ", h("strong", null, q.organizador)),
        part));

      var fotos = Q.fotosOrdenadas().filter(function (f) { return f.quedadaId === q.id; });
      var tira = h("div", { class: "fotos-tira" });
      fotos.slice(0, 6).forEach(function (f) {
        tira.appendChild(h("button", { type: "button", class: "foto-mini", style: { aspectRatio: "1" }, onclick: function () { Q.abrirFoto(f.id, fotos.map(function (x) { return x.id; })); }, "aria-label": "Ver foto " + (f.titulo || "") },
          h("img", { src: Q.api.urlFoto(f, 300), alt: f.titulo || "Foto de la quedada", loading: "lazy" })));
      });
      cuerpo.appendChild(h("section", { style: { display: "grid", gap: "10px" } },
        h("div", { class: "seccion__tit", style: { marginBottom: 0 } }, h("h3", null, fotos.length ? "Fotos (" + fotos.length + ")" : "Fotos"),
          fotos.length > 6 ? h("a", { href: "#/galeria?quedada=" + q.id }, "Ver todas") : null),
        fotos.length ? tira : h("p", { class: "tenue" }, "Todavía no hay fotos de esta quedada."),
        h("button", { type: "button", class: "boton boton--secundario", style: { justifySelf: "start" }, onclick: function () { Q.subirFotos({ quedadaId: q.id }); } }, Q.icono("camara", "ico--s"), "Subir fotos de esta quedada")));

      var acciones = h("div", { class: "acciones", style: { borderTop: "1px solid var(--linea-2)", paddingTop: "16px" } },
        h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { ics(q); } }, Q.icono("calendario", "ico--s"), "Añadir a mi calendario"));
      if (q.estado !== "cancelada") {
        acciones.appendChild(h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { Q.formQuedada({ quedada: q }); } }, Q.icono("editar", "ico--s"), "Editar"));
        acciones.appendChild(h("button", { type: "button", class: "boton boton--peligro boton--s", onclick: function () {
          Q.yo.asegurar().then(function (yo) {
            if (!yo) return;
            Q.confirmar("Se marcará como cancelada para todo el grupo. Se puede reactivar después.", { titulo: "¿Cancelar «" + q.titulo + "»?", aceptar: "Cancelar quedada", cancelar: "No, mantenerla", peligro: true }).then(function (si) {
              if (!si) return;
              Q.api.hacer("cancelarQuedada", { id: q.id }).then(function () { Q.toast("Quedada cancelada."); }, function (e) { Q.toast(e.message, "error"); });
            });
          });
        } }, Q.icono("papelera", "ico--s"), "Cancelar quedada"));
      } else {
        acciones.appendChild(h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () {
          Q.yo.asegurar().then(function (yo) {
            if (!yo) return;
            Q.api.hacer("reactivarQuedada", { id: q.id }).then(function () { Q.toast("Quedada reactivada."); }, function (e) { Q.toast(e.message, "error"); });
          });
        } }, Q.icono("recargar", "ico--s"), "Reactivar"));
      }
      cuerpo.appendChild(acciones);
      var firma = "Creada por " + q.organizador + (q.actualizadoPor && q.actualizadoPor !== q.organizador ? ". Último cambio de " + q.actualizadoPor + "." : ".");
      cuerpo.appendChild(h("p", { class: "tenue", style: { fontSize: "var(--t-xs)" } }, firma));
    }
    pintar();
  };

  function ocupado(boton, texto) {
    boton.disabled = true;
    Q.vaciar(boton).appendChild(Q.icono("recargar", "ico--s girando"));
    boton.appendChild(document.createTextNode(texto));
  }
  Q.ocupado = ocupado;

  /* ------------------------------------------------------------ formulario de quedada */
  Q.formQuedada = function (op) {
    op = op || {};
    var editando = op.quedada || null;
    return Q.yo.asegurar(editando ? "Elige tu nombre para editar la quedada." : "Elige tu nombre: aparecerás como quien organiza.").then(function (yo) {
      if (!yo) return;
      var ini = editando ? Q.leerFecha(editando.inicio) : null;
      var finE = editando && editando.fin ? Q.leerFecha(editando.fin) : null;
      var fechaInicial = editando ? Q.isoDia(ini) : (op.fecha || "");
      var lugarSel = null;
      if (editando && editando.lugarNombre) lugarSel = { id: editando.lugarId || "", nombre: editando.lugarNombre, direccion: editando.lugarDireccion || "", lat: editando.lat || "", lng: editando.lng || "" };
      else if (op.lugarId && Q.lugar[op.lugarId]) { var lg = Q.lugar[op.lugarId]; lugarSel = { id: lg.id, nombre: lg.nombre, direccion: lg.direccion, lat: lg.lat, lng: lg.lng }; }

      var cTitulo = Q.campo({ etiqueta: "Nombre de la quedada", nombre: "titulo", max: 80, requerido: true, placeholder: "Ej.: Atardecer en el Templo de Debod", valor: editando ? editando.titulo : (op.titulo || "") });
      var cFecha = Q.campo({ etiqueta: "Día", nombre: "fecha", tipo: "date", requerido: true, valor: fechaInicial, min: editando ? null : Q.isoDia(new Date()) });
      var cHora = Q.campo({ etiqueta: "Hora de inicio", nombre: "hora", tipo: "time", requerido: true, valor: ini ? Q.hora(ini) : "" });
      var cFin = Q.campo({ etiqueta: "Hora de fin", nombre: "fin", tipo: "time", valor: finE ? Q.hora(finE) : "" });
      var cDesc = Q.campo({ etiqueta: "Qué vamos a hacer", nombre: "descripcion", tipo: "area", max: 600, placeholder: "Punto de encuentro, qué llevar, precio aproximado…", valor: editando ? editando.descripcion : "" });

      /* lugar con sugerencias de los sitios recomendados */
      var cLugar = Q.campo({ etiqueta: "Lugar", nombre: "lugar", placeholder: "Busca un sitio del mapa o escribe otro", ayuda: "Si eliges uno de los sitios recomendados, la quedada aparecerá enlazada en el mapa." });
      cLugar.control.setAttribute("role", "combobox");
      cLugar.control.setAttribute("aria-autocomplete", "list");
      cLugar.control.setAttribute("aria-expanded", "false");
      var envSug = h("div", { class: "sugerencias-lugar" });
      cLugar.control.replaceWith(envSug);
      envSug.appendChild(cLugar.control);
      var listaSug = h("ul", { role: "listbox", id: Q.id("sug"), hidden: true });
      cLugar.control.setAttribute("aria-controls", listaSug.id);
      envSug.appendChild(listaSug);
      var elegido = h("div");
      cLugar.el.insertBefore(elegido, cLugar.el.querySelector(".campo__ayuda"));
      var activo = -1, opciones = [];

      function pintarElegido() {
        Q.vaciar(elegido);
        if (lugarSel) {
          envSug.hidden = true;
          elegido.appendChild(h("div", { class: "lugar-elegido" },
            h("div", null, h("strong", null, lugarSel.nombre), h("p", { class: "sub", style: { fontSize: "var(--t-xs)" } }, lugarSel.direccion || (lugarSel.id ? "" : "Lugar escrito a mano"))),
            h("button", { type: "button", class: "boton boton--fantasma boton--s", onclick: function () { lugarSel = null; pintarElegido(); cLugar.control.value = ""; cLugar.control.focus(); } }, "Cambiar")));
        } else envSug.hidden = false;
      }
      function sugerir() {
        var t = Q.normalizar(cLugar.control.value);
        Q.vaciar(listaSug); activo = -1;
        if (!t) { listaSug.hidden = true; cLugar.control.setAttribute("aria-expanded", "false"); return; }
        opciones = D.lugares.filter(function (l) { return Q.normalizar(l.nombre + " " + l.direccion).indexOf(t) >= 0; }).slice(0, 6);
        opciones.forEach(function (l, i) {
          listaSug.appendChild(h("li", { role: "presentation" }, h("button", { type: "button", role: "option", id: listaSug.id + "-" + i, "aria-selected": "false",
            onmousedown: function (e) { e.preventDefault(); }, onclick: function () { elegir(l); } }, h("strong", null, l.nombre), h("small", null, l.direccion))));
        });
        var texto = cLugar.control.value.trim();
        listaSug.appendChild(h("li", { role: "presentation" }, h("button", { type: "button", role: "option", id: listaSug.id + "-libre", "aria-selected": "false",
          onmousedown: function (e) { e.preventDefault(); }, onclick: function () { lugarSel = { id: "", nombre: texto, direccion: "", lat: "", lng: "" }; cerrarSug(); pintarElegido(); } },
          h("strong", null, "Usar «" + texto + "»"), h("small", null, "Lugar que no está en el mapa"))));
        listaSug.hidden = false; cLugar.control.setAttribute("aria-expanded", "true");
      }
      function elegir(l) { lugarSel = { id: l.id, nombre: l.nombre, direccion: l.direccion, lat: l.lat, lng: l.lng }; cerrarSug(); pintarElegido(); }
      function cerrarSug() { listaSug.hidden = true; cLugar.control.setAttribute("aria-expanded", "false"); cLugar.control.removeAttribute("aria-activedescendant"); }
      cLugar.control.addEventListener("input", sugerir);
      cLugar.control.addEventListener("blur", function () { setTimeout(cerrarSug, 120); });
      cLugar.control.addEventListener("keydown", function (e) {
        var botones = listaSug.querySelectorAll("button");
        if (listaSug.hidden || !botones.length) { if (e.key === "Enter") e.preventDefault(); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          activo = (activo + (e.key === "ArrowDown" ? 1 : -1) + botones.length) % botones.length;
          botones.forEach(function (b, i) { b.setAttribute("aria-selected", String(i === activo)); });
          cLugar.control.setAttribute("aria-activedescendant", botones[activo].id);
        } else if (e.key === "Enter") { e.preventDefault(); (botones[activo] || botones[0]).click(); }
        else if (e.key === "Escape") { cerrarSug(); }
      });
      pintarElegido();

      var errorGeneral = h("div", { class: "error-bloque", hidden: true, role: "alert", style: { marginBottom: "16px" } });
      var form = h("form", { novalidate: true, id: "form-quedada" },
        errorGeneral, cTitulo.el,
        h("div", { class: "fila-campos", style: { marginTop: "16px" } }, cFecha.el, h("div", { class: "fila-campos", style: { gap: "12px" } }, cHora.el, cFin.el)),
        h("div", { style: { marginTop: "16px" } }, cLugar.el),
        h("div", { style: { marginTop: "16px" } }, cDesc.el),
        h("p", { class: "tenue", style: { marginTop: "16px", fontSize: "var(--t-s)" } }, editando ? "Organiza " + editando.organizador + ". Tu nombre quedará como último cambio." : "Organizas tú (" + yo.nombre + ") y quedas apuntado automáticamente."));
      var guardar = h("button", { type: "submit", form: "form-quedada", class: "boton boton--primario" }, editando ? "Guardar cambios" : "Crear quedada");
      var dlg = Q.dialogo({ titulo: editando ? "Editar quedada" : "Nueva quedada", cuerpo: form, ancho: true, proteger: true,
        pie: [h("button", { type: "button", class: "boton boton--secundario", onclick: function () { dlg.intentarCerrar(); } }, "Cancelar"), guardar] });

      [cTitulo, cFecha, cHora, cFin, cDesc].forEach(function (c) { c.control.addEventListener("input", function () { c.error(null); }); });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        errorGeneral.hidden = true;
        var titulo = cTitulo.valor().replace(/\s+/g, " ");
        var ok = true;
        if (titulo.length < 3) ok = cTitulo.error("Ponle un nombre de al menos 3 letras.") && ok;
        var fecha = cFecha.valor(), hora = cHora.valor(), horaFin = cFin.valor();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) ok = cFecha.error("Elige el día.") && ok;
        if (!/^\d{2}:\d{2}$/.test(hora)) ok = cHora.error("Pon la hora de inicio.") && ok;
        var inicio = fecha + "T" + hora;
        if (ok && !editando && Q.leerFecha(inicio) < new Date()) ok = cFecha.error("Esa fecha y hora ya han pasado.") && ok;
        if (horaFin && hora && horaFin <= hora) ok = cFin.error("Tiene que ser después del inicio.") && ok;
        if (cDesc.valor().length > 600) ok = cDesc.error("Máximo 600 caracteres.") && ok;
        if (!lugarSel && cLugar.control.value.trim()) lugarSel = { id: "", nombre: cLugar.control.value.trim(), direccion: "", lat: "", lng: "" };
        if (ok) {
          var dup = Q.api.estado.quedadas.find(function (x) {
            return (!editando || x.id !== editando.id) && x.estado !== "cancelada" && x.inicio.slice(0, 10) === fecha && Q.normalizar(x.titulo) === Q.normalizar(titulo);
          });
          if (dup) {
            Q.vaciar(errorGeneral).appendChild(h("p", null, "Ya existe «" + dup.titulo + "» ese mismo día. Para no duplicarla, apúntate a la que hay."));
            errorGeneral.appendChild(h("button", { type: "button", class: "boton boton--secundario boton--s", style: { justifySelf: "start" }, onclick: function () { dlg.cerrar(); Q.abrirQuedada(dup.id); } }, "Abrir la quedada existente"));
            errorGeneral.hidden = false;
            ok = false;
          }
        }
        if (!ok) { var inval = form.querySelector('[aria-invalid="true"]'); if (inval) inval.focus(); return; }
        var datos = {
          titulo: titulo, inicio: inicio, fin: horaFin ? fecha + "T" + horaFin : "",
          lugarId: lugarSel ? lugarSel.id : "", lugarNombre: lugarSel ? lugarSel.nombre : "", lugarDireccion: lugarSel ? lugarSel.direccion : "",
          lat: lugarSel ? lugarSel.lat : "", lng: lugarSel ? lugarSel.lng : "", descripcion: cDesc.valor()
        };
        if (editando) datos.id = editando.id;
        ocupado(guardar, "Guardando…");
        Q.api.hacer(editando ? "editarQuedada" : "crearQuedada", datos).then(function (res) {
          dlg.cerrar();
          Q.toast(editando ? "Cambios guardados." : (Q.api.modo === "demo" ? "Quedada creada (solo en esta demostración)." : "Quedada creada. Ya la ve todo el grupo."));
          if (!editando && res && res.quedada) {
            var d = Q.leerFecha(res.quedada.inicio);
            location.hash = Q.construirHash("calendario", null, { vista: "mes", fecha: Q.isoDia(d), quedada: res.quedada.id });
          }
        }, function (err) {
          guardar.disabled = false; Q.vaciar(guardar).appendChild(document.createTextNode(editando ? "Guardar cambios" : "Crear quedada"));
          Q.vaciar(errorGeneral).appendChild(h("p", null, err.message));
          errorGeneral.hidden = false;
          errorGeneral.scrollIntoView({ block: "nearest" });
        });
      });
      if (Q.punteroFino()) setTimeout(function () { (cTitulo.valor() ? cFecha.control : cTitulo.control).focus(); }, 60);
    });
  };

  /* ------------------------------------------------------------ vista calendario */
  function pintar(cont, ruta) {
    var query = ruta.query;
    var vista = ["mes", "semana", "proximas"].indexOf(query.vista) >= 0 ? query.vista : (window.innerWidth < 720 ? "proximas" : "mes");
    var foco = Q.leerFecha(query.fecha) || new Date();

    var titulo = h("h2", { "aria-live": "polite" });
    var prev = h("button", { type: "button", class: "boton-icono", "aria-label": "Anterior", onclick: function () { mover(-1); } }, Q.icono("izq"));
    var next = h("button", { type: "button", class: "boton-icono", "aria-label": "Siguiente", onclick: function () { mover(1); } }, Q.icono("der"));
    var hoyB = h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { foco = new Date(); repintar(); } }, "Hoy");
    var seg = h("div", { class: "segmentado", role: "group", "aria-label": "Vista" });
    [["mes", "Mes"], ["semana", "Semana"], ["proximas", "Próximas"]].forEach(function (v) {
      seg.appendChild(h("button", { type: "button", "aria-pressed": String(v[0] === vista), dataset: { v: v[0] }, onclick: function () { vista = v[0]; repintar(); } }, v[1]));
    });
    cont.appendChild(h("div", { class: "cabecera" },
      h("div", { class: "cabecera__texto" }, h("h1", null, "Calendario de quedadas"),
        h("p", null, "Proponed planes, apuntaos y consultad los detalles. Cualquiera del grupo puede crear, editar o cancelar.")),
      h("button", { type: "button", class: "boton boton--primario", onclick: function () { Q.formQuedada({ fecha: vista !== "proximas" && foco > new Date() ? Q.isoDia(foco) : "" }); } }, Q.icono("mas", "ico--s"), "Nueva quedada")));
    var navCal = h("div", { class: "cal-nav" }, prev, next, titulo, hoyB);
    cont.appendChild(h("div", { class: "cal-barra" }, navCal, seg));
    var disp = h("div", { class: "cal-disposicion" });
    var principal = h("div");
    var lateral = h("aside", { style: { display: "grid", gap: "24px" } });
    disp.appendChild(principal); disp.appendChild(lateral);
    cont.appendChild(disp);

    function mover(n) {
      if (vista === "mes") foco = new Date(foco.getFullYear(), foco.getMonth() + n, 1);
      else foco = Q.sumarDias(foco, 7 * n);
      repintar();
    }
    function eventosDia(d) {
      var iso = Q.isoDia(d);
      return Q.quedadasOrdenadas().filter(function (q) { return q.inicio.slice(0, 10) === iso; });
    }
    function chipEvento(q, clase) {
      var d = Q.leerFecha(q.inicio);
      return h("button", { type: "button", class: clase + (q.estado === "cancelada" ? " " + clase + "--cancelada" : q.ejemplo ? " " + clase + "--ejemplo" : ""),
        title: Q.hora(d) + " " + q.titulo, onclick: function (e) { e.stopPropagation(); Q.abrirQuedada(q.id); } },
        clase === "evento-chip" ? Q.hora(d) + " " + q.titulo : [h("span", null, Q.hora(d) + (q.fin ? "–" + Q.hora(Q.leerFecha(q.fin)) : "")), h("strong", null, q.titulo), q.lugarNombre ? h("span", null, q.lugarNombre) : null]);
    }
    function clicDia(d) {
      var evs = eventosDia(d);
      var pasado = Q.inicioDia(d) < Q.inicioDia(new Date());
      if (!evs.length) { if (!pasado) Q.formQuedada({ fecha: Q.isoDia(d) }); else Q.toast("Ese día ya ha pasado.", "aviso"); return; }
      var lista = h("ul", { class: "lista-quedadas" });
      evs.forEach(function (q) { lista.appendChild(h("li", null, Q.filaQuedada(q))); });
      var dlg = Q.dialogo({ titulo: Q.fechaLarga(d).replace(/^./, function (c) { return c.toUpperCase(); }), cuerpo: lista,
        pie: pasado ? null : [h("button", { type: "button", class: "boton boton--primario", onclick: function () { dlg.cerrar(); Q.formQuedada({ fecha: Q.isoDia(d) }); } }, Q.icono("mas", "ico--s"), "Nueva quedada este día")] });
      lista.addEventListener("click", function () { dlg.cerrar(); });
    }

    function vistaMes() {
      titulo.textContent = Q.mesAnio(foco).replace(/^./, function (c) { return c.toUpperCase(); });
      var mes = h("div", { class: "mes" });
      var cab = h("div", { class: "mes__cabeza", "aria-hidden": "true" });
      ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].forEach(function (d) { cab.appendChild(h("div", null, d)); });
      mes.appendChild(cab);
      var rej = h("div", { class: "mes__rejilla" });
      var primero = new Date(foco.getFullYear(), foco.getMonth(), 1);
      var inicio = Q.inicioSemana(primero);
      var ultimo = new Date(foco.getFullYear(), foco.getMonth() + 1, 0);
      var semanas = Math.ceil((Math.round((ultimo - inicio) / 864e5) + 1) / 7);
      var hoy = new Date();
      for (var i = 0; i < semanas * 7; i++) {
        (function (d) {
          var evs = eventosDia(d);
          var fuera = d.getMonth() !== foco.getMonth();
          /* el número del día es el botón accesible; el resto de la celda también responde al clic del ratón */
          var celda = h("div", { class: "dia" + (fuera ? " dia--fuera" : "") + (Q.mismoDia(d, hoy) ? " dia--hoy" : ""), onclick: function (e) { if (e.target === celda) clicDia(d); } },
            h("button", { type: "button", class: "dia__num", onclick: function () { clicDia(d); },
              "aria-label": Q.fechaLarga(d) + (evs.length ? ", " + Q.plural(evs.length, "quedada", "quedadas") : ", sin quedadas") }, d.getDate()));
          evs.slice(0, 3).forEach(function (q) { celda.appendChild(chipEvento(q, "evento-chip")); });
          if (evs.length > 3) celda.appendChild(h("span", { class: "dia__mas" }, "+" + (evs.length - 3) + " más"));
          rej.appendChild(celda);
        })(Q.sumarDias(inicio, i));
      }
      mes.appendChild(rej);
      principal.appendChild(mes);
    }
    function vistaSemana() {
      var ini = Q.inicioSemana(foco), fin = Q.sumarDias(ini, 6);
      titulo.textContent = ini.getDate() + (ini.getMonth() !== fin.getMonth() ? " " + Q.MESES_C[ini.getMonth()] : "") + " – " + fin.getDate() + " " + Q.MESES_C[fin.getMonth()] + " " + fin.getFullYear();
      var sem = h("div", { class: "semana" });
      var hoy = new Date();
      for (var i = 0; i < 7; i++) {
        (function (d) {
          var col = h("div", { class: "semana__dia" + (Q.mismoDia(d, hoy) ? " semana__dia--hoy" : "") },
            h("div", { class: "semana__cab" }, h("small", null, Q.DIAS[d.getDay()]), h("strong", null, d.getDate())));
          eventosDia(d).forEach(function (q) { col.appendChild(chipEvento(q, "evento-bloque")); });
          if (Q.inicioDia(d) >= Q.inicioDia(hoy)) col.appendChild(h("button", { type: "button", class: "semana__anadir", onclick: function () { Q.formQuedada({ fecha: Q.isoDia(d) }); }, "aria-label": "Nueva quedada el " + Q.fechaLarga(d) }, "+ Añadir"));
          sem.appendChild(col);
        })(Q.sumarDias(ini, i));
      }
      principal.appendChild(sem);
    }
    function vistaProximas() {
      titulo.textContent = "Próximas quedadas";
      var prox = Q.proximasQuedadas();
      if (!prox.length) {
        principal.appendChild(h("div", { class: "vacio" }, h("h3", null, "No hay ninguna quedada a la vista"),
          h("p", null, "Propón la primera: elige una idea de la derecha o crea una desde cero."),
          h("button", { type: "button", class: "boton boton--primario", onclick: function () { Q.formQuedada(); } }, Q.icono("mas", "ico--s"), "Nueva quedada")));
      } else {
        var finSemana = Q.sumarDias(Q.inicioSemana(new Date()), 7);
        var grupos = [["Esta semana", prox.filter(function (q) { return Q.leerFecha(q.inicio) < finSemana; })], ["Más adelante", prox.filter(function (q) { return Q.leerFecha(q.inicio) >= finSemana; })]];
        grupos.forEach(function (g) {
          if (!g[1].length) return;
          var ul = h("ul", { class: "lista-quedadas" });
          g[1].forEach(function (q) { ul.appendChild(h("li", null, Q.filaQuedada(q))); });
          principal.appendChild(h("section", { class: "proximas-grupo" }, h("h3", null, g[0]), ul));
        });
      }
      var hoyIso = Q.isoDia(new Date());
      var pasadas = Q.quedadasOrdenadas().filter(function (q) { return (q.fin || q.inicio).slice(0, 10) < hoyIso || q.estado === "cancelada"; }).reverse();
      if (pasadas.length) {
        var ul2 = h("ul", { class: "lista-quedadas", style: { marginTop: "12px" } });
        pasadas.forEach(function (q) { ul2.appendChild(h("li", null, Q.filaQuedada(q))); });
        principal.appendChild(h("details", { class: "proximas-grupo" }, h("summary", { style: { cursor: "pointer", fontWeight: 650, color: "var(--tinta-2)" } }, "Pasadas y canceladas (" + pasadas.length + ")"), ul2));
      }
    }
    function pintarLateral() {
      Q.vaciar(lateral);
      if (vista !== "proximas") {
        var prox = Q.proximasQuedadas(4);
        var ul = h("ul", { class: "lista-quedadas" });
        prox.forEach(function (q) { ul.appendChild(h("li", null, Q.filaQuedada(q))); });
        lateral.appendChild(h("section", null, h("div", { class: "seccion__tit" }, h("h2", { style: { fontSize: "var(--t-l)" } }, "Próximas")),
          prox.length ? ul : h("p", { class: "tenue" }, "Nada a la vista todavía.")));
      }
      var ideas = h("ul", { class: "ideas" });
      Q.ideasQuedada().slice(0, 5).forEach(function (i) { ideas.appendChild(Q.tarjetaIdea(i)); });
      lateral.appendChild(h("section", null, h("div", { class: "seccion__tit" }, h("h2", { style: { fontSize: "var(--t-l)" } }, "Ideas para quedar"), h("a", { href: "#/recursos/comun" }, "Intereses")), ideas));
    }
    function repintar() {
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === vista)); });
      navCal.style.visibility = vista === "proximas" ? "hidden" : "visible";
      navCal.style.display = vista === "proximas" && window.innerWidth < 720 ? "none" : "";
      Q.vaciar(principal);
      var est = Q.api.estado;
      if (est.cargando && !est.quedadas.length) {
        principal.appendChild(h("div", { class: "esqueleto", style: { height: "420px" }, "aria-label": "Cargando quedadas" }));
      } else if (est.error) {
        principal.appendChild(h("div", { class: "error-bloque", role: "alert" }, h("h3", null, "No se han podido cargar las quedadas"), h("p", null, est.error),
          h("button", { type: "button", class: "boton boton--secundario", style: { justifySelf: "start" }, onclick: function () { Q.api.cargar(); } }, Q.icono("recargar", "ico--s"), "Reintentar")));
      }
      if (!est.error && !(est.cargando && !est.quedadas.length)) {
        if (vista === "mes") vistaMes(); else if (vista === "semana") vistaSemana(); else vistaProximas();
      }
      pintarLateral();
      Q.reemplazarHash(Q.construirHash("calendario", null, { vista: vista, fecha: vista === "proximas" ? "" : Q.isoDia(foco) }));
    }
    var quitar = Q.api.suscribir(repintar);
    repintar();

    if (query.quedada) Q.cuandoCargado(function () { setTimeout(function () { if (Q.quedadaPorId(query.quedada)) Q.abrirQuedada(query.quedada); else Q.toast("Esa quedada ya no existe.", "aviso"); }, 30); });
    if (query.nueva) setTimeout(function () {
      var plan = query.tema ? PLANES_POR_TEMA.find(function (x) { return x.tema === query.tema; }) : null;
      Q.formQuedada({ lugarId: query.lugar || (plan && plan.lugar) || "", titulo: plan ? plan.titulo : "" });
    }, 50);
    return function salir() { quitar(); };
  }

  Q.vistas.calendario = { titulo: "Calendario", pintar: pintar };
})();
