/* Quedamos · "¿Quién eres?"
   Sin contraseñas: cada uno elige su nombre una vez en su dispositivo.
   Sirve para firmar quedadas y fotos. Se guarda solo en este navegador. */
(function () {
  "use strict";
  var Q = window.Q;
  var CLAVE = "quedamos.yo";
  var actual = null;
  try { actual = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { actual = null; }

  function guardar(y) {
    actual = y;
    try { if (y) localStorage.setItem(CLAVE, JSON.stringify(y)); else localStorage.removeItem(CLAVE); } catch (e) { /* navegador sin almacenamiento */ }
    pintarBoton();
    document.dispatchEvent(new CustomEvent("quedamos:yo"));
  }

  function pintarBoton() {
    var b = document.getElementById("boton-yo");
    if (!b) return;
    Q.vaciar(b);
    if (actual) {
      b.appendChild(Q.avatar(actual.id || actual.nombre, "s", true));
      b.appendChild(Q.h("span", { class: "yo__texto" }, actual.nombre));
      b.setAttribute("aria-label", "Estás como " + actual.nombre + ". Cambiar");
    } else {
      b.appendChild(Q.h("span", { class: "avatar avatar--s", "aria-hidden": "true" }, "?"));
      b.appendChild(Q.h("span", { class: "yo__texto" }, "¿Quién eres?"));
      b.setAttribute("aria-label", "Elegir quién eres");
    }
  }

  function pedir(motivo) {
    return new Promise(function (resolve) {
      var elegido = actual;
      var buscador = Q.h("input", { class: "entrada", type: "search", placeholder: "Busca tu nombre…", "aria-label": "Busca tu nombre" });
      var lista = Q.h("div", { class: "lista-personas-dialogo", role: "group", "aria-label": "Personas del grupo" });
      var otro = Q.campo({ etiqueta: "¿No estás en la lista? Escribe tu nombre", nombre: "otro", max: 40, placeholder: "Nombre y, si hace falta, apellido", requerido: true, ayuda: "Aparecerás así en las quedadas y fotos." });
      otro.el.querySelector("label .tenue") && otro.el.querySelector("label .tenue").remove();
      var ok = false;

      function pintar() {
        Q.vaciar(lista);
        var f = Q.normalizar(buscador.value);
        Q.D.personas.slice().sort(Q.ordenAlfa).forEach(function (p) {
          if (f && Q.normalizar(p.nombre).indexOf(f) < 0) return;
          var b = Q.h("button", { type: "button", class: "opcion-persona", "aria-pressed": String(!!(elegido && elegido.id === p.id)),
            onclick: function () { elegido = { id: p.id, nombre: p.nombre }; otro.control.value = ""; pintar(); } });
          b.appendChild(Q.avatar(p.id, "xs", true)); b.appendChild(document.createTextNode(p.nombre));
          lista.appendChild(b);
        });
        if (!lista.children.length) lista.appendChild(Q.h("p", { class: "tenue" }, "Nadie con ese nombre. Escríbelo abajo."));
      }
      buscador.addEventListener("input", pintar);
      otro.control.addEventListener("input", function () { if (otro.valor()) { elegido = null; pintar(); } otro.error(null); });
      if (actual && !actual.id) otro.control.value = actual.nombre;
      pintar();

      var dlg = Q.dialogo({
        titulo: "¿Quién eres?",
        ancho: true,
        cuerpo: [
          Q.h("p", { class: "sub" }, motivo || "Elige tu nombre para firmar las quedadas y las fotos que subas. Se recuerda en este dispositivo; no hay contraseñas."),
          Q.h("div", { style: { marginTop: "14px" } }, buscador), lista,
          Q.h("div", { style: { marginTop: "20px" } }, otro.el)
        ],
        pie: [
          actual ? Q.h("button", { class: "boton boton--fantasma izq", type: "button", onclick: function () { guardar(null); dlg.cerrar(); Q.toast("Has salido. Elige tu nombre cuando quieras."); } }, "No soy " + actual.nombre.split(" ")[0]) : null,
          Q.h("button", { class: "boton boton--secundario", type: "button", onclick: function () { dlg.cerrar(); } }, "Cancelar"),
          Q.h("button", { class: "boton boton--primario", type: "button", onclick: function () {
            var texto = otro.valor();
            if (texto) {
              if (texto.length < 2) return otro.error("Escribe al menos 2 letras.");
              var coincide = Q.personaPorNombre(texto);
              elegido = coincide ? { id: coincide.id, nombre: coincide.nombre } : { id: null, nombre: texto.replace(/\s+/g, " ") };
            }
            if (!elegido) { otro.error("Elige tu nombre en la lista o escríbelo aquí."); return; }
            ok = true; guardar(elegido); dlg.cerrar();
            Q.toast("Hola, " + elegido.nombre.split(" ")[0] + ".");
          } }, "Soy yo")
        ],
        alCerrar: function () { resolve(ok ? actual : null); }
      });
      if (Q.punteroFino()) setTimeout(function () { buscador.focus(); }, 50);
    });
  }

  Q.yo = {
    actual: function () { return actual; },
    pedir: pedir,
    /* devuelve una promesa con la identidad; si no hay, la pide */
    asegurar: function (motivo) { return actual ? Promise.resolve(actual) : pedir(motivo); },
    es: function (nombre) { return !!actual && Q.normalizar(actual.nombre) === Q.normalizar(nombre); },
    pintarBoton: pintarBoton
  };
  document.addEventListener("DOMContentLoaded", function () {
    pintarBoton();
    document.getElementById("boton-yo").addEventListener("click", function () { pedir(); });
  });
})();
