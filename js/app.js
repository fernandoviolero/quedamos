/* Quedamos · arranque y navegación. */
(function () {
  "use strict";
  var Q = window.Q;
  var main, salirVista = null, ultimaSeccion = null;

  function marcarNav(seccion) {
    document.querySelectorAll(".nav__enlace").forEach(function (a) {
      if (a.dataset.seccion === seccion) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function mostrar() {
    if (Q._ignorarHash) return;
    var ruta = Q.ruta();
    var vista = Q.vistas[ruta.seccion];
    if (!vista) { location.replace("#/inicio"); return; }
    if (salirVista) { try { salirVista(); } catch (e) { console.error(e); } salirVista = null; }
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
    Q.vaciar(main);
    try {
      salirVista = vista.pintar(main, ruta) || null;
    } catch (e) {
      console.error(e);
      main.appendChild(Q.h("div", { class: "error-bloque", role: "alert" },
        Q.h("h1", { style: { fontSize: "var(--t-xl)" } }, "Algo ha fallado al mostrar esta sección"),
        Q.h("p", null, "Recarga la página. Si vuelve a pasar, avisa a quien mantiene la web con este detalle: " + e.message),
        Q.h("a", { class: "boton boton--secundario", href: "#/inicio", style: { justifySelf: "start" } }, "Volver al inicio")));
    }
    var seccionNav = vista.seccionNav || ruta.seccion;
    marcarNav(seccionNav);
    document.title = vista.titulo + " · " + (window.CONFIG.nombre || "Quedamos");
    if (ultimaSeccion !== ruta.seccion + "/" + (ruta.param || "")) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    ultimaSeccion = ruta.seccion + "/" + (ruta.param || "");
  }
  Q.irA = function (hash) { if (location.hash === hash) mostrar(); else location.hash = hash; };

  document.addEventListener("DOMContentLoaded", function () {
    main = document.getElementById("contenido");
    if (Q.api.modo === "demo") {
      var aviso = document.getElementById("aviso-demo");
      var oculto = false;
      try { oculto = sessionStorage.getItem("quedamos.avisoDemo") === "visto"; } catch (e) { /* sin almacenamiento */ }
      aviso.hidden = oculto;
      document.getElementById("cerrar-aviso-demo").addEventListener("click", function () {
        aviso.hidden = true;
        try { sessionStorage.setItem("quedamos.avisoDemo", "visto"); } catch (e) { /* sin almacenamiento */ }
      });
    }
    /* al cambiar de sección se usa una transición de vista si el navegador la tiene */
    window.addEventListener("hashchange", function () {
      if (Q._ignorarHash) return;
      var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.startViewTransition && !reducir && !document.querySelector("dialog[open], .visor")) document.startViewTransition(mostrar);
      else mostrar();
    });
    document.addEventListener("quedamos:yo", function () {
      var r = Q.ruta();
      if (r.seccion === "inicio" || (r.seccion === "recursos" && r.param === "comun")) mostrar();
    });
    if (!location.hash) history.replaceState(null, "", "#/inicio");
    Q.api.cargar();
    mostrar();
    /* al volver a la pestaña, refresca quedadas y fotos */
    var ultimaCarga = Date.now();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - ultimaCarga > 60000 && !document.querySelector("dialog[open], .visor")) {
        ultimaCarga = Date.now();
        Q.api.cargar();
      }
    });
  });
})();
