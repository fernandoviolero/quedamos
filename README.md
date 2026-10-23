# Quedamos

Web del grupo para compartir recomendaciones, ver los sitios en un mapa de Madrid, organizar quedadas y guardar las fotos.

Es una web estática (HTML, CSS y JavaScript, sin compilar nada), igual que la de AGEgrupo: se abre con doble clic en `index.html` y se publica en GitHub Pages. Lo único que necesita un servidor, el calendario y la galería, usa una hoja de Google y una carpeta de Drive tuyas a través de Apps Script (gratis).

---

## 1. Qué hay en cada carpeta

```
index.html                 La web (todas las secciones)
css/estilos.css            Diseño
js/config.js               ← Aquí pegas la URL de Apps Script
js/datos.js                Recomendaciones y lugares (salen del Excel del formulario)
js/nucleo.js               Utilidades, enlaces, diálogos, navegación
js/api.js                  Conexión con la hoja de Google
js/demo.js                 Datos de EJEMPLO para cuando aún no hay hoja conectada
js/identidad.js            «¿Quién eres?»
js/red.js                  Red animada «Quién coincide con quién» del inicio
js/vista-*.js              Una por sección: inicio, recursos, mapa, calendario, galería
js/app.js                  Arranque
img/                       Icono e ilustraciones de ejemplo
apps-script/Codigo.gs      El «servidor»: se pega en Apps Script
herramientas/importar.html Para añadir los formularios 2 y 3
robots.txt                 Pide a los buscadores que no la indexen
```

## 2. Cómo se relacionan las secciones

```
Formulario (Excel) ──► herramientas/importar.html ──► js/datos.js
                                                         │
             ┌───────────────────────────────────────────┤
             ▼                                           ▼
     Banco de recursos  ── un recurso puede tener ──►  Lugares ──► Mapa de Madrid
     (agrupa coincidencias,     uno o varios lugares        │
      temas en común, perfiles)                             │ «Proponer quedada aquí»
                                                            ▼
     Hoja de Google «Quedadas» ◄──── Calendario ──── la quedada guarda el lugar
     Carpeta de Drive + hoja «Fotos» ◄── Galería ── cada foto puede ir a una quedada
```

- **Recursos** y **mapa** son de solo lectura: salen del formulario.
- **Calendario** y **galería** los puede tocar todo el grupo. Cualquiera puede crear, editar, cancelar y apuntarse a quedadas. Cada uno solo edita o borra sus propias fotos.
- No hay contraseñas. Cada persona elige su nombre una vez en su móvil u ordenador («¿Quién eres?») y con él firma lo que crea.

## 3. Probarla en tu ordenador

Haz doble clic en `index.html`. Verás el aviso amarillo de **modo demostración**: recursos, mapa e intereses son los reales del formulario, pero el calendario y la galería enseñan datos de **ejemplo** (nombres inventados: Irene, Hugo, Nerea, Marcos) y lo que hagas ahí no se guarda.

Si prefieres abrirla con VS Code, la extensión *Live Server* también vale.

## 4. Conectar la hoja de Google (calendario y fotos reales)

Unos 10 minutos. Usa una **cuenta personal de Gmail**: algunas cuentas de universidad no dejan compartir archivos por enlace, y las fotos no se verían.

1. Entra en [sheets.new](https://sheets.new) y llama a la hoja, por ejemplo, «Quedamos».
2. Menú **Extensiones › Apps Script**.
3. Borra lo que haya en `Código.gs` y pega todo el contenido de `apps-script/Codigo.gs`. Guarda (icono del disquete).
4. Arriba, en el desplegable de funciones, elige **configurar** y pulsa **Ejecutar**. Google te pedirá permisos:
   *Revisar permisos › tu cuenta › Configuración avanzada › Ir a Quedamos (no seguro) › Permitir.*
   Sale ese aviso porque el script es tuyo y no está verificado por Google; es normal. Al terminar tendrás las pestañas «Quedadas» y «Fotos» en la hoja y una carpeta «Quedamos - fotos» en tu Drive.
5. **Implementar › Nueva implementación**. En el engranaje elige **Aplicación web** y rellena:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. Abre `js/config.js` y pégala:
   ```js
   apiUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
7. Recarga la web. El aviso amarillo desaparece; ya se guarda de verdad.

**Si cambias algo de `Codigo.gs` más adelante:** *Implementar › Gestionar implementaciones › lápiz › Versión: Nueva versión › Implementar*. Así la URL sigue siendo la misma.

La hoja es tuya: puedes ver y corregir las quedadas directamente en ella. Las fotos borradas desde la web van a la papelera de Drive (30 días).

## 5. Publicarla en GitHub Pages

Como hiciste con la web de tu padre:

1. Crea un repositorio nuevo (por ejemplo `quedamos`) y sube **todo el contenido** de esta carpeta, con `index.html` en la raíz.
2. **Settings › Pages › Deploy from a branch › main › / (root) › Save.**
3. En un par de minutos estará en `https://TU-USUARIO.github.io/quedamos/`. Ese es el enlace para el grupo.

No hace falta dominio. Lleva `noindex` y `robots.txt`, así que los buscadores no la mostrarán.

### Lo que conviene saber sobre privacidad

- Con GitHub gratis el **repositorio es público**: cualquiera que lo encuentre en tu perfil puede ver `datos.js` (nombres de pila y recomendaciones) y la URL de Apps Script de `config.js`.
- Con esa URL alguien ajeno podría crear quedadas o subir fotos. Es poco probable, pero si pasara: en Apps Script crea una **nueva implementación** (cambia la URL), pégala en `config.js` y archiva la antigua en *Gestionar implementaciones*.
- Si algún día queréis más privacidad: repositorio privado (GitHub Pro) o una contraseña de grupo con los datos cifrados. Se puede añadir sin rehacer la web.

## 6. Añadir los formularios 2 y 3

1. En Google Forms: *Respuestas › icono de Hojas de cálculo › Archivo › Descargar › Microsoft Excel (.xlsx)*.
2. Abre `herramientas/importar.html` (doble clic o desde el enlace al pie de la web).
3. Sigue los pasos:
   - Elige el Excel y pon el mes (por ejemplo `2026-11`, «Noviembre 2026»).
   - Marca qué columnas son recomendaciones y cuál pregunta trata de sitios.
   - Confirma quién es quién: los nombres que ya estaban se enlazan solos.
   - Revisa cómo se ha partido cada respuesta. Lo que ya existía viene marcado «Igual que…» y se agrupará con quien lo recomendó antes. Corrige lo que haga falta.
   - Para los sitios nuevos pulsa **Buscar coordenadas** (CartoCiudad, el buscador oficial del IGN). Si no lo encuentra, **Pegar coordenadas** desde Google Maps (clic derecho sobre el sitio › los números de arriba).
4. **Descargar datos.js**, sustitúyelo en `js/` y sube el cambio a GitHub.

El progreso se guarda en tu navegador, así que puedes dejarlo a medias. El Excel no se sube a ningún sitio.

## 7. Cómo se hizo la primera importación

- 34 respuestas de 33 personas («Lucía (otra vez)» se unió a «Lucía»). Todas las demás se tratan como personas distintas, aunque compartan nombre.
- Cada respuesta se separó a mano en recursos concretos (*La bola negra*, *Roca Project*…) y aficiones (*ir al teatro*, *salir a correr*…). Lo mismo dicho de formas distintas se agrupó: «Roca Proyect», «roca project» y «Roca Project» son un solo recurso con 3 personas.
- Las direcciones se verificaron una a una. Las coordenadas vienen de CartoCiudad (IGN) o del enlace de Google Maps de la ficha del local. Ninguna está inventada. Cuando hubo dudas razonables (el mirador de Paracuellos, el Izumo de Alcorcón, Revuelto) la ficha lo indica para que lo confirméis con quien lo recomendó.
- Sin marcador en el mapa, pero con enlace de búsqueda: las cadenas con varios locales (VIPS, 100 Montaditos, Beata Pasta, Nolita) y los sitios cuya dirección no se pudo confirmar (La Biblioteca, Epoka, Todos Santos, Pool Bar, Nuna Café, Bar Serranito, Cervecería Anpe, El Pepe, Parque de Francos Rodríguez, el cluedo de Plaza de España).
- Los enlaces externos son búsquedas reales (Spotify, FilmAffinity, Goodreads, Google Play, Google Maps). No se inventó ninguna URL concreta.

## 8. Cambios habituales

| Quiero… | Dónde |
|---|---|
| Cambiar el nombre «Quedamos» | `index.html` (título y logo) y `js/config.js` |
| Cambiar colores | Variables al principio de `css/estilos.css` |
| Corregir una recomendación o una dirección | `js/datos.js` (buscar por nombre) |
| Añadir ideas de planes por tema | `PLANES_POR_TEMA` en `js/vista-calendario.js` |
| Quitar los datos de ejemplo | Se quitan solos al poner `apiUrl` en `config.js` |
| Usar el fondo de mapa de CARTO | Pide la clave gratis y ponla en `cartoClave` de `config.js` |

## 9. Servicios externos que usa

- **Leaflet** (mapa) y **OpenStreetMap** (fondo del mapa), gratis y sin clave.
- **CARTO** (opcional): fondo de mapa más limpio. Desde septiembre de 2026 pide una clave; es gratis para proyectos no comerciales y se solicita por email en [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/). Si la consigues, pégala en `cartoClave` de `js/config.js`.
- **Google Fonts**: Bricolage Grotesque y Young Serif.
- **Apps Script + Google Sheets + Google Drive**: calendario y fotos.
- **CartoCiudad (IGN)**: solo en la herramienta de importación, para buscar coordenadas.
- **SheetJS**: solo en la herramienta de importación, para leer el Excel.
