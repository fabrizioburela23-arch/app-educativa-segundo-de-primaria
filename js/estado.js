// Estado persistente de la app (solo en este dispositivo, localStorage).
// No se envía nada a ningún servidor.

import { progresoInicial } from './motor/adaptativo.js';

const CLAVE = 'aprendo2:v1';
const VERSION = 1;

function estadoNuevo() {
  return {
    version: VERSION,
    creado: new Date().toISOString(),
    perfil: { apodo: '', avatar: '🦙' },
    ajustes: {
      nivelInicial: { comunicacion: 2, matematica: 2, sociales: 2, naturales: 2 },
      temaAsignado: null, // { id, nota, fecha }
      voz: { uri: null, velocidad: 0.9, leerAuto: false },
      pin: null,
      bienvenidaVista: false,
    },
    temas: {},
    ultimoTema: null,
    registro: [], // resúmenes de sesiones: { fecha, tema, modo, aciertos, total }
    escritos: [], // textos libres: { fecha, tema, enunciado, texto }
    sesionAbierta: null, // práctica a medias (se anota en el registro si la app se cierra)
    contenido: {
      fechas: { borrador: null, publicado: null, fechaPublicado: null },
      temas: {}, // id → { borrador, publicado, fechaPublicado }
    },
  };
}

let estado = null;
let almacenOk = true;
let temporizador = null;
let sucio = false;
const oyentes = new Set();
const externos = new Set();
// Tema con una lección abierta en esta ventana: su progreso se conserva si otra ventana guarda.
let abierto = null;

function leerGuardado() {
  const crudo = localStorage.getItem(CLAVE);
  return crudo ? migrar(JSON.parse(crudo)) : null;
}

export function cargarEstado() {
  try {
    estado = leerGuardado() || estadoNuevo();
    // prueba de escritura: si falla, el adulto y el niño verán un aviso
    localStorage.setItem(`${CLAVE}:prueba`, '1');
    localStorage.removeItem(`${CLAVE}:prueba`);
  } catch (e) {
    almacenOk = false;
    if (!estado) estado = estadoNuevo();
  }
  return estado;
}

function temaValido(v) {
  if (!v || typeof v !== 'object') return null;
  const base = progresoInicial(Number.isInteger(v.nivel) ? v.nivel : 2);
  const r = { ...base, ...v, vistos: { ...base.vistos, ...(v.vistos || {}) } };
  if (!['nuevo', 'en-curso', 'logrado', 'repasar'].includes(r.estado)) r.estado = 'nuevo';
  for (const k of ['errores', 'vistosEj']) if (!r[k] || typeof r[k] !== 'object') r[k] = {};
  for (const k of ['recientes', 'comprobaciones']) if (!Array.isArray(r[k])) r[k] = [];
  return r;
}

function migrar(e) {
  const base = estadoNuevo();
  const r = { ...base, ...e };
  r.perfil = { ...base.perfil, ...(e.perfil || {}) };
  r.ajustes = { ...base.ajustes, ...(e.ajustes || {}) };
  r.ajustes.nivelInicial = { ...base.ajustes.nivelInicial, ...((e.ajustes || {}).nivelInicial || {}) };
  r.ajustes.voz = { ...base.ajustes.voz, ...((e.ajustes || {}).voz || {}) };
  r.contenido = { ...base.contenido, ...(e.contenido || {}) };
  r.contenido.fechas = { ...base.contenido.fechas, ...((e.contenido || {}).fechas || {}) };
  r.contenido.temas = { ...((e.contenido || {}).temas || {}) };
  const temas = e.temas && typeof e.temas === 'object' ? e.temas : {};
  r.temas = {};
  for (const [k, v] of Object.entries(temas)) { const t = temaValido(v); if (t) r.temas[k] = t; }
  r.registro = Array.isArray(e.registro) ? e.registro : [];
  r.escritos = Array.isArray(e.escritos) ? e.escritos : [];
  r.version = VERSION;
  return r;
}

export const obtener = () => estado;
export const almacenamientoDisponible = () => almacenOk;

function escribir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
    almacenOk = true;
    sucio = false;
  } catch (e) {
    almacenOk = false;
  }
  oyentes.forEach((f) => f(estado));
}

export function guardar(inmediato = false) {
  sucio = true;
  clearTimeout(temporizador);
  if (inmediato) escribir();
  else temporizador = setTimeout(escribir, 250);
}

export function alCambiar(f) { oyentes.add(f); return () => oyentes.delete(f); }
export function alCambiarDesdeOtraVentana(f) { externos.add(f); return () => externos.delete(f); }

// Otra ventana de la app (por ejemplo, la app instalada y una pestaña) guardó cambios:
// se adoptan para no pisarlos, conservando el progreso del tema abierto aquí si es más nuevo.
function alGuardarOtraVentana(e) {
  if (e.key !== CLAVE || !e.newValue) return;
  let nuevo;
  try { nuevo = migrar(JSON.parse(e.newValue)); } catch { return; }
  if (abierto && estado.temas[abierto]) {
    const mio = estado.temas[abierto];
    const suyo = nuevo.temas[abierto];
    if (!suyo || (mio.ultimaVez || '') >= (suyo.ultimaVez || '')) nuevo.temas[abierto] = mio;
    nuevo.ultimoTema = estado.ultimoTema;
  }
  estado = nuevo;
  if (sucio && abierto) escribir();
  externos.forEach((f) => f(estado));
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', alGuardarOtraVentana);
  // Guarda antes de que el sistema cierre la pestaña o la app (solo si hay cambios pendientes).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && sucio) { clearTimeout(temporizador); escribir(); } });
  window.addEventListener('pagehide', () => { if (sucio) { clearTimeout(temporizador); escribir(); } });
}

// El tema abierto en una lección: su objeto de progreso se sigue usando aunque otra ventana guarde.
export function marcarAbierto(temaId) { abierto = temaId; }

export function progresoDe(temaId, materiaId) {
  if (!estado.temas[temaId]) {
    const nivel = estado.ajustes.nivelInicial[materiaId] || 2;
    estado.temas[temaId] = progresoInicial(nivel);
  }
  return estado.temas[temaId];
}

export function progresoSiExiste(temaId) {
  return estado.temas[temaId] || null;
}

export function anotarRegistro(entrada) {
  estado.registro.unshift({ fecha: new Date().toISOString(), ...entrada });
  if (estado.registro.length > 300) estado.registro.length = 300;
  guardar();
}

// Práctica en curso: si la app se cierra o se recarga, queda anotada al volver a abrirla.
export function anotarSesionAbierta(entrada) {
  estado.sesionAbierta = entrada ? { fecha: new Date().toISOString(), ...entrada } : null;
  guardar();
}

export function recuperarSesionAbierta() {
  const s = estado.sesionAbierta;
  if (s && s.total) {
    estado.registro.unshift(s);
    if (estado.registro.length > 300) estado.registro.length = 300;
  }
  if (s) { estado.sesionAbierta = null; guardar(true); }
}

export function anotarEscrito(entrada) {
  estado.escritos.unshift({ fecha: new Date().toISOString(), ...entrada });
  if (estado.escritos.length > 40) estado.escritos.length = 40;
  guardar();
}

export function exportar() {
  return JSON.stringify({ app: 'aprendo2', exportado: new Date().toISOString(), estado }, null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  const e = datos && datos.app === 'aprendo2' ? datos.estado : datos;
  if (!e || typeof e !== 'object' || !e.temas || typeof e.temas !== 'object') throw new Error('El archivo no parece una copia de esta app.');
  estado = migrar(e);
  guardar(true);
  return estado;
}

export function borrarProgreso() {
  estado.temas = {};
  estado.registro = [];
  estado.escritos = [];
  estado.ultimoTema = null;
  estado.sesionAbierta = null;
  guardar(true);
}

export function borrarTodo() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  estado = estadoNuevo();
  guardar(true);
}

// Pide al navegador que no borre los datos si hay poco espacio (Android lo concede a apps instaladas).
export async function pedirPersistencia() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const ya = await navigator.storage.persisted();
      return ya || (await navigator.storage.persist());
    }
  } catch { /* sin soporte */ }
  return false;
}
