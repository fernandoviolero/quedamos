/**
 * Quedamos · servidor en Google Apps Script
 * -----------------------------------------------------------------
 * Guarda las quedadas en la hoja «Quedadas» y las fotos en la carpeta
 * de Drive «Quedamos - fotos» (registradas en la hoja «Fotos»).
 *
 * Instalación (detallada en el README):
 *   1. Crea una hoja de cálculo de Google vacía.
 *   2. Extensiones > Apps Script. Borra lo que haya y pega este archivo.
 *   3. Ejecuta una vez la función «configurar» y acepta los permisos.
 *   4. Implementar > Nueva implementación > Aplicación web.
 *      Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 *   5. Copia la URL que termina en /exec en js/config.js (apiUrl).
 */

var HOJA_QUEDADAS = 'Quedadas';
var HOJA_FOTOS = 'Fotos';
var NOMBRE_CARPETA = 'Quedamos - fotos';
var COLS_Q = ['id', 'titulo', 'inicio', 'fin', 'lugarId', 'lugarNombre', 'lugarDireccion', 'lat', 'lng', 'descripcion',
  'organizador', 'participantes', 'estado', 'creadoEn', 'actualizadoEn', 'actualizadoPor'];
var COLS_F = ['id', 'fileId', 'titulo', 'descripcion', 'fecha', 'autor', 'quedadaId', 'ancho', 'alto', 'creadoEn', 'actualizadoEn', 'estado'];
var MIMES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
var MAX_BASE64 = 10 * 1024 * 1024; // ~7,5 MB de imagen

/* ------------------------------------------------------------------ entrada */

function doGet(e) {
  return responder(function () {
    var accion = (e && e.parameter && e.parameter.accion) || 'todo';
    if (accion === 'ping') return { pong: true, hora: ahora() };
    if (accion !== 'todo') throw error('accion', 'Acción desconocida: ' + accion);
    asegurarHojas();
    return {
      quedadas: leer(HOJA_QUEDADAS, COLS_Q).map(quedadaDesdeFila),
      fotos: leer(HOJA_FOTOS, COLS_F).filter(function (f) { return f.estado !== 'borrada'; }).map(fotoDesdeFila)
    };
  });
}

function doPost(e) {
  return responder(function () {
    var cuerpo;
    try { cuerpo = JSON.parse(e.postData.contents); } catch (x) { throw error('json', 'La petición no es válida.'); }
    var quien = cuerpo.quien && texto(cuerpo.quien.nombre, 60);
    if (!quien) throw error('sin_identidad', 'Elige quién eres antes de guardar.');
    var d = cuerpo.datos || {};
    var cerrojo = LockService.getScriptLock();
    if (!cerrojo.tryLock(20000)) throw error('ocupado', 'Hay mucha gente guardando a la vez. Vuelve a intentarlo en unos segundos.');
    try {
      asegurarHojas();
      switch (cuerpo.accion) {
        case 'crearQuedada': return { quedada: crearQuedada(d, quien) };
        case 'editarQuedada': return { quedada: editarQuedada(d, quien) };
        case 'cancelarQuedada': return { quedada: cambiarEstado(d.id, 'cancelada', quien) };
        case 'reactivarQuedada': return { quedada: cambiarEstado(d.id, 'activa', quien) };
        case 'apuntarse': return { quedada: apuntar(d.id, quien, true) };
        case 'desapuntarse': return { quedada: apuntar(d.id, quien, false) };
        case 'subirFoto': return { foto: subirFoto(d, quien) };
        case 'editarFoto': return { foto: editarFoto(d, quien) };
        case 'borrarFoto': return { foto: borrarFoto(d, quien) };
        default: throw error('accion', 'Acción desconocida.');
      }
    } finally {
      cerrojo.releaseLock();
    }
  });
}

function responder(fn) {
  var salida;
  try {
    var res = fn();
    res.ok = true;
    salida = res;
  } catch (e) {
    salida = { ok: false, error: { codigo: e.codigo || 'interno', mensaje: e.codigo ? e.message : 'Error en la hoja de Google: ' + e.message } };
  }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ quedadas */

function validarQuedada(d, idActual) {
  var q = {
    titulo: texto(d.titulo, 80),
    inicio: String(d.inicio || ''),
    fin: String(d.fin || ''),
    lugarId: texto(d.lugarId, 60),
    lugarNombre: texto(d.lugarNombre, 120),
    lugarDireccion: texto(d.lugarDireccion, 200),
    lat: numero(d.lat, -90, 90),
    lng: numero(d.lng, -180, 180),
    descripcion: texto(d.descripcion, 600)
  };
  if (q.titulo.length < 3) throw error('validacion', 'El nombre de la quedada debe tener al menos 3 caracteres.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q.inicio)) throw error('validacion', 'Falta la fecha u hora de inicio.');
  if (q.fin && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(q.fin)) throw error('validacion', 'La hora de fin no es válida.');
  if (q.fin && q.fin <= q.inicio) throw error('validacion', 'La hora de fin tiene que ser posterior a la de inicio.');
  var dia = q.inicio.slice(0, 10);
  var dup = leer(HOJA_QUEDADAS, COLS_Q).filter(function (x) {
    return x.id !== idActual && x.estado !== 'cancelada' && String(x.inicio).slice(0, 10) === dia && normalizar(x.titulo) === normalizar(q.titulo);
  })[0];
  if (dup) throw error('duplicada', 'Ya hay una quedada «' + dup.titulo + '» ese mismo día. Apúntate a esa en lugar de crear otra.');
  return q;
}

function crearQuedada(d, quien) {
  var q = validarQuedada(d, null);
  if (q.inicio < ahora().slice(0, 16)) throw error('validacion', 'Esa fecha y hora ya han pasado.');
  q.id = 'q_' + Utilities.getUuid().slice(0, 8);
  q.organizador = quien;
  q.participantes = JSON.stringify([quien]);
  q.estado = 'activa';
  q.creadoEn = ahora();
  q.actualizadoEn = q.creadoEn;
  q.actualizadoPor = quien;
  anadirFila(HOJA_QUEDADAS, COLS_Q, q);
  return quedadaDesdeFila(q);
}

function editarQuedada(d, quien) {
  var fila = buscar(HOJA_QUEDADAS, COLS_Q, d.id);
  if (!fila) throw error('no_existe', 'Esa quedada ya no existe.');
  if (fila.datos.estado === 'cancelada') throw error('cancelada', 'Reactiva la quedada antes de editarla.');
  var q = validarQuedada(d, d.id);
  q.actualizadoEn = ahora();
  q.actualizadoPor = quien;
  var nueva = mezclar(fila.datos, q);
  escribirFila(HOJA_QUEDADAS, COLS_Q, fila.indice, nueva);
  return quedadaDesdeFila(nueva);
}

function cambiarEstado(id, estado, quien) {
  var fila = buscar(HOJA_QUEDADAS, COLS_Q, id);
  if (!fila) throw error('no_existe', 'Esa quedada ya no existe.');
  if (estado === 'activa') validarQuedada(fila.datos, id);
  var q = mezclar(fila.datos, { estado: estado, actualizadoEn: ahora(), actualizadoPor: quien });
  escribirFila(HOJA_QUEDADAS, COLS_Q, fila.indice, q);
  return quedadaDesdeFila(q);
}

function apuntar(id, quien, entrar) {
  var fila = buscar(HOJA_QUEDADAS, COLS_Q, id);
  if (!fila) throw error('no_existe', 'Esa quedada ya no existe.');
  if (entrar && fila.datos.estado === 'cancelada') throw error('cancelada', 'Esta quedada está cancelada.');
  var lista = listaParticipantes(fila.datos.participantes);
  var ya = lista.some(function (p) { return normalizar(p) === normalizar(quien); });
  if (entrar && !ya) lista.push(quien);
  if (!entrar) lista = lista.filter(function (p) { return normalizar(p) !== normalizar(quien); });
  var q = mezclar(fila.datos, { participantes: JSON.stringify(lista), actualizadoEn: ahora() });
  escribirFila(HOJA_QUEDADAS, COLS_Q, fila.indice, q);
  return quedadaDesdeFila(q);
}

function quedadaDesdeFila(x) {
  return {
    id: String(x.id), titulo: String(x.titulo), inicio: fechaTexto(x.inicio), fin: fechaTexto(x.fin),
    lugarId: String(x.lugarId || ''), lugarNombre: String(x.lugarNombre || ''), lugarDireccion: String(x.lugarDireccion || ''),
    lat: x.lat === '' ? '' : Number(x.lat), lng: x.lng === '' ? '' : Number(x.lng),
    descripcion: String(x.descripcion || ''), organizador: String(x.organizador || ''),
    participantes: listaParticipantes(x.participantes), estado: String(x.estado || 'activa'),
    creadoEn: fechaTexto(x.creadoEn), actualizadoEn: fechaTexto(x.actualizadoEn), actualizadoPor: String(x.actualizadoPor || '')
  };
}

function listaParticipantes(v) {
  if (Array.isArray(v)) return v;
  try { var l = JSON.parse(v || '[]'); return Array.isArray(l) ? l.map(String) : []; } catch (e) { return []; }
}

/* ------------------------------------------------------------------ fotos */

function carpeta() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CARPETA_FOTOS');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: crear otra */ } }
  var c = DriveApp.createFolder(NOMBRE_CARPETA);
  props.setProperty('CARPETA_FOTOS', c.getId());
  return c;
}

function subirFoto(d, quien) {
  var mime = String(d.mime || '');
  if (!MIMES[mime]) throw error('validacion', 'Solo se admiten fotos JPG, PNG o WebP.');
  var b64 = String(d.base64 || '');
  if (!b64) throw error('validacion', 'Falta la imagen.');
  if (b64.length > MAX_BASE64) throw error('validacion', 'La foto es demasiado grande (máximo unos 7 MB).');
  var fecha = String(d.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw error('validacion', 'La fecha de la foto no es válida.');
  var quedadaId = texto(d.quedadaId, 40);
  if (quedadaId && !buscar(HOJA_QUEDADAS, COLS_Q, quedadaId)) throw error('validacion', 'La quedada elegida ya no existe.');
  var id = 'f_' + Utilities.getUuid().slice(0, 8);
  var bytes = Utilities.base64Decode(b64);
  var blob = Utilities.newBlob(bytes, mime, fecha + '_' + id + '.' + MIMES[mime]);
  var archivo = carpeta().createFile(blob);
  try {
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    archivo.setTrashed(true);
    throw error('compartir', 'Tu cuenta de Google no permite compartir archivos por enlace (pasa en algunas cuentas de universidad o empresa). Usa una cuenta personal de Gmail para la hoja.');
  }
  var titulo = texto(d.titulo, 80);
  archivo.setDescription([titulo, texto(d.descripcion, 400), 'Subida por ' + quien].filter(String).join(' — '));
  var f = {
    id: id, fileId: archivo.getId(), titulo: titulo, descripcion: texto(d.descripcion, 400), fecha: fecha, autor: quien,
    quedadaId: quedadaId, ancho: numero(d.ancho, 1, 20000), alto: numero(d.alto, 1, 20000), creadoEn: ahora(), actualizadoEn: ahora(), estado: 'activa'
  };
  anadirFila(HOJA_FOTOS, COLS_F, f);
  return fotoDesdeFila(f);
}

function propia(id, quien) {
  var fila = buscar(HOJA_FOTOS, COLS_F, id);
  if (!fila || fila.datos.estado === 'borrada') throw error('no_existe', 'Esa foto ya no existe.');
  if (normalizar(fila.datos.autor) !== normalizar(quien)) throw error('sin_permiso', 'Solo ' + fila.datos.autor + ' puede cambiar o borrar esta foto.');
  return fila;
}

function editarFoto(d, quien) {
  var fila = propia(d.id, quien);
  var cambios = { actualizadoEn: ahora() };
  if (d.titulo !== undefined) cambios.titulo = texto(d.titulo, 80);
  if (d.descripcion !== undefined) cambios.descripcion = texto(d.descripcion, 400);
  if (d.fecha !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha))) throw error('validacion', 'La fecha no es válida.');
    cambios.fecha = String(d.fecha);
  }
  if (d.quedadaId !== undefined) {
    var qid = texto(d.quedadaId, 40);
    if (qid && !buscar(HOJA_QUEDADAS, COLS_Q, qid)) throw error('validacion', 'La quedada elegida ya no existe.');
    cambios.quedadaId = qid;
  }
  var f = mezclar(fila.datos, cambios);
  escribirFila(HOJA_FOTOS, COLS_F, fila.indice, f);
  return fotoDesdeFila(f);
}

function borrarFoto(d, quien) {
  var fila = propia(d.id, quien);
  try { DriveApp.getFileById(String(fila.datos.fileId)).setTrashed(true); } catch (e) { /* ya no estaba en Drive */ }
  var f = mezclar(fila.datos, { estado: 'borrada', actualizadoEn: ahora() });
  escribirFila(HOJA_FOTOS, COLS_F, fila.indice, f);
  return { id: f.id, estado: 'borrada' };
}

function fotoDesdeFila(x) {
  return {
    id: String(x.id), fileId: String(x.fileId), titulo: String(x.titulo || ''), descripcion: String(x.descripcion || ''),
    fecha: fechaTexto(x.fecha).slice(0, 10), autor: String(x.autor || ''), quedadaId: String(x.quedadaId || ''),
    ancho: Number(x.ancho) || 0, alto: Number(x.alto) || 0, creadoEn: fechaTexto(x.creadoEn), estado: String(x.estado || 'activa')
  };
}

/* ------------------------------------------------------------------ hoja de cálculo */

function configurar() {
  asegurarHojas();
  var c = carpeta();
  Logger.log('Listo. Hojas creadas y carpeta de fotos: ' + c.getUrl());
}

function asegurarHojas() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  [[HOJA_QUEDADAS, COLS_Q], [HOJA_FOTOS, COLS_F]].forEach(function (par) {
    var hoja = libro.getSheetByName(par[0]);
    if (!hoja) {
      hoja = libro.insertSheet(par[0]);
      hoja.getRange(1, 1, 1, par[1].length).setValues([par[1]]).setFontWeight('bold');
      hoja.setFrozenRows(1);
      /* texto plano: así Sheets no convierte fechas ni números por su cuenta */
      hoja.getRange(1, 1, hoja.getMaxRows(), par[1].length).setNumberFormat('@');
    }
  });
}

function leer(nombre, cols) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  var n = hoja.getLastRow();
  if (n < 2) return [];
  return hoja.getRange(2, 1, n - 1, cols.length).getValues().filter(function (f) { return f[0] !== ''; }).map(function (f) {
    var o = {};
    cols.forEach(function (c, i) { o[c] = f[i]; });
    return o;
  });
}

function buscar(nombre, cols, id) {
  if (!id) return null;
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  var n = hoja.getLastRow();
  if (n < 2) return null;
  var valores = hoja.getRange(2, 1, n - 1, cols.length).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (String(valores[i][0]) === String(id)) {
      var o = {};
      cols.forEach(function (c, j) { o[c] = valores[i][j]; });
      return { indice: i + 2, datos: o };
    }
  }
  return null;
}

function anadirFila(nombre, cols, obj) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  hoja.appendRow(cols.map(function (c) { return obj[c] === undefined || obj[c] === null ? '' : obj[c]; }));
}

function escribirFila(nombre, cols, indice, obj) {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  hoja.getRange(indice, 1, 1, cols.length).setValues([cols.map(function (c) { return obj[c] === undefined || obj[c] === null ? '' : obj[c]; })]);
}

/* ------------------------------------------------------------------ utilidades */

function error(codigo, mensaje) { var e = new Error(mensaje); e.codigo = codigo; return e; }
function mezclar(a, b) { var o = {}; var k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
function texto(v, max) { return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
function numero(v, min, max) {
  if (v === '' || v === null || v === undefined) return '';
  var n = Number(v);
  return isFinite(n) && n >= min && n <= max ? n : '';
}
function normalizar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
}
function ahora() { return Utilities.formatDate(new Date(), 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm:ss"); }
function fechaTexto(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Europe/Madrid', "yyyy-MM-dd'T'HH:mm");
  return String(v || '');
}
