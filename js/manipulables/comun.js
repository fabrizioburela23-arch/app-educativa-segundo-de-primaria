// Piezas comunes de los manipulables.
import { h } from '../ui/dom.js';

// Estado básico compartido: contenedor, bloqueo y aviso de cambios.
export function crearBase(tipo, { libre = false, alCambiar = () => {} } = {}) {
  const el = h('div', { class: `manip manip-${tipo}${libre ? ' manip-libre' : ''}` });
  return {
    el,
    libre,
    bloqueado: false,
    avisar() {
      try { alCambiar(); } catch (err) { console.error(err); }
    },
  };
}

// Botón grande (+, −, etc.).
export function boton(contenido, { etiqueta, clase = '', onclick } = {}) {
  return h('button', { type: 'button', class: `manip-btn ${clase}`.trim(), 'aria-label': etiqueta, onclick }, contenido);
}

// Línea de lectura (número armado, total, hora...). Se muestra en modo libre
// y cuando se enseña la solución.
export function lectura(clase = '') {
  return h('div', { class: `manip-lectura ${clase}`.trim(), 'aria-live': 'polite' });
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function unirY(lista) {
  const l = lista.map(String);
  if (l.length <= 1) return l.join('');
  return `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}`;
}

export const entero = (x, min, max, def) => {
  const n = Number(x);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
};

// Activa un elemento no-botón con Enter o Espacio.
export function activarConTeclado(el, fn) {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn(e);
    }
  });
}

// Posición x de un evento en las unidades del viewBox de un <svg>.
export function xEnSvg(svg, e, anchoVista) {
  const r = svg.getBoundingClientRect();
  return ((e.clientX - r.left) * anchoVista) / (r.width || 1);
}

export function puntoEnSvg(svg, e, anchoVista, altoVista) {
  const r = svg.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * anchoVista) / (r.width || 1),
    y: ((e.clientY - r.top) * altoVista) / (r.height || 1),
  };
}
