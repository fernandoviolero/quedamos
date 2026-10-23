/* Quedamos · herramienta de importación de formularios.
   Todo ocurre en tu navegador: el Excel no se sube a ningún sitio.
   El progreso se guarda en este navegador para que no lo pierdas si cierras la pestaña. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h;
  var ORIG = window.DATOS_ORIGINAL;
  var CLAVE = "quedamos.importacion";
  var cont = document.getElementById("pasos");

  var est = cargar() || nuevoEstado();
  function nuevoEstado() { return { archivo: null, cabeceras: [], filas: [], colNombre: -1, colFecha: -1, columnas: [], edicion: { id: "", nombre: "" }, personas: {}, items: [], paso: 1 }; }
  function cargar() { try { return JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { return null; } }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(est)); } catch (e) { /* sin espacio: se sigue en memoria */ } }

  var MESES = Q.MESES;
  var CATS = ORIG.categorias;
  var TIPOS_LUGAR = ORIG.tiposLugar;

  /* ------------------------------------------------------------ utilidades */
  function slug(t) { return Q.normalizar(t).replace(/ /g, "-").slice(0, 40) || "x"; }
  function idUnico(base, usados) { var id = base, i = 2; while (usados[id]) id = base + "-" + i++; usados[id] = true; return id; }
  function adivinarPregunta(cab) {
    var t = Q.normalizar(cab);
    if (/sitio|lugar|rincon|madrid|cafeteria|restaurante/.test(t)) return { id: "lugar", nombre: "Sitio de Madrid", esLugar: true };
    if (/cultural|cancion|pelicula|libro|serie|podcast/.test(t)) return { id: "cultura", nombre: "Recomendación cultural", esLugar: false };
    if (/libre|habito|aplicacion|consejo|pasatiempo/.test(t)) return { id: "libre", nombre: "Recomendación libre", esLugar: false };
    if (/duda|sugerencia|comentar/.test(t)) return { id: "sugerencia", nombre: "Sugerencias", esLugar: false };
    return { id: slug(cab).slice(0, 20), nombre: cab.slice(0, 40), esLugar: false };
  }
  function adivinarCategoria(texto, preguntaId, esLugar) {
    var t = Q.normalizar(texto);
    if (/restaurante|bar |cafe|cafeteria|sushi|hamburgues|pizza|brunch|helad|tapas|bocata|comer|cena|pasta|ramen|pasteleria/.test(t)) return "gastro";
    if (esLugar) return /teatro|museo/.test(t) ? "cultura" : "lugares";
    if (/podcast|cancion|disco|cantante|album|musica|grupo/.test(t)) return "musica";
    if (/pelicula|peli|serie|documental|netflix/.test(t)) return "cine";
    if (/libro|saga|novela|trilogia|leer|comic/.test(t)) return "libros";
    if (/teatro|exposicion|museo|concierto|obra/.test(t)) return "cultura";
    if (/app|aplicacion|web/.test(t)) return "habitos";
    if (/correr|gym|gimnasio|deporte|bici|nadar|yoga|baile|futbol|padel|senderismo|ruta/.test(t)) return "deporte";
    if (/pintar|coser|manualidad|ceramica|dibujar|fotograf|crochet|ganchillo|colorear|velas/.test(t)) return "hobbies";
    return preguntaId === "cultura" ? "cultura" : "habitos";
  }
  /* separa una respuesta en trozos probables; se pueden corregir a mano */
  function trocear(texto) {
    return String(texto).split(/\n|;|,(?![^(]*\))|\.\s+(?=[A-ZÁÉÍÓÚÑ«“"])|\s+y\s+(?=[A-ZÁÉÍÓÚÑ«“"])/)
      .map(function (x) { return x.replace(/^[\s\-•·:.]+|[\s.]+$/g, "").trim(); })
      .filter(function (x) { return x.length >= 2 && x !== "."; });
  }
  /* recursos existentes parecidos a un texto */
  function candidatos(texto) {
    var n = Q.normalizar(texto);
    return ORIG.recursos.map(function (r) {
      var nr = Q.normalizar(r.nombre);
      var p = Q.parecido(texto, r.nombre);
      if (nr.length > 3 && (n.indexOf(nr) >= 0 || nr.indexOf(n) >= 0)) p = Math.max(p, 0.9);
      return { r: r, p: p };
    }).filter(function (x) { return x.p >= 0.5; }).sort(function (a, b) { return b.p - a.p; }).slice(0, 4);
  }
  function personaExistente(nombre) {
    var n = Q.normalizar(nombre);
    var exacta = ORIG.personas.find(function (p) { return Q.normalizar(p.nombre) === n; });
    if (exacta) return { p: exacta, seguro: true };
    var mejor = ORIG.personas.map(function (p) { return { p: p, s: Q.parecido(p.nombre, nombre) }; }).sort(function (a, b) { return b.s - a.s; })[0];
    return mejor && mejor.s >= 0.75 ? { p: mejor.p, seguro: false } : null;
  }
  function selector(opciones, valor, attrs) {
    var s = h("select", Object.assign({ class: "selector" }, attrs || {}));
    opciones.forEach(function (o) { s.appendChild(h("option", { value: o[0] }, o[1])); });
    s.value = valor;
    return s;
  }

  /* ------------------------------------------------------------ paso 1: archivo */
  function paso1() {
    var entrada = h("input", { type: "file", accept: ".xlsx,.xls,.csv", class: "visualmente-oculto", id: "excel" });
    var zona = h("label", { class: "zona-soltar", for: "excel" }, Q.icono("subir"), h("strong", null, "Elige el Excel descargado de Google Forms"), h("span", { class: "tenue" }, "También vale .csv. No sale de tu ordenador."));
    var estado = h("p", { class: "sub", style: { marginTop: "12px" } }, est.archivo ? "Archivo cargado: " + est.archivo + " (" + Q.plural(est.filas.length, "respuesta", "respuestas") + ")." : "");
    entrada.addEventListener("change", function () {
      var f = entrada.files[0];
      if (!f) return;
      if (!window.XLSX) { Q.toast("No se pudo cargar el lector de Excel. Comprueba la conexión y recarga.", "error"); return; }
      var lector = new FileReader();
      lector.onload = function () {
        try {
          var libro = XLSX.read(new Uint8Array(lector.result), { type: "array", cellDates: true });
          var hoja = libro.Sheets[libro.SheetNames[0]];
          var filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: "" });
          if (filas.length < 2) throw new Error("El archivo no tiene respuestas.");
          est = nuevoEstado();
          est.archivo = f.name;
          est.cabeceras = filas[0].map(function (c) { return String(c).trim(); });
          est.filas = filas.slice(1).filter(function (fl) { return fl.some(function (c) { return String(c).trim(); }); }).map(function (fl) {
            return fl.map(function (c) { return c instanceof Date ? Q.isoLocal(c) + ":00" : String(c); });
          });
          est.colNombre = est.cabeceras.findIndex(function (c) { return /nombre/i.test(c); });
          est.colFecha = est.cabeceras.findIndex(function (c) { return /marca temporal|timestamp|fecha/i.test(c); });
          est.columnas = est.cabeceras.map(function (c, i) {
            var omitir = i === est.colNombre || i === est.colFecha || /puntuaci|correo|email|score/i.test(c);
            var g = adivinarPregunta(c);
            return { idx: i, usar: !omitir, preguntaId: g.id, preguntaNombre: g.nombre, esLugar: g.esLugar };
          });
          var primera = est.colFecha >= 0 ? Q.leerFecha(est.filas[0][est.colFecha]) : new Date();
          if (primera) est.edicion = { id: primera.getFullYear() + "-" + ("0" + (primera.getMonth() + 1)).slice(-2), nombre: MESES[primera.getMonth()].replace(/^./, function (x) { return x.toUpperCase(); }) + " " + primera.getFullYear() };
          est.paso = 2;
          guardar(); pintar();
          Q.toast("Leídas " + Q.plural(est.filas.length, "respuesta", "respuestas") + ".");
        } catch (e) { Q.toast("No se ha podido leer el archivo: " + e.message, "error"); }
      };
      lector.onerror = function () { Q.toast("No se ha podido abrir «" + f.name + "». Vuelve a elegirlo.", "error"); };
      lector.readAsArrayBuffer(f);
    });
    var reiniciar = est.archivo ? h("button", { type: "button", class: "boton boton--fantasma boton--s", onclick: function () {
      Q.confirmar("Se borrará el trabajo de esta importación en este navegador.", { titulo: "¿Empezar de cero?", aceptar: "Empezar de cero", peligro: true }).then(function (si) { if (si) { est = nuevoEstado(); guardar(); pintar(); } });
    } }, Q.icono("recargar", "ico--s"), "Empezar de cero") : null;
    return seccion(1, "Elige el archivo", "Descárgalo desde Google Forms: Respuestas > icono de Hojas de cálculo > Archivo > Descargar > Microsoft Excel.", [entrada, zona, estado, reiniciar]);
  }

  /* ------------------------------------------------------------ paso 2: columnas y mes */
  function paso2() {
    var tabla = h("table", { class: "tabla" }, h("thead", null, h("tr", null, h("th", null, "Usar"), h("th", null, "Pregunta del formulario"), h("th", null, "Nombre corto"), h("th", null, "¿Son sitios?"))));
    var cuerpo = h("tbody");
    est.columnas.forEach(function (c) {
      if (c.idx === est.colNombre || c.idx === est.colFecha) return;
      var usar = h("input", { type: "checkbox", "aria-label": "Usar columna" }); usar.checked = c.usar;
      usar.addEventListener("change", function () { c.usar = usar.checked; guardar(); });
      var nombre = h("input", { class: "entrada", value: c.preguntaNombre, maxlength: 40, "aria-label": "Nombre corto de la pregunta" });
      nombre.addEventListener("input", function () { c.preguntaNombre = nombre.value; guardar(); });
      var lugar = h("input", { type: "checkbox", "aria-label": "Las respuestas son sitios" }); lugar.checked = c.esLugar;
      lugar.addEventListener("change", function () { c.esLugar = lugar.checked; guardar(); });
      cuerpo.appendChild(h("tr", null, h("td", null, usar), h("td", { style: { maxWidth: "420px" } }, est.cabeceras[c.idx]), h("td", null, nombre), h("td", null, lugar)));
    });
    tabla.appendChild(cuerpo);
    var selNombre = selector(est.cabeceras.map(function (c, i) { return [String(i), c.slice(0, 60)]; }), String(est.colNombre), { "aria-label": "Columna con el nombre" });
    selNombre.addEventListener("change", function () { est.colNombre = +selNombre.value; guardar(); pintar(); });
    var cId = Q.campo({ etiqueta: "Código del mes", valor: est.edicion.id, placeholder: "2026-11", requerido: true, ayuda: "Año y mes, por ejemplo 2026-11." });
    var cNom = Q.campo({ etiqueta: "Nombre visible", valor: est.edicion.nombre, placeholder: "Noviembre 2026", requerido: true });
    var yaExiste = ORIG.ediciones.some(function (e) { return e.id === est.edicion.id; });
    var aviso = h("p", { class: "campo__error", hidden: !yaExiste }, "Ese mes ya está importado. Si sigues, sus respuestas se añadirán otra vez.");
    cId.control.addEventListener("input", function () { est.edicion.id = cId.valor(); aviso.hidden = !ORIG.ediciones.some(function (e) { return e.id === est.edicion.id; }); guardar(); });
    cNom.control.addEventListener("input", function () { est.edicion.nombre = cNom.valor(); guardar(); });
    var seguir = h("button", { type: "button", class: "boton boton--primario", onclick: function () {
      if (!/^\d{4}-\d{2}$/.test(est.edicion.id)) return cId.error("Usa el formato 2026-11.");
      if (est.edicion.nombre.length < 3) return cNom.error("Pon un nombre, por ejemplo «Noviembre 2026».");
      if (est.colNombre < 0) { Q.toast("Elige qué columna tiene el nombre.", "error"); return; }
      prepararPersonasEItems(); est.paso = 3; guardar(); pintar();
    } }, est.paso > 2 ? "Volver a generar las propuestas" : "Continuar");
    return seccion(2, "Revisa columnas y mes", "Marca qué preguntas contienen recomendaciones. «¿Son sitios?» hace que se pidan direcciones para el mapa.",
      [h("div", { class: "campo" }, h("label", null, "Columna con el nombre de la persona"), selNombre),
       h("div", { style: { overflowX: "auto", marginTop: "16px" } }, tabla),
       h("div", { class: "fila-campos", style: { marginTop: "16px" } }, cId.el, cNom.el), aviso,
       h("div", { style: { marginTop: "16px" } }, seguir),
       est.paso > 2 ? h("p", { class: "tenue", style: { marginTop: "8px", fontSize: "var(--t-xs)" } }, "Ojo: volver a generar descarta lo que hayas corregido en los pasos 3 y 4.") : null]);
  }

  function prepararPersonasEItems() {
    est.personas = {};
    est.items = [];
    var n = 0;
    est.filas.forEach(function (fila, i) {
      var nombre = String(fila[est.colNombre] || "").trim().replace(/\s+/g, " ");
      if (!nombre) return;
      if (!est.personas[nombre]) {
        var e = personaExistente(nombre);
        est.personas[nombre] = e ? { accion: e.seguro ? "existente" : "revisar", id: e.p.id, nombre: e.p.nombre } : { accion: "nueva", id: "", nombre: nombre.replace(/\b\p{Ll}/gu, function (x) { return x.toUpperCase(); }) };
      }
      est.columnas.forEach(function (c) {
        if (!c.usar) return;
        var texto = String(fila[c.idx] || "").trim();
        if (!texto || texto === ".") return;
        var trozos = c.preguntaId === "sugerencia" ? [texto] : trocear(texto);
        trozos.forEach(function (tr) {
          var cand = candidatos(tr);
          var esProp = c.preguntaId === "sugerencia";
          est.items.push({
            id: "it" + (++n), fila: i, col: c.idx, persona: nombre, original: tr, nombre: tr.charAt(0).toUpperCase() + tr.slice(1, 80),
            categoria: esProp ? "" : adivinarCategoria(tr, c.preguntaId, c.esLugar), tipo: esProp ? "ignorar" : "recurso",
            destino: cand.length && cand[0].p >= 0.8 ? "r:" + cand[0].r.id : "nuevo",
            lugar: { direccion: "", tipo: c.esLugar ? "restaurante" : "", lat: "", lng: "", fuente: "" }
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------ paso 3: personas */
  function paso3() {
    var tabla = h("table", { class: "tabla" }, h("thead", null, h("tr", null, h("th", null, "Nombre en el Excel"), h("th", null, "Es…"))));
    var tb = h("tbody");
    var opciones = [["__nueva", "Persona nueva"]].concat(ORIG.personas.slice().sort(Q.ordenAlfa).map(function (p) { return [p.id, p.nombre]; }));
    Object.keys(est.personas).forEach(function (n) {
      var p = est.personas[n];
      var sel = selector(opciones, p.accion === "nueva" ? "__nueva" : p.id, { "aria-label": "Persona para " + n });
      var nombreNuevo = h("input", { class: "entrada", value: p.accion === "nueva" ? p.nombre : n, maxlength: 50, "aria-label": "Nombre de la persona nueva", style: { marginTop: "6px" } });
      nombreNuevo.hidden = p.accion !== "nueva";
      sel.addEventListener("change", function () {
        if (sel.value === "__nueva") { p.accion = "nueva"; p.id = ""; p.nombre = nombreNuevo.value.trim(); nombreNuevo.hidden = false; }
        else { p.accion = "existente"; p.id = sel.value; p.nombre = ORIG.personas.find(function (x) { return x.id === sel.value; }).nombre; nombreNuevo.hidden = true; }
        guardar();
      });
      nombreNuevo.addEventListener("input", function () { p.nombre = nombreNuevo.value.trim(); guardar(); });
      tb.appendChild(h("tr", null, h("td", null, n, p.accion === "revisar" ? h("p", { class: "campo__error" }, "Parecido a " + p.nombre + ": confírmalo.") : null), h("td", null, sel, nombreNuevo)));
    });
    tabla.appendChild(tb);
    return seccion(3, "Confirma quién es quién", "Si alguien ya respondió otro mes, elígelo para que sus recomendaciones se sumen a su perfil. Los nombres iguales a los del mes anterior ya vienen enlazados.",
      [h("div", { style: { overflowX: "auto" } }, tabla)]);
  }

  /* ------------------------------------------------------------ paso 4: recomendaciones */
  function opcionesDestino(item) {
    var ops = [["nuevo", "Es una recomendación nueva"]];
    candidatos(item.nombre).forEach(function (c) { ops.push(["r:" + c.r.id, "Igual que «" + c.r.nombre + "»"]); });
    est.items.forEach(function (o) {
      if (o.id === item.id || o.destino !== "nuevo" || o.tipo === "ignorar" || o.tipo === "propuesta" || est.items.indexOf(o) > est.items.indexOf(item)) return;
      if (Q.parecido(o.nombre, item.nombre) >= 0.6 || Q.normalizar(o.nombre) === Q.normalizar(item.nombre)) ops.push(["n:" + o.id, "Igual que «" + o.nombre + "» (de " + o.persona + ", este mes)"]);
    });
    if (item.destino.indexOf("r:") === 0 && !ops.some(function (o) { return o[0] === item.destino; })) {
      var r = ORIG.recursos.find(function (x) { return "r:" + x.id === item.destino; });
      if (r) ops.push([item.destino, "Igual que «" + r.nombre + "»"]);
    }
    ops.push(["buscar", "Elegir otra existente…"]);
    return ops;
  }
  function filaItem(item, repintarGrupo) {
    var nombre = h("input", { class: "entrada", value: item.nombre, maxlength: 80, "aria-label": "Nombre del recurso" });
    var cat = selector([["", "Categoría…"]].concat(CATS.map(function (c) { return [c.id, c.nombre]; })), item.categoria, { "aria-label": "Categoría" });
    var tipo = selector([["recurso", "Recomendación"], ["aficion", "Afición"], ["propuesta", "Propuesta de plan"], ["ignorar", "No importar"]], item.tipo, { "aria-label": "Tipo" });
    var destino = selector(opcionesDestino(item), item.destino, { "aria-label": "¿Ya existe?" });
    var quitar = h("button", { type: "button", class: "boton-icono boton-icono--sin-borde", "aria-label": "Quitar", onclick: function () { est.items.splice(est.items.indexOf(item), 1); guardar(); repintarGrupo(); } }, Q.icono("papelera"));
    var fila = h("div", { class: "item" }, nombre, cat, tipo, destino, quitar);
    nombre.addEventListener("change", function () { item.nombre = nombre.value.trim(); guardar(); repintarGrupo(); });
    cat.addEventListener("change", function () { item.categoria = cat.value; guardar(); repintarGrupo(); });
    tipo.addEventListener("change", function () { item.tipo = tipo.value; guardar(); repintarGrupo(); });
    destino.addEventListener("change", function () {
      if (destino.value === "buscar") {
        var q = prompt("Escribe parte del nombre de la recomendación existente:", item.nombre);
        var res = q ? ORIG.recursos.filter(function (r) { return Q.normalizar(r.nombre).indexOf(Q.normalizar(q)) >= 0; }) : [];
        if (res.length === 1) item.destino = "r:" + res[0].id;
        else if (res.length > 1) { var elegido = prompt("Hay varias. Escribe el número:\n" + res.slice(0, 15).map(function (r, i) { return (i + 1) + ". " + r.nombre; }).join("\n")); var k = parseInt(elegido, 10); if (res[k - 1]) item.destino = "r:" + res[k - 1].id; }
        else if (q) Q.toast("No hay ninguna recomendación con «" + q + "».", "aviso");
      } else item.destino = destino.value;
      guardar(); repintarGrupo();
    });
    var cosas = [fila];
    if ((item.tipo === "recurso") && item.destino === "nuevo" && (item.categoria === "lugares" || item.categoria === "gastro" || item.lugar.tipo)) cosas.push(filaLugar(item, repintarGrupo));
    if (item.tipo !== "ignorar" && item.tipo !== "propuesta" && (!item.categoria || item.nombre.length < 2)) fila.classList.add("item--error");
    return cosas;
  }
  function filaLugar(item, repintarGrupo) {
    var l = item.lugar;
    var dir = h("input", { class: "entrada", value: l.direccion, placeholder: "Dirección (calle y número, ciudad)", "aria-label": "Dirección" });
    var tipo = selector([["", "Sin mapa (no es un sitio)"]].concat(TIPOS_LUGAR.map(function (t) { return [t.id, t.nombre]; })), l.tipo, { "aria-label": "Tipo de lugar" });
    var estado = h("span", { class: "item__estado" });
    function pintarEstado() {
      Q.vaciar(estado);
      if (!l.tipo) estado.appendChild(h("span", { class: "tenue" }, "No saldrá en el mapa."));
      else if (l.lat && l.lng) estado.appendChild(h("span", { style: { color: "var(--hoja)", fontWeight: 650 } }, "Ubicado (" + (+l.lat).toFixed(5) + ", " + (+l.lng).toFixed(5) + ")"));
      else estado.appendChild(h("span", { style: { color: "#8A1C23" } }, "Sin coordenadas: saldrá en «sin ubicación exacta»."));
    }
    pintarEstado();
    var buscar = h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () {
      var q = dir.value.trim() || item.nombre;
      buscar.disabled = true; buscar.textContent = "Buscando…";
      geocodificar(q).then(function (res) {
        buscar.disabled = false; buscar.textContent = "Buscar coordenadas";
        if (!res) { Q.toast("CartoCiudad no ha encontrado «" + q + "». Prueba con calle, número y municipio, o pega las coordenadas de Google Maps.", "aviso"); return; }
        l.lat = res.lat; l.lng = res.lng; l.fuente = "CartoCiudad (IGN)" + (res.tipo === "portal" ? "" : " · " + res.tipo);
        if (!dir.value.trim()) { l.direccion = res.direccion; dir.value = res.direccion; }
        if (!l.tipo) l.tipo = item.categoria === "gastro" ? "restaurante" : "parque";
        tipo.value = l.tipo; guardar(); pintarEstado();
        Q.toast("Encontrado: " + res.direccion + ". Comprueba que es el sitio correcto.");
      });
    } }, Q.icono("buscar", "ico--s"), "Buscar coordenadas");
    var pegar = h("button", { type: "button", class: "boton boton--fantasma boton--s", onclick: function () {
      var v = prompt("Pega las coordenadas (en Google Maps: clic derecho sobre el sitio y pulsa los números). Ejemplo: 40.41665, -3.71445");
      if (!v) return;
      var m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(v);
      if (!m) { Q.toast("No entiendo esas coordenadas. Deben ser dos números con punto, separados por coma.", "error"); return; }
      l.lat = +m[1]; l.lng = +m[2]; l.fuente = "Google Maps (pegado a mano)";
      if (!l.tipo) { l.tipo = item.categoria === "gastro" ? "restaurante" : "parque"; tipo.value = l.tipo; }
      guardar(); pintarEstado();
    } }, "Pegar coordenadas");
    dir.addEventListener("change", function () { l.direccion = dir.value.trim(); l.lat = ""; l.lng = ""; guardar(); pintarEstado(); });
    tipo.addEventListener("change", function () { l.tipo = tipo.value; guardar(); pintarEstado(); });
    return h("div", { class: "item__lugar" }, dir, tipo, h("div", { class: "acciones" }, buscar, pegar), estado);
  }
  function geocodificar(q) {
    var url = "https://www.cartociudad.es/geocoder/api/geocoder/find?q=" + encodeURIComponent(q);
    function interpretar(j) {
      if (!j || !j.lat || !j.lng || j.lat === 0) return null;
      var dirTxt = [j.tip_via, j.address, j.portalNumber || ""].filter(Boolean).join(" ").toLowerCase().replace(/(^|\s)\S/g, function (x) { return x.toUpperCase(); });
      return { lat: j.lat, lng: j.lng, tipo: j.type, direccion: (dirTxt || j.address) + (j.muni ? ", " + j.muni : "") };
    }
    return fetch(url).then(function (r) { return r.json(); }).then(interpretar).catch(function () {
      /* si el navegador bloquea la consulta directa, se usa JSONP */
      return new Promise(function (ok) {
        var nombre = "cartociudad_" + Date.now();
        var s = document.createElement("script");
        var t = setTimeout(function () { limpiar(); ok(null); }, 10000);
        function limpiar() { clearTimeout(t); delete window[nombre]; s.remove(); }
        window[nombre] = function (j) { limpiar(); ok(interpretar(j)); };
        s.onerror = function () { limpiar(); ok(null); };
        s.src = "https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q=" + encodeURIComponent(q) + "&callback=" + nombre;
        document.head.appendChild(s);
      });
    });
  }

  function paso4() {
    var grupos = h("div");
    est.filas.forEach(function (fila, i) {
      est.columnas.forEach(function (c) {
        if (!c.usar) return;
        var texto = String(fila[c.idx] || "").trim();
        if (!texto || texto === ".") return;
        var caja = h("div", { class: "respuesta" });
        function repintarGrupo() {
          Q.vaciar(caja);
          var persona = String(fila[est.colNombre] || "").trim().replace(/\s+/g, " ");
          caja.appendChild(h("div", { class: "respuesta__cab" },
            h("div", { style: { flex: 1 } }, h("strong", null, persona), h("span", { class: "tenue" }, ", " + c.preguntaNombre), h("p", { class: "respuesta__orig" }, "«" + texto + "»")),
            h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () {
              est.items.push({ id: "it" + Date.now(), fila: i, col: c.idx, persona: persona, original: "", nombre: "", categoria: adivinarCategoria("", c.preguntaId, c.esLugar), tipo: "recurso", destino: "nuevo", lugar: { direccion: "", tipo: c.esLugar ? "restaurante" : "", lat: "", lng: "", fuente: "" } });
              guardar(); repintarGrupo();
            } }, Q.icono("mas", "ico--s"), "Añadir")));
          est.items.filter(function (it) { return it.fila === i && it.col === c.idx; }).forEach(function (it) { filaItem(it, repintarGrupo).forEach(function (x) { caja.appendChild(x); }); });
        }
        repintarGrupo();
        grupos.appendChild(caja);
      });
    });
    var seguir = h("button", { type: "button", class: "boton boton--primario", style: { marginTop: "18px" }, onclick: function () { est.paso = 5; guardar(); pintar(); document.getElementById("paso-5").scrollIntoView(); } }, "Revisar y generar");
    return seccion(4, "Separa y agrupa las recomendaciones", "Cada respuesta se ha partido en trozos. Corrige el nombre, elige categoría y, si ya existe, marca «Igual que…» para que se agrupe con quien ya lo recomendó. Para los sitios nuevos, busca la dirección: así salen en el mapa con coordenadas reales.",
      [grupos, seguir]);
  }

  /* ------------------------------------------------------------ paso 5: generar */
  function generar() {
    var errores = [];
    var out = JSON.parse(JSON.stringify(ORIG));
    var ed = { id: est.edicion.id, nombre: est.edicion.nombre, formulario: "Formulario de " + est.edicion.nombre.toLowerCase(), respuestas: est.filas.length };
    out.ediciones.push(ed);
    var usadosR = {}, usadosL = {}, usadosP = {};
    out.recursos.forEach(function (r) { usadosR[r.id] = true; });
    out.lugares.forEach(function (l) { usadosL[l.id] = true; });
    out.personas.forEach(function (p) { usadosP[p.id] = true; });
    /* preguntas */
    est.columnas.forEach(function (c) {
      if (!c.usar) return;
      var p = out.preguntas.find(function (x) { return x.id === c.preguntaId; });
      if (!p) out.preguntas.push({ id: c.preguntaId, nombre: c.preguntaNombre, texto: est.cabeceras[c.idx] });
    });
    /* personas */
    var idPersona = {};
    Object.keys(est.personas).forEach(function (n) {
      var p = est.personas[n];
      if (p.accion === "nueva") {
        if (!p.nombre || p.nombre.length < 2) { errores.push("Falta el nombre de la persona nueva «" + n + "»."); return; }
        var ya = out.personas.find(function (x) { return Q.normalizar(x.nombre) === Q.normalizar(p.nombre); });
        if (ya) idPersona[n] = ya.id;
        else { var id = idUnico(slug(p.nombre), usadosP); out.personas.push({ id: id, nombre: p.nombre }); idPersona[n] = id; }
      } else idPersona[n] = p.id;
    });
    /* respuestas originales */
    est.filas.forEach(function (fila) {
      var n = String(fila[est.colNombre] || "").trim().replace(/\s+/g, " ");
      if (!idPersona[n]) return;
      var campos = {};
      est.columnas.forEach(function (c) { var v = String(fila[c.idx] || "").trim(); if (c.usar && v && v !== ".") campos[c.preguntaId] = v; });
      out.respuestas.push({ persona: idPersona[n], edicion: ed.id, fecha: est.colFecha >= 0 ? String(fila[est.colFecha]).replace(" ", "T") : "", campos: campos });
    });
    /* recomendaciones */
    var nuevos = {};
    function preguntaDe(it) { return (est.columnas.find(function (c) { return c.idx === it.col; }) || {}).preguntaId; }
    function anadirRec(recurso, it) {
      var pid = idPersona[it.persona];
      if (!pid) return;
      if (recurso.recomendaciones.some(function (x) { return x.persona === pid && x.edicion === ed.id; })) return;
      recurso.recomendaciones.push({ persona: pid, pregunta: preguntaDe(it), texto: it.original || it.nombre, edicion: ed.id });
    }
    var ordenados = est.items.filter(function (it) { return it.destino === "nuevo"; }).concat(est.items.filter(function (it) { return it.destino !== "nuevo"; }));
    ordenados.forEach(function (it) {
      if (it.tipo === "ignorar") return;
      if (!idPersona[it.persona]) return;
      if (it.tipo === "propuesta") { out.propuestas.push({ persona: idPersona[it.persona], texto: it.nombre, edicion: ed.id }); return; }
      if (it.nombre.length < 2) { errores.push("Hay un elemento sin nombre en la respuesta de " + it.persona + "."); return; }
      if (it.destino === "nuevo") {
        if (!it.categoria) { errores.push("«" + it.nombre + "» (de " + it.persona + ") no tiene categoría."); return; }
        var r = { id: idUnico(slug(it.nombre), usadosR), nombre: it.nombre, categoria: it.categoria, tipo: it.tipo, temas: [], recomendaciones: [] };
        if (it.lugar && it.lugar.tipo) {
          if (it.lugar.lat && it.lugar.lng) {
            var lid = idUnico(slug(it.nombre), usadosL);
            out.lugares.push({ id: lid, nombre: it.nombre, tipo: it.lugar.tipo, direccion: it.lugar.direccion || it.nombre, lat: +(+it.lugar.lat).toFixed(6), lng: +(+it.lugar.lng).toFixed(6), fuente: it.lugar.fuente || "Introducido a mano" });
            r.lugares = [lid];
          } else r.sinUbicacion = { motivo: "Todavía no tiene dirección verificada.", buscar: it.nombre + " Madrid" };
        }
        anadirRec(r, it);
        out.recursos.push(r);
        nuevos[it.id] = r;
      } else if (it.destino.indexOf("r:") === 0) {
        var ex = out.recursos.find(function (x) { return "r:" + x.id === it.destino; });
        if (ex) anadirRec(ex, it); else errores.push("No encuentro la recomendación a la que apunta «" + it.nombre + "».");
      } else if (it.destino.indexOf("n:") === 0) {
        var nv = nuevos[it.destino.slice(2)];
        if (nv) anadirRec(nv, it); else errores.push("«" + it.nombre + "» apunta a otra recomendación nueva que se ha quitado o marcado como «No importar».");
      }
    });
    out.generado = Q.isoDia(new Date());
    return { datos: out, errores: errores, nuevos: Object.keys(nuevos).length };
  }

  function paso5() {
    var res = generar();
    var o = res.datos;
    var antes = { personas: ORIG.personas.length, recursos: ORIG.recursos.length, lugares: ORIG.lugares.length, recs: ORIG.recursos.reduce(function (s, r) { return s + r.recomendaciones.length; }, 0) };
    var recs = o.recursos.reduce(function (s, r) { return s + r.recomendaciones.length; }, 0);
    var compartidosNuevos = o.recursos.filter(function (r) {
      var personas = {}; r.recomendaciones.forEach(function (x) { personas[x.persona] = true; });
      return Object.keys(personas).length > 1 && r.recomendaciones.some(function (x) { return x.edicion === est.edicion.id; });
    }).length;
    var resumen = h("div", { class: "resumen-final" },
      h("div", null, h("strong", null, "+" + (o.personas.length - antes.personas)), "personas nuevas"),
      h("div", null, h("strong", null, "+" + (recs - antes.recs)), "recomendaciones"),
      h("div", null, h("strong", null, "+" + (o.recursos.length - antes.recursos)), "recursos nuevos"),
      h("div", null, h("strong", null, compartidosNuevos), "coincidencias con este mes"),
      h("div", null, h("strong", null, "+" + (o.lugares.length - antes.lugares)), "sitios nuevos en el mapa"));
    var errores = res.errores.length ? h("div", { class: "error-bloque" }, h("h3", null, "Corrige esto antes de descargar"), h("ul", { class: "errores-lista" }, res.errores.map(function (e) { return h("li", null, e); }))) : null;
    var descargar = h("button", { type: "button", class: "boton boton--primario", disabled: res.errores.length > 0, onclick: function () {
      var r2 = generar();
      if (r2.errores.length) { pintar(); return; }
      var js = "/* Datos del banco de recursos.\n   Generado con herramientas/importar.html el " + Q.isoDia(new Date()) + ". Incluye: " + r2.datos.ediciones.map(function (e) { return e.nombre; }).join(", ") + ". */\nwindow.DATOS = " + JSON.stringify(r2.datos, null, 1) + ";\n";
      var url = URL.createObjectURL(new Blob([js], { type: "text/javascript;charset=utf-8" }));
      var a = h("a", { href: url, download: "datos.js" }); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      Q.toast("Descargado datos.js. Sustituye con él el archivo js/datos.js de la web.");
    } }, Q.icono("subir", "ico--s"), "Descargar datos.js");
    return seccion(5, "Genera el archivo", "Descarga el nuevo datos.js y ponlo en la carpeta js/ de la web (sustituyendo el anterior). Sube el cambio a GitHub y en un par de minutos lo verá todo el grupo.",
      [resumen, errores, descargar]);
  }

  /* ------------------------------------------------------------ pintar */
  function seccion(n, titulo, texto, hijos) {
    return h("section", { class: "paso" + (est.paso > n ? " paso--hecho" : ""), id: "paso-" + n },
      h("h2", null, h("span", { class: "paso__num" }, est.paso > n ? "✓" : n), titulo), h("p", { class: "sub" }, texto), hijos);
  }
  function pintar() {
    Q.vaciar(cont);
    cont.appendChild(paso1());
    if (est.paso >= 2) cont.appendChild(paso2());
    if (est.paso >= 3) cont.appendChild(paso3());
    if (est.paso >= 3) cont.appendChild(paso4());
    if (est.paso >= 5) cont.appendChild(paso5());
  }
  pintar();
})();
