/* Quedamos · modo demostración.
   Solo se usa mientras js/config.js no tenga apiUrl. Los datos son de EJEMPLO
   (nombres inventados) y lo que se haga aquí vive en memoria y se pierde al recargar. */
(function () {
  "use strict";
  var Q = window.Q;

  function fecha(dias, hora) {
    var d = Q.sumarDias(Q.inicioDia(new Date()), dias);
    var p = hora.split(":");
    d.setHours(+p[0], +p[1]);
    return Q.isoLocal(d);
  }
  function conLugar(q, lid) {
    var l = Q.lugar[lid];
    q.lugarId = lid; q.lugarNombre = l.nombre; q.lugarDireccion = l.direccion; q.lat = l.lat; q.lng = l.lng;
    return q;
  }
  var hoy = Q.isoDia(new Date());

  var quedadas = [
    conLugar({ id: "ej_debod", titulo: "Atardecer en el Templo de Debod", inicio: fecha(4, "18:30"), fin: fecha(4, "20:00"),
      descripcion: "Quedamos en la entrada del parque por Ferraz y subimos al mirador. Traed algo de picar.",
      organizador: "Irene", participantes: ["Irene", "Hugo", "Nerea"], estado: "activa", ejemplo: true }, "templo-debod"),
    conLugar({ id: "ej_replay", titulo: "Noche de juegos de mesa", inicio: fecha(9, "19:00"), fin: fecha(9, "22:00"),
      descripcion: "Partidas rápidas para empezar y algo largo si nos animamos.",
      organizador: "Nerea", participantes: ["Nerea", "Marcos"], estado: "activa", ejemplo: true }, "replay"),
    conLugar({ id: "ej_sierra", titulo: "Ruta por Cercedilla", inicio: fecha(17, "09:00"), fin: fecha(17, "15:30"),
      descripcion: "Tren de Cercanías hasta Cercedilla. Ruta fácil, unas 3 horas. Calzado de montaña.",
      organizador: "Hugo", participantes: ["Hugo", "Irene", "Marcos", "Nerea"], estado: "activa", ejemplo: true }, "cercedilla"),
    conLugar({ id: "ej_retiro", titulo: "Picnic en el Retiro", inicio: fecha(-6, "12:30"), fin: fecha(-6, "16:00"),
      descripcion: "Junto al estanque grande.", organizador: "Marcos", participantes: ["Marcos", "Irene", "Hugo"], estado: "activa", ejemplo: true }, "retiro")
  ];

  var fotos = [
    { id: "ejf_1", url: "img/ejemplos/atardecer.svg", ancho: 1200, alto: 800, titulo: "Atardecer desde el mirador", descripcion: "Ilustración de ejemplo.", fecha: hoy, autor: "Irene", quedadaId: "ej_debod", ejemplo: true },
    { id: "ejf_2", url: "img/ejemplos/retiro.svg", ancho: 900, alto: 1200, titulo: "Barcas en el estanque", descripcion: "Ilustración de ejemplo.", fecha: quedadas[3].inicio.slice(0, 10), autor: "Marcos", quedadaId: "ej_retiro", ejemplo: true },
    { id: "ejf_3", url: "img/ejemplos/juegos.svg", ancho: 1200, alto: 1200, titulo: "La mesa de juegos", descripcion: "Ilustración de ejemplo.", fecha: hoy, autor: "Nerea", quedadaId: "ej_replay", ejemplo: true },
    { id: "ejf_4", url: "img/ejemplos/sierra.svg", ancho: 1200, alto: 800, titulo: "Camino a la sierra", descripcion: "Ilustración de ejemplo.", fecha: hoy, autor: "Hugo", quedadaId: "ej_sierra", ejemplo: true },
    { id: "ejf_5", url: "img/ejemplos/teatro.svg", ancho: 900, alto: 1200, titulo: "Antes de la función", descripcion: "Ilustración de ejemplo.", fecha: hoy, autor: "Irene", quedadaId: "", ejemplo: true },
    { id: "ejf_6", url: "img/ejemplos/sushi.svg", ancho: 1200, alto: 900, titulo: "Cena de sushi", descripcion: "Ilustración de ejemplo.", fecha: hoy, autor: "Hugo", quedadaId: "", ejemplo: true }
  ];

  function espera(v) { return new Promise(function (ok) { setTimeout(function () { ok(v); }, 350); }); }
  function fallo(codigo, mensaje) { var e = new Error(mensaje); e.codigo = codigo; return Promise.reject(e); }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function validarQuedada(d, idActual) {
    if (!d.titulo || d.titulo.trim().length < 3) return "El nombre de la quedada debe tener al menos 3 caracteres.";
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.inicio || "")) return "Falta la fecha u hora de inicio.";
    if (d.fin && d.fin <= d.inicio) return "La hora de fin tiene que ser posterior a la de inicio.";
    var dup = quedadas.find(function (q) {
      return q.id !== idActual && q.estado !== "cancelada" && q.inicio.slice(0, 10) === d.inicio.slice(0, 10) && Q.normalizar(q.titulo) === Q.normalizar(d.titulo);
    });
    if (dup) return "Ya hay una quedada con ese nombre ese mismo día. Abre «" + dup.titulo + "» y apúntate.";
    return null;
  }
  function yo() { var y = Q.yo && Q.yo.actual(); return y ? y.nombre : null; }
  function buscar(id) { return quedadas.find(function (q) { return q.id === id; }); }

  Q.demo = {
    cargar: function () { return espera({ ok: true, quedadas: copia(quedadas), fotos: copia(fotos) }); },
    accion: function (accion, d) {
      var quien = yo();
      if (!quien) return fallo("sin_identidad", "Elige quién eres antes de guardar.");
      var q, e;
      switch (accion) {
        case "crearQuedada":
          e = validarQuedada(d); if (e) return fallo("validacion", e);
          q = Object.assign({}, d, { id: Q.id("q"), organizador: quien, participantes: [quien], estado: "activa", creadoEn: Q.isoLocal(new Date()), demo: true });
          quedadas.push(q); return espera({ ok: true, quedada: copia(q) });
        case "editarQuedada":
          q = buscar(d.id); if (!q) return fallo("no_existe", "Esa quedada ya no existe.");
          e = validarQuedada(d, d.id); if (e) return fallo("validacion", e);
          Object.assign(q, d, { actualizadoPor: quien, actualizadoEn: Q.isoLocal(new Date()) });
          return espera({ ok: true, quedada: copia(q) });
        case "cancelarQuedada":
        case "reactivarQuedada":
          q = buscar(d.id); if (!q) return fallo("no_existe", "Esa quedada ya no existe.");
          if (accion === "reactivarQuedada") { e = validarQuedada(q, q.id); if (e) return fallo("validacion", e); }
          q.estado = accion === "cancelarQuedada" ? "cancelada" : "activa"; q.actualizadoPor = quien;
          return espera({ ok: true, quedada: copia(q) });
        case "apuntarse":
          q = buscar(d.id); if (!q) return fallo("no_existe", "Esa quedada ya no existe.");
          if (q.estado === "cancelada") return fallo("cancelada", "Esta quedada está cancelada.");
          if (q.participantes.map(Q.normalizar).indexOf(Q.normalizar(quien)) < 0) q.participantes.push(quien);
          return espera({ ok: true, quedada: copia(q) });
        case "desapuntarse":
          q = buscar(d.id); if (!q) return fallo("no_existe", "Esa quedada ya no existe.");
          q.participantes = q.participantes.filter(function (p) { return Q.normalizar(p) !== Q.normalizar(quien); });
          return espera({ ok: true, quedada: copia(q) });
        case "subirFoto":
          var f = { id: Q.id("f"), url: "data:" + d.mime + ";base64," + d.base64, ancho: d.ancho, alto: d.alto, titulo: d.titulo, descripcion: d.descripcion,
            fecha: d.fecha, autor: quien, quedadaId: d.quedadaId || "", creadoEn: Q.isoLocal(new Date()), demo: true };
          fotos.push(f); return espera({ ok: true, foto: copia(f) });
        case "editarFoto":
        case "borrarFoto":
          f = fotos.find(function (x) { return x.id === d.id; });
          if (!f) return fallo("no_existe", "Esa foto ya no existe.");
          if (Q.normalizar(f.autor) !== Q.normalizar(quien)) return fallo("sin_permiso", "Solo " + f.autor + " puede cambiar o borrar esta foto.");
          if (accion === "borrarFoto") { fotos = fotos.filter(function (x) { return x.id !== d.id; }); return espera({ ok: true, foto: { id: d.id, estado: "borrada" } }); }
          ["titulo", "descripcion", "fecha", "quedadaId"].forEach(function (k) { if (d[k] !== undefined) f[k] = d[k]; });
          return espera({ ok: true, foto: copia(f) });
      }
      return fallo("accion", "Acción desconocida.");
    }
  };
})();
