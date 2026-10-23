/* Quedamos · Galería: mosaico, subida optimizada, visor y edición de las fotos propias. */
(function () {
  "use strict";
  var Q = window.Q, h = Q.h;
  var MAX_LADO = 2000, MAX_ARCHIVOS = 12, MAX_MB_ORIGINAL = 30;

  /* reduce la foto antes de subirla: lado largo ≤ 2000 px, JPEG ~85 % */
  Q.prepararImagen = function (archivo) {
    function dibujar(fuente, ancho, alto) {
      var esc = Math.min(1, MAX_LADO / Math.max(ancho, alto));
      var w = Math.round(ancho * esc), hh = Math.round(alto * esc);
      var lienzo = document.createElement("canvas");
      lienzo.width = w; lienzo.height = hh;
      var ctx = lienzo.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh);
      ctx.drawImage(fuente, 0, 0, w, hh);
      return new Promise(function (ok, ko) {
        function intentar(calidad) {
          lienzo.toBlob(function (blob) {
            if (!blob) return ko(new Error("No se ha podido procesar la imagen."));
            if (blob.size > 3.5e6 && calidad > 0.6) return intentar(calidad - 0.1);
            var lector = new FileReader();
            lector.onload = function () { ok({ base64: String(lector.result).split(",")[1], mime: "image/jpeg", ancho: w, alto: hh, bytes: blob.size }); };
            lector.onerror = function () { ko(new Error("No se ha podido leer la imagen.")); };
            lector.readAsDataURL(blob);
          }, "image/jpeg", calidad);
        }
        intentar(0.85);
      });
    }
    if (!/^image\//.test(archivo.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(archivo.name)) return Promise.reject(new Error("«" + archivo.name + "» no es una imagen."));
    if (archivo.size > MAX_MB_ORIGINAL * 1e6) return Promise.reject(new Error("«" + archivo.name + "» pesa más de " + MAX_MB_ORIGINAL + " MB."));
    if (window.createImageBitmap) {
      return createImageBitmap(archivo, { imageOrientation: "from-image" }).then(function (bmp) { return dibujar(bmp, bmp.width, bmp.height); }, function () { return porImagen(); });
    }
    return porImagen();
    function porImagen() {
      return new Promise(function (ok, ko) {
        var url = URL.createObjectURL(archivo);
        var img = new Image();
        img.onload = function () { URL.revokeObjectURL(url); dibujar(img, img.naturalWidth, img.naturalHeight).then(ok, ko); };
        img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Este navegador no puede abrir «" + archivo.name + "». Si es HEIC (iPhone), conviértela a JPG o súbela desde la app de Fotos.")); };
        img.src = url;
      });
    }
  };

  function opcionesQuedadas(incluirVacio) {
    var ops = incluirVacio ? [{ valor: "", texto: "Ninguna" }] : [];
    Q.quedadasOrdenadas().slice().reverse().forEach(function (q) {
      if (q.estado === "cancelada") return;
      ops.push({ valor: q.id, texto: q.titulo + " (" + Q.fechaCorta(Q.leerFecha(q.inicio)) + ")" });
    });
    return ops;
  }

  /* ------------------------------------------------------------ subir fotos */
  Q.subirFotos = function (op) {
    op = op || {};
    return Q.yo.asegurar("Elige tu nombre: tus fotos aparecerán firmadas por ti.").then(function (yo) {
      if (!yo) return;
      var archivos = [];
      var entrada = h("input", { type: "file", accept: "image/*", multiple: true, class: "visualmente-oculto", id: "entrada-fotos" });
      var zona = h("label", { class: "zona-soltar", for: "entrada-fotos" }, Q.icono("subir"),
        h("strong", null, "Elige fotos del móvil o del ordenador"),
        h("span", { class: "tenue", style: { fontSize: "var(--t-s)" } }, "O arrástralas aquí. Hasta " + MAX_ARCHIVOS + " a la vez; se optimizan antes de subir."));
      var previas = h("div", { class: "subida-previas" });
      var errArchivos = h("p", { class: "campo__error", hidden: true });
      var q0 = op.quedadaId ? Q.quedadaPorId(op.quedadaId) : null;
      var cTitulo = Q.campo({ etiqueta: "Título", nombre: "titulo", max: 80, placeholder: "Ej.: El atardecer desde el mirador…", ayuda: "Si subes varias, todas llevan este título." });
      var cDesc = Q.campo({ etiqueta: "Descripción", nombre: "descripcion", tipo: "area", max: 400, filas: 2 });
      var cFecha = Q.campo({ etiqueta: "Fecha", nombre: "fecha", tipo: "date", requerido: true, valor: q0 ? q0.inicio.slice(0, 10) : Q.isoDia(new Date()) });
      var cQuedada = Q.campo({ etiqueta: "Quedada", nombre: "quedada", tipo: "select", opciones: opcionesQuedadas(true) });
      cQuedada.control.value = op.quedadaId || "";
      cQuedada.control.addEventListener("change", function () { var q = Q.quedadaPorId(cQuedada.control.value); if (q) cFecha.control.value = q.inicio.slice(0, 10); });
      var errorGeneral = h("div", { class: "error-bloque", hidden: true, role: "alert", style: { marginTop: "16px" } });

      function anadirArchivos(lista) {
        errArchivos.hidden = true;
        Array.prototype.forEach.call(lista, function (f) {
          if (archivos.length >= MAX_ARCHIVOS) { errArchivos.textContent = "Máximo " + MAX_ARCHIVOS + " fotos por subida."; errArchivos.hidden = false; return; }
          if (archivos.some(function (a) { return a.archivo.name === f.name && a.archivo.size === f.size; })) return;
          archivos.push({ archivo: f, estado: "pendiente", url: URL.createObjectURL(f) });
        });
        pintarPrevias();
      }
      function pintarPrevias() {
        Q.vaciar(previas);
        archivos.forEach(function (a, i) {
          var barra = h("span", { style: { width: a.estado === "hecho" ? "100%" : a.estado === "subiendo" ? "60%" : a.estado === "procesando" ? "25%" : "0" } });
          if (a.estado === "error") barra.style.background = "var(--madrono)";
          previas.appendChild(h("div", { class: "subida-previa", title: a.error || a.archivo.name },
            h("img", { src: a.url, alt: a.archivo.name }),
            a.estado === "pendiente" || a.estado === "error" ? h("button", { type: "button", "aria-label": "Quitar " + a.archivo.name, onclick: function () { URL.revokeObjectURL(a.url); archivos.splice(i, 1); pintarPrevias(); } }, Q.icono("cerrar", "ico--s")) : null,
            h("div", { class: "subida-previa__estado" }, barra)));
        });
        botonSubir.textContent = archivos.length ? "Subir " + Q.plural(archivos.filter(function (a) { return a.estado !== "hecho"; }).length, "foto", "fotos") : "Subir fotos";
      }
      entrada.addEventListener("change", function () { anadirArchivos(entrada.files); entrada.value = ""; });
      ["dragenter", "dragover"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("zona-soltar--encima"); }); });
      ["dragleave", "drop"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove("zona-soltar--encima"); }); });
      zona.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) anadirArchivos(e.dataTransfer.files); });

      var botonSubir = h("button", { type: "submit", form: "form-fotos", class: "boton boton--primario" }, "Subir fotos");
      var form = h("form", { id: "form-fotos", novalidate: true },
        entrada, zona, errArchivos, previas,
        h("div", { style: { marginTop: "20px" } }, cTitulo.el),
        h("div", { class: "fila-campos", style: { marginTop: "16px" } }, cFecha.el, cQuedada.el),
        h("div", { style: { marginTop: "16px" } }, cDesc.el),
        errorGeneral);
      var dlg = Q.dialogo({ titulo: q0 ? "Fotos de «" + q0.titulo + "»" : "Subir fotos", cuerpo: form, ancho: true, proteger: function () { return subiendo || archivos.some(function (a) { return a.estado !== "hecho"; }); },
        pie: [h("button", { type: "button", class: "boton boton--secundario", onclick: function () { dlg.intentarCerrar(); } }, "Cerrar"), botonSubir],
        alCerrar: function () { archivos.forEach(function (a) { URL.revokeObjectURL(a.url); }); } });

      var subiendo = false;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (subiendo) return;
        errorGeneral.hidden = true;
        var pendientes = archivos.filter(function (a) { return a.estado !== "hecho"; });
        if (!pendientes.length) { errArchivos.textContent = "Elige al menos una foto."; errArchivos.hidden = false; zona.focus(); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cFecha.valor())) { cFecha.error("Elige la fecha de la foto."); return; }
        subiendo = true; botonSubir.disabled = true;
        var errores = [], hechas = 0;
        var cadena = Promise.resolve();
        pendientes.forEach(function (a) {
          cadena = cadena.then(function () {
            a.estado = "procesando"; pintarPrevias();
            return Q.prepararImagen(a.archivo).then(function (img) {
              a.estado = "subiendo"; pintarPrevias();
              return Q.api.hacer("subirFoto", { base64: img.base64, mime: img.mime, ancho: img.ancho, alto: img.alto,
                titulo: cTitulo.valor(), descripcion: cDesc.valor(), fecha: cFecha.valor(), quedadaId: cQuedada.control.value, nombreArchivo: a.archivo.name });
            }).then(function () { a.estado = "hecho"; hechas++; pintarPrevias(); }, function (err) { a.estado = "error"; a.error = err.message; errores.push(err.message); pintarPrevias(); });
          });
        });
        cadena.then(function () {
          subiendo = false; botonSubir.disabled = false;
          if (!errores.length) {
            dlg.cerrar();
            Q.toast(Q.plural(hechas, "foto subida", "fotos subidas") + (Q.api.modo === "demo" ? " (solo en esta demostración)." : ". Ya las ve todo el grupo."));
          } else {
            Q.vaciar(errorGeneral).appendChild(h("h3", null, hechas ? hechas + " subidas, " + errores.length + " con problemas" : "No se ha podido subir"));
            errorGeneral.appendChild(h("p", null, errores[0]));
            errorGeneral.appendChild(h("p", null, "Las fotos marcadas en rojo siguen en la lista: vuelve a pulsar «Subir» para reintentarlo."));
            errorGeneral.hidden = false;
          }
        });
      });
      if (op.archivos) anadirArchivos(op.archivos);
    });
  };

  /* ------------------------------------------------------------ editar foto */
  function editarFoto(f) {
    return Q.yo.asegurar().then(function (yo) {
      if (!yo) return;
      if (!Q.yo.es(f.autor)) { Q.toast("Solo " + f.autor + " puede editar esta foto.", "aviso"); return; }
      var cTitulo = Q.campo({ etiqueta: "Título", nombre: "titulo", max: 80, valor: f.titulo });
      var cDesc = Q.campo({ etiqueta: "Descripción", nombre: "descripcion", tipo: "area", max: 400, valor: f.descripcion, filas: 2 });
      var cFecha = Q.campo({ etiqueta: "Fecha", nombre: "fecha", tipo: "date", requerido: true, valor: f.fecha });
      var cQuedada = Q.campo({ etiqueta: "Quedada", nombre: "quedada", tipo: "select", opciones: opcionesQuedadas(true) });
      cQuedada.control.value = f.quedadaId || "";
      var guardar = h("button", { type: "submit", form: "form-editar-foto", class: "boton boton--primario" }, "Guardar cambios");
      var form = h("form", { id: "form-editar-foto", novalidate: true }, cTitulo.el, h("div", { class: "fila-campos", style: { marginTop: "16px" } }, cFecha.el, cQuedada.el), h("div", { style: { marginTop: "16px" } }, cDesc.el));
      var dlg = Q.dialogo({ titulo: "Editar foto", cuerpo: form, pie: [h("button", { type: "button", class: "boton boton--secundario", onclick: function () { dlg.cerrar(); } }, "Cancelar"), guardar] });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cFecha.valor())) { cFecha.error("Elige una fecha."); return; }
        Q.ocupado(guardar, "Guardando…");
        Q.api.hacer("editarFoto", { id: f.id, titulo: cTitulo.valor(), descripcion: cDesc.valor(), fecha: cFecha.valor(), quedadaId: cQuedada.control.value })
          .then(function () { dlg.cerrar(); Q.toast("Foto actualizada."); }, function (err) { guardar.disabled = false; guardar.textContent = "Guardar cambios"; Q.toast(err.message, "error"); });
      });
    });
  }

  /* ------------------------------------------------------------ visor */
  Q.abrirFoto = function (id, ids) {
    ids = ids && ids.length ? ids : Q.fotosOrdenadas().map(function (f) { return f.id; });
    var i = Math.max(0, ids.indexOf(id));
    var visor = h("div", { class: "visor", role: "dialog", "aria-modal": "true", "aria-label": "Visor de fotos", tabindex: "-1" });
    var img = h("img", { alt: "" });
    var info = h("div", { class: "visor__info" });
    var ant = h("button", { type: "button", class: "visor__nav visor__nav--izq", "aria-label": "Foto anterior", onclick: function () { ir(-1); } }, Q.icono("izq"));
    var sig = h("button", { type: "button", class: "visor__nav visor__nav--der", "aria-label": "Foto siguiente", onclick: function () { ir(1); } }, Q.icono("der"));
    var cerrarB = h("button", { type: "button", class: "boton-icono visor__cerrar", "aria-label": "Cerrar", onclick: cerrar }, Q.icono("cerrar"));
    visor.appendChild(cerrarB); visor.appendChild(ant); visor.appendChild(h("div", { class: "visor__img" }, img)); visor.appendChild(sig); visor.appendChild(info);
    var previo = document.activeElement;
    document.body.appendChild(visor);
    document.body.style.overflow = "hidden";
    function cerrar() { visor.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", teclas); quitar(); if (previo && previo.focus) previo.focus(); }
    function teclas(e) { if (e.key === "Escape") cerrar(); else if (e.key === "ArrowLeft") ir(-1); else if (e.key === "ArrowRight") ir(1); }
    document.addEventListener("keydown", teclas);
    var quitar = Q.api.suscribir(function () { ids = ids.filter(function (x) { return Q.fotoPorId(x); }); if (!ids.length) return cerrar(); i = Math.min(i, ids.length - 1); pintar(); });
    var xInicio = null;
    visor.addEventListener("touchstart", function (e) { xInicio = e.touches[0].clientX; }, { passive: true });
    visor.addEventListener("touchend", function (e) { if (xInicio === null) return; var dx = e.changedTouches[0].clientX - xInicio; if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1); xInicio = null; });
    function ir(n) { var j = i + n; if (j < 0 || j >= ids.length) return; i = j; pintar(); }
    function pintar() {
      var f = Q.fotoPorId(ids[i]);
      if (!f) return;
      img.src = Q.api.urlFoto(f, 2000);
      img.alt = f.titulo || "Foto de " + f.autor;
      ant.disabled = i === 0; sig.disabled = i === ids.length - 1;
      Q.vaciar(info);
      var q = f.quedadaId ? Q.quedadaPorId(f.quedadaId) : null;
      var d = Q.leerFecha(f.fecha);
      var texto = h("div", { style: { display: "grid", gap: "4px" } },
        h("h3", null, f.titulo || "Sin título", f.ejemplo ? h("span", { class: "etiqueta etiqueta--ejemplo", style: { marginLeft: "10px", verticalAlign: "middle" } }, "Ejemplo") : null),
        f.descripcion ? h("p", null, f.descripcion) : null,
        h("p", null, "De " + f.autor + (d ? ", " + d.getDate() + " de " + Q.MESES[d.getMonth()] + " de " + d.getFullYear() : "") + ". " + (i + 1) + " de " + ids.length + "."));
      if (q) texto.appendChild(h("p", null, h("a", { href: "#", style: { color: "#fff" }, onclick: function (e) { e.preventDefault(); cerrar(); Q.abrirQuedada(q.id); } }, "Quedada: " + q.titulo)));
      var acciones = h("div", { class: "acciones" },
        h("a", { class: "boton boton--secundario boton--s", href: Q.api.urlFoto(f, 3000), target: "_blank", rel: "noopener" }, Q.icono("externo", "ico--s"), "Abrir original"));
      if (Q.yo.es(f.autor)) {
        acciones.appendChild(h("button", { type: "button", class: "boton boton--secundario boton--s", onclick: function () { editarFoto(f); } }, Q.icono("editar", "ico--s"), "Editar"));
        acciones.appendChild(h("button", { type: "button", class: "boton boton--peligro boton--s", onclick: function () {
          Q.confirmar("La foto desaparecerá de la galería para todo el grupo. En Drive queda en la papelera 30 días.", { titulo: "¿Borrar esta foto?", aceptar: "Borrar foto", peligro: true }).then(function (si) {
            if (!si) return;
            Q.api.hacer("borrarFoto", { id: f.id }).then(function () { Q.toast("Foto borrada."); }, function (err) { Q.toast(err.message, "error"); });
          });
        } }, Q.icono("papelera", "ico--s"), "Borrar"));
      }
      info.appendChild(texto); info.appendChild(acciones);
    }
    pintar();
    visor.focus();
  };

  /* miniatura reutilizable */
  Q.tarjetaFoto = function (f, ids) {
    var proporcion = f.ancho && f.alto ? f.ancho + " / " + f.alto : "4 / 3";
    var b = h("button", { type: "button", class: "foto", onclick: function () { Q.abrirFoto(f.id, ids); }, "aria-label": (f.titulo || "Foto") + ", de " + f.autor },
      h("img", { src: Q.api.urlFoto(f, 700), alt: f.titulo || "", loading: "lazy", decoding: "async", style: { aspectRatio: proporcion } }),
      f.ejemplo ? h("span", { class: "etiqueta etiqueta--ejemplo" }, "Ejemplo") : null,
      h("span", { class: "foto__pie" }, f.titulo ? h("strong", null, f.titulo) : null, h("span", null, f.autor)));
    return b;
  };

  /* ------------------------------------------------------------ vista galería */
  function pintar(cont, ruta) {
    var f = { quedada: ruta.query.quedada || "", autor: ruta.query.autor || "" };
    cont.appendChild(h("div", { class: "cabecera" },
      h("div", { class: "cabecera__texto" }, h("h1", null, "Galería"), h("p", null, "Las fotos de lo que vamos haciendo. Cualquiera puede subir; cada uno edita y borra las suyas.")),
      h("button", { type: "button", class: "boton boton--primario", onclick: function () { Q.subirFotos({ quedadaId: f.quedada && f.quedada !== "sin" ? f.quedada : "" }); } }, Q.icono("subir", "ico--s"), "Subir fotos")));
    var selQ = h("select", { class: "selector", "aria-label": "Filtrar por quedada" });
    var selA = h("select", { class: "selector", "aria-label": "Filtrar por autor" });
    var resumen = h("span", { class: "tenue", "aria-live": "polite" });
    cont.appendChild(h("div", { class: "galeria-barra" }, selQ, selA, resumen));
    var cuerpo = h("div");
    cont.appendChild(cuerpo);
    selQ.addEventListener("change", function () { f.quedada = selQ.value; repintar(); });
    selA.addEventListener("change", function () { f.autor = selA.value; repintar(); });

    function rellenarSelects() {
      Q.vaciar(selQ); Q.vaciar(selA);
      selQ.appendChild(h("option", { value: "" }, "Todas las quedadas"));
      selQ.appendChild(h("option", { value: "sin" }, "Fotos sin quedada"));
      opcionesQuedadas(false).forEach(function (o) {
        var n = Q.api.estado.fotos.filter(function (x) { return x.quedadaId === o.valor; }).length;
        if (n) selQ.appendChild(h("option", { value: o.valor }, o.texto + " · " + n));
      });
      selA.appendChild(h("option", { value: "" }, "Cualquier autor"));
      var autores = [];
      Q.api.estado.fotos.forEach(function (x) { if (autores.indexOf(x.autor) < 0) autores.push(x.autor); });
      autores.sort(function (a, b) { return a.localeCompare(b, "es"); }).forEach(function (a) { selA.appendChild(h("option", { value: a }, a)); });
      selQ.value = f.quedada; selA.value = f.autor;
      if (selQ.value !== f.quedada) { f.quedada = ""; selQ.value = ""; }
      if (selA.value !== f.autor) { f.autor = ""; selA.value = ""; }
    }

    function repintar() {
      Q.reemplazarHash(Q.construirHash("galeria", null, { quedada: f.quedada, autor: f.autor }));
      Q.vaciar(cuerpo);
      var est = Q.api.estado;
      if (est.cargando && !est.fotos.length) {
        var esq = h("div", { class: "mosaico", "aria-label": "Cargando fotos" });
        [260, 180, 320, 220, 280, 200].forEach(function (alto) { esq.appendChild(h("div", { class: "esqueleto foto", style: { height: alto + "px", cursor: "default" } })); });
        cuerpo.appendChild(esq);
        return;
      }
      if (est.error) {
        cuerpo.appendChild(h("div", { class: "error-bloque", role: "alert" }, h("h3", null, "No se han podido cargar las fotos"), h("p", null, est.error),
          h("button", { type: "button", class: "boton boton--secundario", style: { justifySelf: "start" }, onclick: function () { Q.api.cargar(); } }, Q.icono("recargar", "ico--s"), "Reintentar")));
        return;
      }
      rellenarSelects();
      var lista = Q.fotosOrdenadas().filter(function (x) {
        if (f.quedada === "sin" && x.quedadaId) return false;
        if (f.quedada && f.quedada !== "sin" && x.quedadaId !== f.quedada) return false;
        if (f.autor && x.autor !== f.autor) return false;
        return true;
      });
      resumen.textContent = Q.plural(lista.length, "foto", "fotos");
      if (!lista.length) {
        cuerpo.appendChild(h("div", { class: "vacio vacio--centro" }, Q.icono("camara", "ico--l"),
          h("h3", null, est.fotos.length ? "No hay fotos con estos filtros" : "Todavía no hay fotos"),
          h("p", null, est.fotos.length ? "Cambia la quedada o el autor para ver más." : "Sube las primeras: desde el móvil o el ordenador, se optimizan solas."),
          h("button", { type: "button", class: "boton boton--primario", onclick: function () { Q.subirFotos({ quedadaId: f.quedada && f.quedada !== "sin" ? f.quedada : "" }); } }, Q.icono("subir", "ico--s"), "Subir fotos")));
        return;
      }
      var ids = lista.map(function (x) { return x.id; });
      var mosaico = h("div", { class: "mosaico" });
      lista.forEach(function (x) { mosaico.appendChild(Q.tarjetaFoto(x, ids)); });
      cuerpo.appendChild(mosaico);
    }
    var quitar = Q.api.suscribir(repintar);
    repintar();
    if (ruta.query.foto) Q.cuandoCargado(function () { if (Q.fotoPorId(ruta.query.foto)) Q.abrirFoto(ruta.query.foto); });
    return function () { quitar(); };
  }

  Q.vistas.galeria = { titulo: "Galería", pintar: pintar };
})();
