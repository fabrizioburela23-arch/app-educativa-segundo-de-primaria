// Carga del contenido (índice, temas, datos, fechas) y aplicación de las
// correcciones que el adulto publicó desde el panel.

import { obtener } from '../estado.js';

const cacheTemas = new Map();
let indice = null;
let datos = { feria: [] };
let fechasBase = [];

async function leerJSON(ruta) {
  const r = await fetch(ruta, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
  return r.json();
}

export async function cargarBase() {
  const [ind, dat, fec] = await Promise.all([
    leerJSON('content/indice.json'),
    leerJSON('content/datos.json').catch(() => ({ feria: [] })),
    leerJSON('content/fechas-civicas.json').catch(() => ({ fechas: [] })),
  ]);
  indice = ind;
  datos = dat;
  fechasBase = fec.fechas || [];
  return indice;
}

export const obtenerIndice = () => indice;

export function listaTemas() {
  const r = [];
  if (!indice) return r;
  for (const m of indice.materias) {
    for (const u of m.unidades) {
      for (const t of u.temas) r.push({ ...t, materia: m.id, materiaNombre: m.nombre, color: m.color, unidad: u });
    }
  }
  return r;
}

export function buscarTema(id) {
  return listaTemas().find((t) => t.id === id) || null;
}

export function buscarMateria(id) {
  return indice ? indice.materias.find((m) => m.id === id) || null : null;
}

// Tema tal como lo ve el niño: versión publicada por el adulto o la original.
export async function cargarTema(id, { original = false } = {}) {
  if (!original) {
    const ov = obtener().contenido.temas[id];
    if (ov && ov.publicado) return ov.publicado;
  }
  if (cacheTemas.has(id)) return cacheTemas.get(id);
  const tema = await leerJSON(`content/temas/${id}.json`);
  cacheTemas.set(id, tema);
  return tema;
}

export async function existeTema(id) {
  try { await cargarTema(id, { original: true }); return true; } catch { return false; }
}

// Fechas visibles para el niño (publicadas por el adulto, o las originales).
export function fechasPublicadas() {
  const pub = obtener().contenido.fechas.publicado;
  const lista = Array.isArray(pub) ? pub : fechasBase;
  return lista.filter((f) => f.publicada !== false);
}

export function fechasOriginales() { return fechasBase.map((f) => ({ ...f })); }

export function fechasParaEditar() {
  const c = obtener().contenido.fechas;
  if (Array.isArray(c.borrador)) return c.borrador.map((f) => ({ ...f }));
  if (Array.isArray(c.publicado)) return c.publicado.map((f) => ({ ...f }));
  return fechasOriginales();
}

export function datosGeneradores() {
  return { feria: datos.feria || [], fechas: fechasPublicadas() };
}

export const datosContenido = () => datos;
