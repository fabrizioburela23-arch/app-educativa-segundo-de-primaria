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
    contenido: {
      fechas: { borrador: null, publicado: null, fechaPublicado: null },
      temas: {}, // id → { borrador, publicado, fechaPublicado }
    },
  };
}

let estado = null;
let almacenOk = true;
let temporizador = null;
const oyentes = new Set();

export function cargarEstado() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    estado = crudo ? migrar(JSON.parse(crudo)) : estadoNuevo();
  } catch (e) {
    almacenOk = false;
    estado = estadoNuevo();
  }
  return estado;
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
  r.temas = e.temas || {};
  r.registro = Array.isArray(e.registro) ? e.registro : [];
  r.escritos = Array.isArray(e.escritos) ? e.escritos : [];
  r.version = VERSION;
  return r;
}

export const obtener = () => estado;
export const almacenamientoDisponible = () => almacenOk;

export function guardar(inmediato = false) {
  clearTimeout(temporizador);
  const escribir = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
      almacenOk = true;
    } catch (e) {
      almacenOk = false;
    }
    oyentes.forEach((f) => f(estado));
  };
  if (inmediato) escribir();
  else temporizador = setTimeout(escribir, 250);
}

export function alCambiar(f) { oyentes.add(f); return () => oyentes.delete(f); }

// Guarda antes de que el sistema cierre la pestaña o la app.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardar(true); });
  window.addEventListener('pagehide', () => guardar(true));
}

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
  if (!e || typeof e !== 'object' || !e.temas) throw new Error('El archivo no parece una copia de esta app.');
  estado = migrar(e);
  guardar(true);
  return estado;
}

export function borrarProgreso() {
  estado.temas = {};
  estado.registro = [];
  estado.escritos = [];
  estado.ultimoTema = null;
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
