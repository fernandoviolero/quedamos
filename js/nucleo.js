/* Quedamos · núcleo: utilidades, índices de datos, diálogos y enrutado. */
(function () {
  "use strict";
  var Q = (window.Q = window.Q || {});

  /* ------------------------------------------------------------ DOM */
  Q.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "dataset") Object.assign(el.dataset, v);
        else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) anadir(el, arguments[i]);
    return el;
  };
  function anadir(el, hijo) {
    if (hijo === null || hijo === undefined || hijo === false) return;
    if (Array.isArray(hijo)) { hijo.forEach(function (x) { anadir(el, x); }); return; }
    el.appendChild(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
  }
  Q.vaciar = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  var SVGNS = "http://www.w3.org/2000/svg";
  Q.icono = function (nombre, clase) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("class", "ico" + (clase ? " " + clase : ""));
    s.setAttribute("aria-hidden", "true");
    var u = document.createElementNS(SVGNS, "use");
    u.setAttribute("href", "#i-" + nombre);
    s.appendChild(u);
    return s;
  };

  /* ------------------------------------------------------------ texto */
  Q.normalizar = function (s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[“”"«»'’´`]/g, "")
      .replace(/&/g, " y ")
      .replace(/[^a-z0-9ñ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };
  /* parecido entre 0 y 1 (coeficiente de Dice sobre bigramas), tolera faltas leves */
  Q.parecido = function (a, b) {
    a = Q.normalizar(a).replace(/ /g, ""); b = Q.normalizar(b).replace(/ /g, "");
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    var m = {}, i, n = 0;
    for (i = 0; i < a.length - 1; i++) { var x = a.substr(i, 2); m[x] = (m[x] || 0) + 1; }
    for (i = 0; i < b.length - 1; i++) { var y = b.substr(i, 2); if (m[y] > 0) { m[y]--; n++; } }
    return (2 * n) / (a.length + b.length - 2);
  };
  Q.iniciales = function (nombre) {
    var p = String(nombre || "?").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/);
    if (!p[0]) return "?";
    return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
  };
  Q.plural = function (n, uno, varios) { return n + " " + (n === 1 ? uno : varios); };
  Q.listaNombres = function (nombres, max) {
    max = max || 3;
    if (nombres.length <= max) {
      if (nombres.length <= 1) return nombres.join("");
      return nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1];
    }
    return nombres.slice(0, max).join(", ") + " y " + Q.plural(nombres.length - max, "más", "más");
  };
  Q.id = function (prefijo) {
    return (prefijo || "x") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  /* ------------------------------------------------------------ colores de persona */
  var PALETA = ["#2445C8", "#DE3F48", "#23805A", "#6E56CF", "#D97B06", "#0A8DB0", "#C83E97", "#9A6233", "#0F6E66", "#5E6B80"];
  Q.colorDe = function (texto) {
    var h = 0, s = Q.normalizar(texto);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETA[h % PALETA.length];
  };

  /* ------------------------------------------------------------ fechas (es-ES) */
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var MESES_C = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIAS_C = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  Q.MESES = MESES; Q.DIAS = DIAS; Q.DIAS_C = DIAS_C; Q.MESES_C = MESES_C;
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  Q.isoDia = function (d) { return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); };
  Q.isoLocal = function (d) { return Q.isoDia(d) + "T" + dos(d.getHours()) + ":" + dos(d.getMinutes()); };
  Q.leerFecha = function (s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
    if (!m) { var d = new Date(s); return isNaN(d) ? null : d; }
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  };
  Q.hora = function (d) { return dos(d.getHours()) + ":" + dos(d.getMinutes()); };
  Q.fechaLarga = function (d) { return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()]; };
  Q.fechaCorta = function (d) { return DIAS_C[d.getDay()] + " " + d.getDate() + " " + MESES_C[d.getMonth()]; };
  Q.mesAnio = function (d) { return MESES[d.getMonth()] + " " + d.getFullYear(); };
  Q.mismoDia = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
  Q.inicioDia = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  Q.sumarDias = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  Q.inicioSemana = function (d) { var x = Q.inicioDia(d); var dia = (x.getDay() + 6) % 7; return Q.sumarDias(x, -dia); };
  Q.relativo = function (d) {
    var hoy = Q.inicioDia(new Date());
    var diff = Math.round((Q.inicioDia(d) - hoy) / 864e5);
    if (diff === 0) return "hoy";
    if (diff === 1) return "mañana";
    if (diff === -1) return "ayer";
    if (diff > 1 && diff < 7) return "este " + DIAS[d.getDay()];
    return null;
  };

  /* ------------------------------------------------------------ índices de los datos del formulario */
  var D = window.DATOS || { personas: [], recursos: [], lugares: [], categorias: [], tiposLugar: [], temas: [], ediciones: [], respuestas: [], propuestas: [], mensajes: [] };
  Q.D = D;
  function mapa(lista) { var m = {}; lista.forEach(function (x) { m[x.id] = x; }); return m; }
  Q.persona = mapa(D.personas);
  Q.recurso = mapa(D.recursos);
  Q.lugar = mapa(D.lugares);
  Q.categoria = mapa(D.categorias);
  Q.tipoLugar = mapa(D.tiposLugar);
  Q.tema = mapa(D.temas);
  Q.edicion = mapa(D.ediciones);

  var porNombre = {};
  D.personas.forEach(function (p) { porNombre[Q.normalizar(p.nombre)] = p; });
  Q.personaPorNombre = function (nombre) { return porNombre[Q.normalizar(nombre)] || null; };

  D.recursos.forEach(function (r) {
    r.personas = [];
    r.recomendaciones.forEach(function (x) { if (r.personas.indexOf(x.persona) < 0) r.personas.push(x.persona); });
    r.n = r.personas.length;
    r._texto = Q.normalizar([r.nombre, r.subtipo, r.descripcion, (Q.categoria[r.categoria] || {}).nombre,
      r.temas.map(function (t) { return (Q.tema[t] || {}).nombre; }).join(" "),
      r.recomendaciones.map(function (x) { return x.texto + " " + (Q.persona[x.persona] || {}).nombre; }).join(" "),
      (r.lugares || []).map(function (l) { return Q.lugar[l].direccion; }).join(" ")].join(" "));
  });

  /* lugares -> recursos y personas */
  D.lugares.forEach(function (l) { l.recursos = []; l.personas = []; });
  D.recursos.forEach(function (r) {
    (r.lugares || []).forEach(function (lid) {
      var l = Q.lugar[lid];
      l.recursos.push(r.id);
      r.personas.forEach(function (p) { if (l.personas.indexOf(p) < 0) l.personas.push(p); });
    });
  });

  /* personas -> recursos */
  Q.recursosDe = {};
  D.personas.forEach(function (p) { Q.recursosDe[p.id] = []; });
  D.recursos.forEach(function (r) { r.personas.forEach(function (p) { Q.recursosDe[p].push(r.id); }); });

  /* temas -> personas y recursos */
  Q.temas = D.temas.map(function (t) {
    var recursos = D.recursos.filter(function (r) { return r.temas.indexOf(t.id) >= 0; });
    var personas = [];
    recursos.forEach(function (r) { r.personas.forEach(function (p) { if (personas.indexOf(p) < 0) personas.push(p); }); });
    return { id: t.id, nombre: t.nombre, recursos: recursos, personas: personas };
  }).filter(function (t) { return t.personas.length > 0; })
    .sort(function (a, b) { return b.personas.length - a.personas.length || a.nombre.localeCompare(b.nombre, "es"); });
  Q.temaCalculado = mapa(Q.temas);

  /* afinidad: recursos compartidos pesan 3, temas compartidos 1 */
  Q.afines = function (pid) {
    var mios = Q.recursosDe[pid] || [];
    var misTemas = {};
    Q.temas.forEach(function (t) { if (t.personas.indexOf(pid) >= 0) misTemas[t.id] = t; });
    return D.personas.filter(function (p) { return p.id !== pid; }).map(function (p) {
      var comunes = mios.filter(function (r) { return Q.recursosDe[p.id].indexOf(r) >= 0; });
      var temas = Object.keys(misTemas).filter(function (t) { return misTemas[t].personas.indexOf(p.id) >= 0; });
      return { persona: p, recursos: comunes, temas: temas, puntos: comunes.length * 3 + temas.length };
    }).filter(function (x) { return x.puntos > 0; })
      .sort(function (a, b) { return b.puntos - a.puntos || a.persona.nombre.localeCompare(b.persona.nombre, "es"); });
  };

  Q.ordenAlfa = function (a, b) { return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }); };

  /* ------------------------------------------------------------ enlaces externos reales */
  var enc = encodeURIComponent;
  Q.enlaceRecurso = function (r) {
    if (r.enlace) return r.enlace;
    var q = r.busqueda || r.nombre;
    var sub = (r.subtipo || "").toLowerCase();
    if (r.lugares && r.lugares.length) {
      var l = Q.lugar[r.lugares[0]];
      return { url: "https://www.google.com/maps/search/?api=1&query=" + enc(l.nombre + ", " + l.direccion), texto: "Ver en Google Maps" };
    }
    if (r.sinUbicacion) return { url: "https://www.google.com/maps/search/?api=1&query=" + enc(r.sinUbicacion.buscar), texto: "Buscar en Google Maps" };
    if (r.tipo === "aficion") return null;
    if (r.categoria === "musica") return { url: "https://open.spotify.com/search/" + enc(q), texto: "Buscar en Spotify" };
    if (r.categoria === "cine") return { url: "https://www.filmaffinity.com/es/search.php?stext=" + enc(q), texto: "Buscar en FilmAffinity" };
    if (r.categoria === "libros") return { url: "https://www.goodreads.com/search?q=" + enc(q), texto: "Buscar en Goodreads" };
    if (sub === "app" || sub === "juego") return { url: "https://play.google.com/store/search?q=" + enc(q) + "&c=apps", texto: "Buscar en Google Play" };
    return { url: "https://www.google.com/search?q=" + enc(q), texto: "Buscar en Google" };
  };
  Q.comoLlegar = function (l) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + l.lat + "," + l.lng + "&travelmode=transit";
  };
  Q.comoLlegarTexto = function (texto) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + enc(texto) + "&travelmode=transit";
  };

  /* ------------------------------------------------------------ piezas de interfaz */
  Q.avatar = function (personaONombre, tam, sinEnlace) {
    var p = typeof personaONombre === "string" ? (Q.persona[personaONombre] || Q.personaPorNombre(personaONombre) || { nombre: personaONombre }) : personaONombre;
    var enlace = p.id && !sinEnlace;
    var a = Q.h(enlace ? "a" : "span", {
      class: "avatar" + (tam ? " avatar--" + tam : ""),
      title: p.nombre, href: enlace ? "#/persona/" + p.id : null
    }, Q.iniciales(p.nombre));
    a.style.setProperty("--a", Q.colorDe(p.nombre));
    if (sinEnlace) a.setAttribute("aria-hidden", "true");
    else if (!enlace) a.setAttribute("aria-label", p.nombre);
    return a;
  };
  Q.pila = function (ids, max, tam, sinEnlace) {
    max = max || 5;
    var el = Q.h("span", { class: "pila" });
    ids.slice(0, max).forEach(function (id) { el.appendChild(Q.avatar(id, tam || "s", sinEnlace)); });
    if (ids.length > max) el.appendChild(Q.h("span", { class: "pila__mas" }, "+" + (ids.length - max)));
    return el;
  };
  Q.nombre = function (id) { return (Q.persona[id] || { nombre: id }).nombre; };
  /* nombre de pila; si hay otra persona con el mismo, añade la inicial del apellido */
  var pilas = {};
  D.personas.forEach(function (p) { var n = Q.normalizar(p.nombre.split(" ")[0]); pilas[n] = (pilas[n] || 0) + 1; });
  Q.nombreCorto = function (id) {
    var completo = Q.nombre(id), partes = completo.split(" ");
    if (partes.length > 1 && pilas[Q.normalizar(partes[0])] > 1) return partes[0] + " " + partes[1].charAt(0) + ".";
    return partes[0];
  };

  Q.etiquetaCat = function (cid) {
    var c = Q.categoria[cid];
    var e = Q.h("span", { class: "etiqueta etiqueta--cat" }, c.nombre);
    e.style.setProperty("--c", c.color);
    return e;
  };
  var ICONO_CAT = { musica: "musica", cine: "cine", libros: "libro", cultura: "teatro", gastro: "comida", lugares: "pin", deporte: "deporte", hobbies: "paleta", habitos: "chispa" };
  Q.iconoCategoria = function (cid) { return ICONO_CAT[cid] || "chispa"; };
  var ICONO_TIPO = { parque: "arbol", mirador: "mirador", naturaleza: "montana", restaurante: "comida", cafeteria: "cafe", noche: "copa", cultura: "teatro", taller: "paleta", compras: "bolsa" };
  Q.iconoTipo = function (tid) { return ICONO_TIPO[tid] || "pin"; };

  /* ------------------------------------------------------------ avisos (toasts) */
  Q.toast = function (texto, tipo) {
    tipo = tipo || "ok";
    var cont = document.getElementById("toasts");
    var t = Q.h("div", { class: "toast toast--" + tipo, role: tipo === "error" ? "alert" : "status" },
      Q.icono(tipo === "ok" ? "check" : tipo === "error" ? "alerta" : "info"), Q.h("p", null, texto));
    cont.appendChild(t);
    setTimeout(function () { t.remove(); }, tipo === "error" ? 7000 : 4200);
  };

  /* ------------------------------------------------------------ diálogos */
  Q.dialogo = function (op) {
    var d = Q.h("dialog", { class: (op.cajon ? "cajon" : "dialogo") + (op.ancho ? " dialogo--ancho" : ""), "aria-labelledby": "dlg-tit" });
    var cerrar = Q.h("button", { class: "boton-icono boton-icono--sin-borde", type: "button", "aria-label": "Cerrar", onclick: function () { intentarCerrar(); } }, Q.icono("cerrar"));
    /* proteger: avisa antes de cerrar si se ha escrito algo (o si la función dada devuelve true) */
    var sucio = false, preguntando = false;
    function intentarCerrar() {
      var hayCambios = typeof op.proteger === "function" ? op.proteger() : (op.proteger && sucio);
      if (!hayCambios) { d.close(); return; }
      if (preguntando) return;
      preguntando = true;
      Q.confirmar("Lo que has escrito no se ha guardado y se perderá.", { titulo: "¿Salir sin guardar?", aceptar: "Salir sin guardar", cancelar: "Seguir editando", peligro: true })
        .then(function (si) { preguntando = false; if (si) d.close(); });
    }
    var tit = Q.h("h2", { id: "dlg-tit", tabindex: "-1" }, op.titulo);
    var cuerpo = Q.h("div", { class: "dialogo__cuerpo" }, op.cuerpo);
    d.appendChild(Q.h("div", { class: "dialogo__cabeza" }, tit, cerrar));
    d.appendChild(cuerpo);
    var pie = null;
    if (op.pie) { pie = Q.h("div", { class: "dialogo__pie" }, op.pie); d.appendChild(pie); }
    d.addEventListener("close", function () { d.remove(); if (op.alCerrar) op.alCerrar(d.returnValue); });
    d.addEventListener("click", function (e) { if (e.target === d) intentarCerrar(); });
    d.addEventListener("cancel", function (e) { e.preventDefault(); intentarCerrar(); });
    d.addEventListener("input", function () { sucio = true; });
    document.body.appendChild(d);
    d.showModal();
    tit.focus();
    return { el: d, cuerpo: cuerpo, pie: pie, titulo: tit, cerrar: function (v) { d.close(v); }, intentarCerrar: intentarCerrar };
  };
  Q.confirmar = function (texto, op) {
    op = op || {};
    return new Promise(function (resolve) {
      var ok = false;
      var dlg = Q.dialogo({
        titulo: op.titulo || "¿Seguro?",
        cuerpo: Q.h("p", { class: "sub" }, texto),
        pie: [
          Q.h("button", { class: "boton boton--secundario", type: "button", onclick: function () { dlg.cerrar(); } }, op.cancelar || "Volver"),
          Q.h("button", { class: "boton " + (op.peligro ? "boton--peligro" : "boton--primario"), type: "button", onclick: function () { ok = true; dlg.cerrar(); } }, op.aceptar || "Aceptar")
        ],
        alCerrar: function () { resolve(ok); }
      });
    });
  };

  Q.punteroFino = function () { return !window.matchMedia || window.matchMedia("(pointer: fine)").matches; };

  /* ------------------------------------------------------------ campos con validación */
  Q.campo = function (op) {
    var id = op.id || Q.id("c");
    var control;
    if (op.tipo === "area") control = Q.h("textarea", { class: "area", id: id, name: op.nombre, maxlength: op.max, placeholder: op.placeholder, rows: op.filas || 3 });
    else if (op.tipo === "select") {
      control = Q.h("select", { class: "selector", id: id, name: op.nombre });
      (op.opciones || []).forEach(function (o) { control.appendChild(Q.h("option", { value: o.valor }, o.texto)); });
    } else control = Q.h("input", { class: "entrada", id: id, name: op.nombre, type: op.tipo || "text", maxlength: op.max, placeholder: op.placeholder, min: op.min, autocomplete: op.autocompletar || "off", inputmode: op.inputmode });
    if (op.valor !== undefined && op.valor !== null) control.value = op.valor;
    if (op.requerido) control.setAttribute("aria-required", "true");
    var err = Q.h("p", { class: "campo__error", id: id + "-err", hidden: true });
    var ayuda = op.ayuda ? Q.h("p", { class: "campo__ayuda", id: id + "-ayuda" }, op.ayuda) : null;
    control.setAttribute("aria-describedby", (ayuda ? id + "-ayuda " : "") + id + "-err");
    var envoltura = Q.h("div", { class: "campo" },
      Q.h("label", { for: id }, op.etiqueta, op.requerido ? null : Q.h("span", { class: "tenue", style: { fontWeight: 500 } }, " (opcional)")),
      op.antes || null, control, ayuda, err);
    return {
      el: envoltura, control: control,
      valor: function () { return control.value.trim(); },
      error: function (msg) {
        if (msg) { Q.vaciar(err); err.appendChild(Q.icono("alerta", "ico--s")); err.appendChild(document.createTextNode(msg)); err.hidden = false; control.setAttribute("aria-invalid", "true"); }
        else { err.hidden = true; control.removeAttribute("aria-invalid"); }
        return !msg;
      }
    };
  };

  /* ------------------------------------------------------------ carga perezosa de scripts y estilos */
  var cargados = {};
  Q.cargarScript = function (src) {
    if (cargados[src]) return cargados[src];
    cargados[src] = new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = ok; s.onerror = function () { delete cargados[src]; ko(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
    return cargados[src];
  };
  Q.cargarCss = function (href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    document.head.appendChild(Q.h("link", { rel: "stylesheet", href: href, crossorigin: "anonymous" }));
  };
  Q.cargarLeaflet = function () {
    Q.cargarCss("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
    Q.cargarCss("https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.min.css");
    return Q.cargarScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js")
      .then(function () { return Q.cargarScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js"); });
  };
  /* Fondo del mapa.
     - Por defecto: OpenStreetMap, gratis y sin clave.
     - Si en config.js hay cartoClave (gratis pidiéndola a CARTO): estilo Voyager, más limpio. */
  var OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';
  Q.capaBase = function () {
    var clave = String((window.CONFIG && window.CONFIG.cartoClave) || "").trim();
    if (clave) {
      return L.tileLayer("https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=" + encodeURIComponent(clave), {
        maxZoom: 19, attribution: OSM + ' &copy; <a href="https://carto.com/attributions">CARTO</a>'
      });
    }
    var url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
    var opciones = { maxZoom: 19, attribution: OSM };
    if (location.protocol !== "file:") return L.tileLayer(url, opciones);
    /* Abierta con doble clic (file://) el navegador no manda «Referer» y OpenStreetMap
       pide que la web se identifique; se hace con la cabecera X-Requested-With. */
    var CapaIdentificada = L.TileLayer.extend({
      createTile: function (coords, hecho) {
        var img = document.createElement("img");
        img.alt = "";
        img.setAttribute("role", "presentation");
        fetch(this.getTileUrl(coords), { headers: { "X-Requested-With": "Quedamos (mapa de recomendaciones de un grupo)" } })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); })
          .then(function (blob) {
            var u = URL.createObjectURL(blob);
            img.onload = function () { URL.revokeObjectURL(u); hecho(null, img); };
            img.onerror = function () { URL.revokeObjectURL(u); hecho(new Error("tesela"), img); };
            img.src = u;
          })
          .catch(function (e) { hecho(e, img); });
        return img;
      }
    });
    return new CapaIdentificada(url, opciones);
  };
  Q.iconoMarcador = function (lugar, activo) {
    var t = Q.tipoLugar[lugar.tipo] || { color: "#2445C8" };
    var n = lugar.personas ? lugar.personas.length : 0;
    var html = '<div class="marcador' + (activo ? " marcador--activo" : "") + '" style="--c:' + t.color + '">' +
      '<svg class="pin" viewBox="0 0 34 42"><path d="M17 41C17 41 2 26.5 2 16a15 15 0 0 1 30 0C32 26.5 17 41 17 41z"/></svg>' +
      '<svg class="ico"><use href="#i-' + Q.iconoTipo(lugar.tipo) + '"/></svg>' +
      (n > 1 ? '<span class="marcador__n">' + n + "</span>" : "") + "</div>";
    return L.divIcon({ html: html, className: "", iconSize: [34, 42], iconAnchor: [17, 41], popupAnchor: [0, -38] });
  };

  /* ------------------------------------------------------------ enrutado por hash */
  Q.vistas = {};
  Q.ruta = function () {
    var h = location.hash.replace(/^#\/?/, "");
    var partes = h.split("?");
    var trozos = partes[0].split("/").filter(Boolean);
    var query = {};
    (partes[1] || "").split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      query[k] = i < 0 ? "" : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
    });
    return { seccion: trozos[0] || "inicio", param: trozos[1] || null, query: query };
  };
  Q.construirHash = function (seccion, param, query) {
    var q = [];
    for (var k in query || {}) if (query[k] !== undefined && query[k] !== null && query[k] !== "") q.push(encodeURIComponent(k) + "=" + encodeURIComponent(query[k]));
    return "#/" + seccion + (param ? "/" + param : "") + (q.length ? "?" + q.join("&") : "");
  };
  /* cambia la URL sin volver a pintar la vista (filtros) */
  Q.reemplazarHash = function (hash) {
    Q._ignorarHash = true;
    history.replaceState(null, "", hash);
    Q._ignorarHash = false;
  };
})();
