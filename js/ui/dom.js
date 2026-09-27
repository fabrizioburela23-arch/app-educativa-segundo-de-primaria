// Pequeñas utilidades de DOM compartidas por toda la app.
import { aHtml } from '../contenido/texto.js';

// h('button', { class: 'boton', onclick: fn, 'aria-label': 'x' }, 'Texto', otroNodo)
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'style') el.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Texto con **negrita** seguro.
export function rico(texto, tag = 'span', attrs = {}) {
  return h(tag, { ...attrs, html: aHtml(texto) });
}

export function vaciar(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function mezclar(arr) {
  const r = arr.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Mezcla asegurando que no quede en el orden original (si hay más de 1 elemento distinto).
export function mezclarDistinto(arr, igual = (a, b) => a === b) {
  if (arr.length < 2) return arr.slice();
  for (let i = 0; i < 12; i++) {
    const r = mezclar(arr);
    if (r.some((x, k) => !igual(x, arr[k]))) return r;
  }
  return arr.slice(1).concat(arr[0]);
}

let toastTimer = null;
export function aviso(msg, ms = 3200) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
}

// Diálogo modal simple. botones: [{ texto, clase, valor }]
// validar(valor) → texto de error (el diálogo sigue abierto) o nada (se cierra).
export function dialogo({ titulo, contenido, botones = [{ texto: 'Aceptar', valor: true }], validar = null }) {
  return new Promise((resolver) => {
    const errorEl = h('p', { class: 'lista-errores oculto', role: 'alert', style: 'margin:10px 0 0' });
    const cerrar = (v) => {
      if (validar && v) {
        const msg = validar(v);
        if (msg) { errorEl.textContent = msg; errorEl.classList.remove('oculto'); return; }
      }
      fondo.remove(); resolver(v);
    };
    const caja = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo || 'Mensaje' },
      titulo ? h('h2', {}, titulo) : null,
      typeof contenido === 'string' ? rico(contenido, 'p') : contenido,
      errorEl,
      h('div', { class: 'acciones', style: botones.length === 1 ? 'grid-template-columns:1fr' : '' },
        botones.map((b) => h('button', { class: `boton ${b.clase || ''}`, onclick: () => cerrar(b.valor) }, b.texto))));
    const fondo = h('div', { class: 'modal-fondo', onclick: (e) => { if (e.target === fondo) cerrar(undefined); } }, caja);
    document.body.appendChild(fondo);
    const primero = caja.querySelector('button');
    if (primero) primero.focus();
  });
}

// Evita dobles toques: ignora los toques de los primeros ms y los que siguen al primero.
export function clicSeguro(fn, espera = 380) {
  const t0 = performance.now();
  let hecho = false;
  return (e) => {
    if (hecho || performance.now() - t0 < espera) return;
    hecho = true;
    fn(e);
  };
}

export function emojiDe(o) {
  return typeof o === 'object' && o ? o.emoji || '' : '';
}

export function fechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

export function hoyISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d + dias);
  return hoyISO(f);
}

// Arrastre simple con puntero + alternativa de tocar. onSoltar(elementoDestino|null, x, y)
export function hacerArrastrable(el, { alSoltar, alTocar, destinos }) {
  let inicio = null;
  let clon = null;
  let movido = false;
  el.addEventListener('pointerdown', (e) => {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    inicio = { x: e.clientX, y: e.clientY, id: e.pointerId };
    movido = false;
  });
  el.addEventListener('pointermove', (e) => {
    if (!inicio || e.pointerId !== inicio.id) return;
    const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
    if (!movido && Math.hypot(dx, dy) > 10) {
      movido = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
      const r = el.getBoundingClientRect();
      clon = el.cloneNode(true);
      clon.classList.add('arrastrando');
      clon.style.width = `${r.width}px`;
      clon.style.left = `${r.left}px`;
      clon.style.top = `${r.top}px`;
      clon.dataset.ox = String(inicio.x - r.left);
      clon.dataset.oy = String(inicio.y - r.top);
      document.body.appendChild(clon);
      el.style.opacity = '0.3';
    }
    if (movido && clon) {
      clon.style.left = `${e.clientX - Number(clon.dataset.ox)}px`;
      clon.style.top = `${e.clientY - Number(clon.dataset.oy)}px`;
      const d = destinoEn(e.clientX, e.clientY, destinos());
      destinos().forEach((x) => x.classList.toggle('destino', x === d));
    }
  });
  const terminar = (e) => {
    if (!inicio) return;
    const fueMovido = movido;
    inicio = null;
    if (clon) { clon.remove(); clon = null; }
    el.style.opacity = '';
    destinos().forEach((x) => x.classList.remove('destino'));
    if (fueMovido) {
      const d = e.type === 'pointercancel' ? null : destinoEn(e.clientX, e.clientY, destinos());
      alSoltar(d);
    }
  };
  el.addEventListener('pointerup', terminar);
  el.addEventListener('pointercancel', terminar);
  el.addEventListener('lostpointercapture', (e) => { if (movido && clon) terminar({ ...e, type: 'pointercancel', clientX: e.clientX, clientY: e.clientY }); });
  el.addEventListener('click', (e) => {
    if (movido) { e.preventDefault(); movido = false; return; }
    alTocar();
  });
}

function destinoEn(x, y, lista) {
  for (const d of lista) {
    const r = d.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return d;
  }
  return null;
}
