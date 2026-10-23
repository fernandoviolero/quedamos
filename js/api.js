/* Quedamos · conexión con la hoja de Google (Apps Script).
   Si no hay URL configurada, usa el modo demostración (js/demo.js). */
(function () {
  "use strict";
  var Q = window.Q;
  var URL_API = (window.CONFIG && window.CONFIG.apiUrl || "").trim();

  var estado = { cargando: true, error: null, quedadas: [], fotos: [], actualizado: null };
  var oyentes = [];

  function avisar() { oyentes.forEach(function (fn) { try { fn(estado); } catch (e) { console.error(e); } }); }

  var MENSAJES = {
    red: "No hay conexión con la hoja de Google. Revisa tu conexión a internet y vuelve a intentarlo.",
    tiempo: "La hoja de Google tarda demasiado en responder. Vuelve a intentarlo en un momento.",
    respuesta: "La hoja de Google ha respondido algo inesperado. Revisa que la URL de config.js sea la de la implementación (termina en /exec)."
  };

  function peticion(metodo, cuerpo, msTiempo) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, msTiempo || 25000);
    var opciones = { method: metodo, redirect: "follow", signal: ctrl.signal };
    var url = URL_API;
    if (metodo === "GET") url += (url.indexOf("?") < 0 ? "?" : "&") + "accion=todo&t=" + Date.now();
    else {
      /* text/plain evita la comprobación previa CORS que Apps Script no admite */
      opciones.headers = { "Content-Type": "text/plain;charset=utf-8" };
      opciones.body = JSON.stringify(cuerpo);
    }
    return fetch(url, opciones).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error(MENSAJES.respuesta + " (HTTP " + r.status + ")");
      return r.text();
    }, function (e) {
      clearTimeout(t);
      throw new Error(e.name === "AbortError" ? MENSAJES.tiempo : MENSAJES.red);
    }).then(function (texto) {
      var json;
      try { json = JSON.parse(texto); } catch (e) { throw new Error(MENSAJES.respuesta); }
      if (!json.ok) {
        var err = new Error((json.error && json.error.mensaje) || "La hoja de Google ha rechazado la operación.");
        err.codigo = json.error && json.error.codigo;
        throw err;
      }
      return json;
    });
  }

  var real = {
    cargar: function () { return peticion("GET"); },
    accion: function (accion, datos) {
      var yo = Q.yo && Q.yo.actual();
      return peticion("POST", { accion: accion, datos: datos, quien: yo ? { nombre: yo.nombre } : null }, accion === "subirFoto" ? 120000 : 30000);
    }
  };

  function fuente() { return URL_API ? real : Q.demo; }

  function aplicar(res) {
    if (res.quedada) {
      var i = estado.quedadas.findIndex(function (q) { return q.id === res.quedada.id; });
      if (i >= 0) estado.quedadas[i] = res.quedada; else estado.quedadas.push(res.quedada);
    }
    if (res.foto) {
      var j = estado.fotos.findIndex(function (f) { return f.id === res.foto.id; });
      if (res.foto.estado === "borrada") { if (j >= 0) estado.fotos.splice(j, 1); }
      else if (j >= 0) estado.fotos[j] = res.foto; else estado.fotos.push(res.foto);
    }
    estado.actualizado = new Date();
    avisar();
    return res;
  }

  Q.api = {
    modo: URL_API ? "real" : "demo",
    estado: estado,
    suscribir: function (fn) { oyentes.push(fn); return function () { oyentes = oyentes.filter(function (x) { return x !== fn; }); }; },
    cargar: function () {
      estado.cargando = true; estado.error = null; avisar();
      return fuente().cargar().then(function (res) {
        estado.quedadas = res.quedadas || [];
        estado.fotos = res.fotos || [];
        estado.cargando = false; estado.actualizado = new Date();
        avisar();
      }, function (e) {
        estado.cargando = false; estado.error = e.message; avisar();
      });
    },
    hacer: function (accion, datos) { return fuente().accion(accion, datos).then(aplicar); },
    urlFoto: function (f, ancho) {
      if (f.url) return f.url; /* fotos de ejemplo */
      return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(f.fileId) + "&sz=w" + (ancho || 800);
    }
  };

  /* ejecuta fn cuando la primera carga haya terminado (bien o mal) */
  Q.cuandoCargado = function (fn) {
    if (!estado.cargando) { fn(estado); return; }
    var quitar = Q.api.suscribir(function (e) { if (!e.cargando) { quitar(); fn(e); } });
  };

  /* consultas habituales */
  Q.quedadasOrdenadas = function () {
    return estado.quedadas.slice().sort(function (a, b) { return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0; });
  };
  Q.proximasQuedadas = function (max) {
    var ahora = Q.isoLocal(Q.sumarDias(new Date(), 0)).slice(0, 10);
    return Q.quedadasOrdenadas().filter(function (q) { return q.estado !== "cancelada" && (q.fin || q.inicio).slice(0, 10) >= ahora; }).slice(0, max || 1000);
  };
  Q.fotosOrdenadas = function () {
    return estado.fotos.slice().sort(function (a, b) {
      var x = (b.fecha || "") + (b.creadoEn || ""), y = (a.fecha || "") + (a.creadoEn || "");
      return x < y ? -1 : x > y ? 1 : 0;
    });
  };
  Q.quedadaPorId = function (id) { return estado.quedadas.find(function (q) { return q.id === id; }) || null; };
  Q.fotoPorId = function (id) { return estado.fotos.find(function (f) { return f.id === id; }) || null; };
})();
