// Visuales: dibujos que acompañan explicaciones y ejercicios.
// Todo se dibuja aquí (SVG o HTML), sin imágenes ni recursos externos.
//
//   renderVisual(v, ctx)   → <div class="visual visual-<tipo>">
//   textoAlternativo(v)    → descripción corta en español (no revela respuestas)
//
// También exporta piezas de dibujo que reutilizan los manipulables
// (bloques, recta, fracción, dinero, reloj, calendario, cuadrícula).

import { h } from '../ui/dom.js';
import { DINERO, MESES, diasDelMes } from '../contenido/catalogo.js';

// La biblioteca de ilustraciones es opcional: si falta, el resto sigue funcionando.
let ilustracionFn = null;
try {
  const mod = await import('./ilustraciones.js');
  if (typeof mod.ilustracion === 'function') ilustracionFn = mod.ilustracion;
} catch (err) {
  console.warn('Ilustraciones no disponibles:', err && err.message);
}

// ---------------------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
const r2 = (x) => Math.round(x * 100) / 100;
const entero = (x, min, max, def = min) => {
  const n = Number.isFinite(Number(x)) ? Math.round(Number(x)) : def;
  return Math.max(min, Math.min(max, n));
};
const RE_EMOJI = /\p{Extended_Pictographic}/u;
// «☐» (casilla vacía) y «?» no cuentan como dibujos.
export const esEmoji = (t) => RE_EMOJI.test(String(t ?? '').replace(/[☐?]/g, ''));
const mayus = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// Crea un elemento SVG. s('rect', { x: 1, class: 'a' }, hijos...)
export function s(tag, attrs = {}, ...hijos) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, typeof v === 'number' ? String(r2(v)) : String(v));
  }
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// <svg> escalable: ocupa el ancho disponible hasta `max` píxeles.
export function lienzo(ancho, alto, { clase = '', max = ancho, decorativo = true } = {}) {
  return s('svg', {
    viewBox: `0 0 ${r2(ancho)} ${r2(alto)}`,
    class: `vis-svg ${clase}`.trim(),
    style: `max-width:${Math.round(max)}px`,
    'aria-hidden': decorativo ? 'true' : null,
    focusable: 'false',
  });
}

function texto(x, y, contenido, attrs = {}) {
  return s('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...attrs }, String(contenido));
}

function cajaPregunta(clase = '') {
  return h('span', { class: `caja-pregunta ${clase}`.trim() }, '?');
}

// ---------------------------------------------------------------------------
// renderVisual
// ---------------------------------------------------------------------------

const SIN_ROL_IMG = new Set(['tabla', 'fechas']);

export function renderVisual(v, ctx = {}) {
  const tipo = v && typeof v === 'object' ? v.tipo : undefined;
  const cont = h('div', { class: `visual visual-${tipo || 'desconocido'}` });
  const fn = RENDER[tipo];
  if (!fn) {
    cont.append(h('p', { class: 'visual-aviso' }, 'Este dibujo no se puede mostrar.'));
    return cont;
  }
  try {
    fn(v, cont, ctx || {});
  } catch (err) {
    console.error('Error al dibujar el visual', v, err);
    while (cont.firstChild) cont.removeChild(cont.firstChild);
    cont.append(h('p', { class: 'visual-aviso' }, 'Este dibujo no se puede mostrar.'));
  }
  if (!SIN_ROL_IMG.has(tipo)) {
    cont.setAttribute('role', 'img');
    cont.setAttribute('aria-label', textoAlternativo(v));
  }
  return cont;
}

// Lista segura: si el campo no es una lista, se usa una lista vacía.
const lista = (x) => (Array.isArray(x) ? x : []);
// Texto de un elemento que puede ser texto, número u objeto { texto, emoji }.
const textoDe = (x) => {
  if (x === null || x === undefined) return '';
  if (typeof x === 'object') return String(x.emoji || x.texto || '');
  return String(x);
};

// ---------------------------------------------------------------------------
// emoji / emojis
// ---------------------------------------------------------------------------

// Un emoji repetido, agrupado de 5 en 5 (dos grupos por fila = de 10 en 10).
function vEmoji(v, c) {
  const n = v.cantidad === undefined ? 1 : entero(v.cantidad, 0, 30, 1);
  const valor = v.valor || '⭐';
  if (n > 0) {
    const tam = n === 1 ? 'uno' : n <= 5 ? 'pocos' : n <= 15 ? 'pila' : 'muchos';
    const zona = h('div', { class: `emo-grupos emo-${tam}` });
    for (let i = 0; i < n; i += 5) {
      const g = h('div', { class: 'emo-grupo' });
      for (let k = i; k < Math.min(n, i + 5); k++) g.append(h('span', { class: 'emo' }, valor));
      zona.append(g);
    }
    c.append(zona);
  }
  if (v.etiqueta) c.append(h('div', { class: 'visual-etiqueta' }, v.etiqueta));
}

function vEmojis(v, c) {
  const items = lista(v.items).slice(0, 12).map(textoDe);
  const et = lista(v.etiquetas).map(textoDe);
  const tam = items.length <= 4 ? 'g' : items.length <= 8 ? 'm' : 'p';
  c.append(h('div', { class: `emojis-fila emojis-${tam}` },
    items.map((it, i) => h('div', { class: 'emojis-item' },
      h('span', { class: esEmoji(it) ? 'emo' : 'emojis-texto' }, it),
      et[i] !== undefined && et[i] !== '' ? h('span', { class: 'emojis-etq' }, et[i]) : null))));
}

// ---------------------------------------------------------------------------
// ilustración (biblioteca externa a este archivo)
// ---------------------------------------------------------------------------

function vIlustracion(v, c) {
  if (!ilustracionFn) {
    c.append(h('div', { class: 'ilus-falta' }, '🖼️'));
    return;
  }
  const svg = ilustracionFn(v.id, { resaltar: v.resaltar, etiquetas: v.etiquetas });
  if (!svg) {
    c.append(h('div', { class: 'ilus-falta' }, '🖼️'));
    return;
  }
  c.append(h('div', { class: 'ilus-caja', html: svg }));
}

// ---------------------------------------------------------------------------
// bloques base 10
// ---------------------------------------------------------------------------

function placa(x, y, S) {
  const c = S / 10;
  let d = '';
  for (let i = 1; i < 10; i++) d += `M${r2(x + i * c)} ${r2(y)}V${r2(y + S)}M${r2(x)} ${r2(y + i * c)}H${r2(x + S)}`;
  const borde = Math.max(1.3, Math.min(2.4, c * 0.24));
  return s('g', { class: 'bq bq-c' },
    s('rect', { x, y, width: S, height: S, rx: Math.max(1.2, S * 0.03), class: 'bq-relleno' }),
    s('path', { d, class: 'bq-lineas', 'stroke-width': Math.max(0.45, c * 0.09) }),
    s('rect', { x, y, width: S, height: S, rx: Math.max(1.2, S * 0.03), class: 'bq-borde', 'stroke-width': borde }));
}

function barra(x, y, c) {
  const H = 10 * c;
  let d = '';
  for (let i = 1; i < 10; i++) d += `M${r2(x)} ${r2(y + i * c)}H${r2(x + c)}`;
  const borde = Math.max(1.3, Math.min(2.2, c * 0.22));
  return s('g', { class: 'bq bq-d' },
    s('rect', { x, y, width: c, height: H, rx: Math.max(1, c * 0.15), class: 'bq-relleno' }),
    s('path', { d, class: 'bq-lineas', 'stroke-width': Math.max(0.5, c * 0.11) }),
    s('rect', { x, y, width: c, height: H, rx: Math.max(1, c * 0.15), class: 'bq-borde', 'stroke-width': borde }));
}

function cubo(x, y, c) {
  return s('rect', { x, y, width: c, height: c, rx: Math.max(1, c * 0.18), class: 'bq bq-u bq-uno', 'stroke-width': Math.max(1.3, Math.min(2, c * 0.18)) });
}

function medidasCentenas(n, c, maxW) {
  const S = 10 * c;
  const gap = Math.max(4, Math.round(c * 0.8));
  const cols = Math.max(1, Math.min(n, Math.floor((maxW + gap) / (S + gap))));
  const filas = Math.ceil(n / cols);
  return {
    w: cols * S + (cols - 1) * gap,
    h: filas * S + (filas - 1) * gap,
    dibujar(g, x0, y0) {
      for (let i = 0; i < n; i++) {
        const f = Math.floor(i / cols), k = i % cols;
        g.append(placa(x0 + k * (S + gap), y0 + f * (S + gap), S));
      }
    },
  };
}

function medidasDecenas(n, c, maxW) {
  const gap = c * 0.55, extra = c * 0.7, H = 10 * c, gapF = c * 1.2;
  const ancho = (k) => k * c + (k - 1) * gap + Math.floor((k - 1) / 5) * extra;
  let porFila = n;
  while (porFila > 1 && ancho(porFila) > maxW) porFila--;
  if (porFila < n) {
    if (porFila >= 5) porFila -= porFila % 5;
    const filas = Math.ceil(n / porFila);
    let equilibrado = Math.ceil(n / filas);
    if (porFila >= 5) equilibrado = Math.ceil(equilibrado / 5) * 5;
    porFila = Math.min(porFila, equilibrado);
  }
  const filas = Math.ceil(n / porFila);
  return {
    w: ancho(Math.min(n, porFila)),
    h: filas * H + (filas - 1) * gapF,
    dibujar(g, x0, y0) {
      for (let i = 0; i < n; i++) {
        const f = Math.floor(i / porFila), k = i % porFila;
        g.append(barra(x0 + k * (c + gap) + Math.floor(k / 5) * extra, y0 + f * (H + gapF), c));
      }
    },
  };
}

// Unidades en columnas de 5 (de abajo hacia arriba).
function medidasUnidades(n, c) {
  const gap = c * 0.35, gapC = c * 0.6;
  const cols = Math.ceil(n / 5), alto5 = Math.min(n, 5);
  const w = cols * c + (cols - 1) * gapC;
  const hh = alto5 * c + (alto5 - 1) * gap;
  return {
    w, h: hh,
    dibujar(g, x0, y0) {
      for (let i = 0; i < n; i++) {
        const col = Math.floor(i / 5), fil = i % 5;
        g.append(cubo(x0 + col * (c + gapC), y0 + hh - (fil + 1) * c - fil * gap, c));
      }
    },
  };
}

// Dibujo completo: centenas, decenas y unidades que fluyen en líneas.
export function dibujarBloques(cfg = {}, { ancho = 320 } = {}) {
  const C = entero(cfg.centenas ?? 0, 0, 20, 0);
  const D = entero(cfg.decenas ?? 0, 0, 20, 0);
  const U = entero(cfg.unidades ?? 0, 0, 20, 0);
  // Un mismo tamaño de cubito para todo: la barra mide lo mismo que el lado de
  // la placa y el cubito suelto es igual a un cuadrito de la barra.
  const c = C <= 3 ? 10 : C <= 6 ? 8 : C <= 12 ? 7 : 5;
  const partes = [];
  if (C) partes.push(medidasCentenas(C, c, ancho));
  if (D) partes.push(medidasDecenas(D, c, ancho));
  if (U) partes.push(medidasUnidades(U, c));
  const PAD = 4, SEP = 20, VSEP = 18;
  if (!partes.length) {
    const svg = lienzo(ancho + 2 * PAD, 70, { clase: 'bq-svg', max: ancho + 2 * PAD });
    svg.append(s('rect', { x: PAD + ancho / 2 - 70, y: 8, width: 140, height: 54, rx: 12, class: 'bq-vacio' }));
    return svg;
  }
  const lineas = [];
  let cur = null;
  for (const p of partes) {
    if (!cur || cur.w + SEP + p.w > ancho) {
      cur = { items: [], w: -SEP, h: 0 };
      lineas.push(cur);
    }
    cur.items.push(p);
    cur.w += SEP + p.w;
    cur.h = Math.max(cur.h, p.h);
  }
  const alto = lineas.reduce((a, l) => a + l.h, 0) + VSEP * (lineas.length - 1) + 2 * PAD;
  // El lienzo mide lo que ocupa el dibujo (así se puede achicar sin márgenes vacíos).
  const W = Math.max(...lineas.map((l) => l.w));
  const svg = lienzo(W + 2 * PAD, alto, { clase: 'bq-svg', max: W + 2 * PAD });
  let y = PAD;
  for (const l of lineas) {
    let x = PAD + (W - l.w) / 2;
    for (const p of l.items) {
      p.dibujar(svg, x, y + l.h - p.h);
      x += p.w + SEP;
    }
    y += l.h + VSEP;
  }
  return svg;
}

// Dibujo de una sola columna (para el manipulable de bloques).
export function dibujarBloquesColumna(tipo, n, ancho = 100) {
  n = entero(n, 0, 20, 0);
  const PAD = 3;
  let m = null;
  if (n > 0) {
    if (tipo === 'centenas') m = medidasCentenas(n, n <= 4 ? 4.2 : 2.8, ancho);
    else if (tipo === 'decenas') m = medidasDecenas(n, 6, ancho);
    else m = medidasUnidades(n, 13);
  }
  const alto = m ? m.h + 2 * PAD : 10;
  const svg = lienzo(ancho + 2 * PAD, alto, { clase: 'bq-svg bq-columna', max: ancho + 2 * PAD });
  if (m) m.dibujar(svg, PAD + (ancho - m.w) / 2, PAD);
  return svg;
}

function vBloques(v, c) {
  c.append(dibujarBloques(v));
}

// ---------------------------------------------------------------------------
// recta numérica
// ---------------------------------------------------------------------------

export function crearRecta(cfg = {}, { interactiva = false, etiquetas = 'todas' } = {}) {
  let min = Number(cfg.min), max = Number(cfg.max);
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max) || max <= min) max = min + 10;
  const paso = Number(cfg.paso) > 0 ? Number(cfg.paso) : 1;
  const n = Math.max(1, Math.min(40, Math.round((max - min) / paso)));
  // Redondeo para que 0.1 + 0.2 no se muestre como 0.30000000000000004.
  const valores = Array.from({ length: n + 1 }, (_, i) => Math.round((min + i * paso) * 1e6) / 1e6);
  const W = 340, M = 22, largo = W - 2 * M, esp = largo / n;
  const xDe = (val) => M + ((val - min) / (paso * n)) * largo;
  const ocultar = new Set(lista(cfg.ocultar).map(Number));
  const marcar = new Set(lista(cfg.marcar).map(Number));
  const saltos = lista(cfg.saltos).filter((sl) => Array.isArray(sl) && sl.length === 2 && Number(sl[0]) !== Number(sl[1]));

  // ¿Caben todas las etiquetas? Si no, se alternan en dos filas.
  const fs = 18;
  const dig = Math.max(...valores.map((val) => String(val).length));
  const anchoEt = dig * fs * 0.58 + 8;
  let alterno = false, cada = 1;
  if (esp < anchoEt) {
    if (2 * esp >= anchoEt) alterno = true;
    else cada = [2, 5, 10].find((k) => k * esp >= anchoEt) || 10;
  }

  let alturaArco = 0;
  const arcos = saltos.map(([a, b]) => {
    const xa = xDe(Number(a)), xb = xDe(Number(b));
    const ha = Math.max(16, Math.min(60, Math.abs(xb - xa) * 0.42));
    alturaArco = Math.max(alturaArco, ha);
    return { xa, xb, ha };
  });
  const y0 = Math.max(interactiva ? 58 : 24, arcos.length ? alturaArco + 26 : 0);
  const fila1 = y0 + 31, fila2 = y0 + 55;
  const H = (alterno ? fila2 : fila1) + 17;
  const svg = lienzo(W, H, { clase: `rn${interactiva ? ' rn-interactiva' : ''}`, max: 380, decorativo: !interactiva });
  if (interactiva) svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'rn-fondo' }));

  // línea con flechas
  svg.append(s('path', { d: `M12 ${y0}H${W - 12}`, class: 'rn-linea' }));
  svg.append(s('path', { d: `M3 ${y0}L15 ${y0 - 7}L15 ${y0 + 7}Z`, class: 'rn-flecha' }));
  svg.append(s('path', { d: `M${W - 3} ${y0}L${W - 15} ${y0 - 7}L${W - 15} ${y0 + 7}Z`, class: 'rn-flecha' }));

  const etiquetasEl = new Map();
  valores.forEach((val, i) => {
    const x = xDe(val);
    svg.append(s('line', { x1: x, y1: y0 - 10, x2: x, y2: y0 + 10, class: 'rn-marca' }));
    const fy = alterno && i % 2 ? fila2 : fila1;
    const oculta = ocultar.has(val);
    const soloExtremos = etiquetas === 'extremos' && i !== 0 && i !== n;
    if (oculta && !interactiva) {
      const w = Math.max(28, anchoEt - 2);
      svg.append(s('g', { class: 'rn-oculta' },
        s('rect', { x: x - w / 2, y: fy - 14, width: w, height: 28, rx: 8 }),
        texto(x, fy + 1, '?')));
      return;
    }
    if (oculta || soloExtremos) return;
    const visible = cada === 1 || i % cada === 0 || i === n || marcar.has(val);
    if (!visible) return;
    const t = texto(x, fy, val, { class: `rn-et${marcar.has(val) ? ' marcada' : ''}` });
    etiquetasEl.set(val, t);
    svg.append(t);
  });

  // saltos (arcos con punta de flecha)
  const yA = y0 - 13;
  for (const { xa, xb, ha } of arcos) {
    const xm = (xa + xb) / 2, yc = yA - 2 * ha;
    svg.append(s('path', { d: `M${r2(xa)} ${yA}Q${r2(xm)} ${r2(yc)} ${r2(xb)} ${yA}`, class: 'rn-salto' }));
    const tx = xb - xm, ty = yA - yc, L = Math.hypot(tx, ty) || 1;
    const ux = tx / L, uy = ty / L, px = -uy, py = ux;
    const bx = xb - ux * 12, by = yA - uy * 12;
    svg.append(s('path', {
      d: `M${r2(xb)} ${r2(yA + 1)}L${r2(bx + px * 6.5)} ${r2(by + py * 6.5)}L${r2(bx - px * 6.5)} ${r2(by - py * 6.5)}Z`,
      class: 'rn-salto-punta',
    }));
  }

  // puntos marcados
  for (const val of marcar) {
    if (val < min || val > max) continue;
    svg.append(s('circle', { cx: xDe(val), cy: y0, r: 8.5, class: 'rn-punto' }));
  }

  const valorEnX = (x) => {
    const i = Math.max(0, Math.min(n, Math.round((x - M) / esp)));
    return valores[i];
  };
  return { svg, W, H, y0, xDe, valorEnX, valores, etiquetasEl, min, max, paso };
}

function vRecta(v, c) {
  c.append(crearRecta(v).svg);
}

// ---------------------------------------------------------------------------
// fracciones
// ---------------------------------------------------------------------------

const PESOS_DESIGUALES = [1.9, 1, 1.45, 0.7, 1.2, 0.85, 1.6, 0.75, 1.3, 0.9, 1.1, 0.8];
const GRILLA = { 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [2, 2], 5: [1, 5], 6: [2, 3], 7: [1, 7], 8: [2, 4], 9: [3, 3], 10: [2, 5], 11: [1, 11], 12: [3, 4] };

export function crearFraccion(cfg = {}, { interactiva = false } = {}) {
  const n = entero(cfg.partes, 1, 12, 2);
  const forma = ['circulo', 'rectangulo', 'barra'].includes(cfg.forma) ? cfg.forma : 'circulo';
  const desiguales = cfg.iguales === false && n > 1;
  const pesos = desiguales ? PESOS_DESIGUALES.slice(0, n) : Array(n).fill(1);
  const total = pesos.reduce((a, b) => a + b, 0);
  const partes = [];
  let svg;
  const attrsParte = (i) => ({
    class: 'fr-parte',
    ...(interactiva ? { tabindex: 0, role: 'button', 'aria-label': `Parte ${i + 1}`, 'aria-pressed': 'false' } : {}),
  });

  if (forma === 'circulo') {
    svg = lienzo(224, 224, { clase: 'fr', max: 240, decorativo: !interactiva });
    const cx = 112, cy = 112, R = 102;
    if (n === 1) {
      partes.push(s('circle', { cx, cy, r: R, ...attrsParte(0) }));
    } else {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + (acc / total) * 2 * Math.PI;
        acc += pesos[i];
        const a1 = -Math.PI / 2 + (acc / total) * 2 * Math.PI;
        const grande = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M${cx} ${cy}L${r2(cx + R * Math.cos(a0))} ${r2(cy + R * Math.sin(a0))}`
          + `A${R} ${R} 0 ${grande} 1 ${r2(cx + R * Math.cos(a1))} ${r2(cy + R * Math.sin(a1))}Z`;
        partes.push(s('path', { d, ...attrsParte(i) }));
      }
    }
    svg.append(...partes, s('circle', { cx, cy, r: R, class: 'fr-contorno' }));
  } else {
    const barraH = forma === 'barra';
    const W = barraH ? 300 : 260, H = barraH ? 58 : 170, x0 = 6, y0 = 6;
    svg = lienzo(W + 12, H + 12, { clase: 'fr', max: barraH ? 330 : 290, decorativo: !interactiva });
    if (!barraH && !desiguales) {
      const [filas, cols] = GRILLA[n];
      const cw = W / cols, ch = H / filas;
      for (let f = 0; f < filas; f++) {
        for (let k = 0; k < cols; k++) partes.push(s('rect', { x: x0 + k * cw, y: y0 + f * ch, width: cw, height: ch, ...attrsParte(f * cols + k) }));
      }
    } else {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const xa = x0 + (acc / total) * W;
        acc += pesos[i];
        const xb = x0 + (acc / total) * W;
        partes.push(s('rect', { x: xa, y: y0, width: xb - xa, height: H, ...attrsParte(i) }));
      }
    }
    svg.append(...partes, s('rect', { x: x0, y: y0, width: W, height: H, rx: 3, class: 'fr-contorno' }));
  }
  const pintar = (i, si) => {
    const el = partes[i];
    if (!el) return;
    el.classList.toggle('pintada', !!si);
    if (interactiva) el.setAttribute('aria-pressed', si ? 'true' : 'false');
  };
  const col = entero(cfg.coloreadas ?? 0, 0, n, 0);
  for (let i = 0; i < n; i++) pintar(i, i < col);
  return { svg, partes, pintar, forma, n };
}

function vFraccion(v, c) {
  c.append(crearFraccion(v).svg);
}

// ---------------------------------------------------------------------------
// dinero boliviano (dibujos simplificados, no son réplicas)
// ---------------------------------------------------------------------------

const RADIO_MONEDA = { c10: 27, c20: 29, c50: 31, m1: 32, m2: 34, m5: 36 };
const BILLETE = {
  b10: 'azul', b20: 'naranja', b50: 'violeta', b100: 'rojo', b200: 'cafe',
};

export function dineroSVG(codigo, { escala = 1 } = {}) {
  const d = DINERO[codigo];
  if (!d) return null;
  if (d.clase === 'moneda') {
    const R = RADIO_MONEDA[codigo] || 30;
    const L = 2 * R + 4, c = L / 2;
    const svg = s('svg', {
      viewBox: `0 0 ${L} ${L}`, width: r2(L * escala), height: r2(L * escala),
      class: `din din-moneda din-${codigo}`, 'aria-hidden': 'true', focusable: 'false',
    });
    const centavos = d.valor < 100;
    const num = centavos ? String(d.valor) : String(d.valor / 100);
    svg.append(s('circle', { cx: c, cy: c, r: R, class: 'din-plata' }));
    if (codigo === 'm5') {
      svg.append(s('circle', { cx: c, cy: c, r: R * 0.68, class: 'din-oro' }));
    } else {
      svg.append(s('circle', { cx: c, cy: c, r: R - 5, class: 'din-anillo' }));
    }
    svg.append(texto(c, c - R * 0.17, num, { class: 'din-num', 'font-size': centavos ? 19 : 24 }));
    svg.append(texto(c, c + R * 0.42, centavos ? 'ctv' : 'Bs', { class: 'din-unidad', 'font-size': 15 }));
    return svg;
  }
  const W = 132, H = 66;
  const valor = String(d.valor / 100);
  const svg = s('svg', {
    viewBox: `0 0 ${W} ${H}`, width: r2(W * escala), height: r2(H * escala),
    class: `din din-billete din-${BILLETE[codigo] || 'azul'}`, 'aria-hidden': 'true', focusable: 'false',
  });
  svg.append(
    s('rect', { x: 1.5, y: 1.5, width: W - 3, height: H - 3, rx: 8, class: 'din-papel' }),
    s('rect', { x: 7, y: 7, width: W - 14, height: H - 14, rx: 5, class: 'din-marco' }),
    s('circle', { cx: 31, cy: H / 2, r: 16, class: 'din-sello' }),
    s('path', { d: `M31 ${H / 2 - 9}l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z`, class: 'din-estrella' }),
    s('text', { x: valor.length > 2 ? 86 : 88, y: H / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'din-valor' },
      s('tspan', { 'font-size': valor.length > 2 ? 25 : 30, 'font-weight': 700 }, valor),
      s('tspan', { 'font-size': valor.length > 2 ? 16 : 18, dx: 2 }, 'Bs')),
  );
  return svg;
}

function vDinero(v, c) {
  const items = (Array.isArray(v.items) ? v.items : []).filter((k) => DINERO[k]);
  const billetes = items.filter((k) => DINERO[k].clase === 'billete');
  const monedas = items.filter((k) => DINERO[k].clase === 'moneda');
  if (billetes.length) c.append(h('div', { class: 'din-fila' }, billetes.map((k) => dineroSVG(k))));
  if (monedas.length) c.append(h('div', { class: 'din-fila' }, monedas.map((k) => dineroSVG(k))));
}

// ---------------------------------------------------------------------------
// reloj de agujas (sin hora digital)
// ---------------------------------------------------------------------------

export function crearReloj({ hora = 12, minutos = 0 } = {}, { interactiva = false } = {}) {
  const C = 120;
  const svg = lienzo(240, 240, { clase: `rj${interactiva ? ' rj-interactivo' : ''}`, max: 250, decorativo: !interactiva });
  svg.append(s('circle', { cx: C, cy: C, r: 116, class: 'rj-borde' }));
  svg.append(s('circle', { cx: C, cy: C, r: 107, class: 'rj-cara' }));
  let marcas = '', grandes = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const r1 = 103, r0 = i % 5 === 0 ? 91 : 97;
    const seg = `M${r2(C + r0 * Math.sin(a))} ${r2(C - r0 * Math.cos(a))}L${r2(C + r1 * Math.sin(a))} ${r2(C - r1 * Math.cos(a))}`;
    if (i % 5 === 0) grandes += seg; else marcas += seg;
  }
  svg.append(s('path', { d: marcas, class: 'rj-min' }), s('path', { d: grandes, class: 'rj-hr' }));
  // Los números van encima de las agujas (con un borde del color de la cara)
  // para que siempre se puedan leer, aunque la aguja larga pase por debajo.
  const numeros = s('g', { class: 'rj-numeros' });
  for (let k = 1; k <= 12; k++) {
    const a = (k * Math.PI) / 6;
    numeros.append(texto(C + 75 * Math.sin(a), C - 75 * Math.cos(a) + 1, k, { class: 'rj-num' }));
  }
  const gHora = s('g', { class: 'rj-aguja-hora' },
    s('line', { x1: C, y1: C + 12, x2: C, y2: C - 54 }));
  const gMin = s('g', { class: 'rj-aguja-min' },
    // zona táctil ancha e invisible a lo largo de la aguja larga
    interactiva ? s('line', { x1: C, y1: C - 10, x2: C, y2: C - 104, class: 'rj-toque' }) : null,
    s('line', { x1: C, y1: C + 16, x2: C, y2: C - 88 }),
    interactiva ? s('circle', { cx: C, cy: C - 97, r: 6.5, class: 'rj-asa' }) : null);
  svg.append(gHora, gMin, numeros,
    s('circle', { cx: C, cy: C, r: 8.5, class: 'rj-centro' }),
    s('circle', { cx: C, cy: C, r: 3, class: 'rj-centro-2' }));
  const fijar = (hh, mm) => {
    const hr = ((Number(hh) % 12) + Number(mm) / 60) * 30;
    gHora.setAttribute('transform', `rotate(${r2(hr)} ${C} ${C})`);
    gMin.setAttribute('transform', `rotate(${r2(Number(mm) * 6)} ${C} ${C})`);
  };
  fijar(entero(hora, 1, 12, 12), entero(minutos, 0, 59, 0));
  return { svg, fijar, gMin, gHora, C };
}

function vReloj(v, c) {
  c.append(crearReloj(v).svg);
}

// ---------------------------------------------------------------------------
// grupos (platos) y arreglos
// ---------------------------------------------------------------------------

export function columnasPlato(n) {
  return n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
}

export function plato(n, emoji, clase = '') {
  const cols = columnasPlato(n);
  const filas = Math.max(1, Math.ceil(n / cols));
  const d = Math.max(Math.max(cols, filas) * 1.2 + 1.7, 3.6); // diámetro en em
  const el = h('div', { class: `plato ${n > 6 ? 'plato-lleno' : ''} ${clase}`.trim(), style: `--cols:${cols};--d:${d.toFixed(2)}em` });
  for (let i = 0; i < n; i++) el.append(h('span', { class: 'emo' }, emoji));
  return el;
}

function vGrupos(v, c) {
  const g = entero(v.grupos, 1, 10, 1);
  const p = entero(v.porGrupo, 0, 10, 0);
  const e = v.emoji || '🍎';
  c.append(h('div', { class: 'platos' }, Array.from({ length: g }, () => plato(p, e))));
}

function vArreglo(v, c) {
  const f = entero(v.filas, 1, 10, 1), k = entero(v.columnas, 1, 10, 1);
  const tam = k <= 5 ? 'g' : k <= 7 ? 'm' : 'p';
  const grid = h('div', { class: `arreglo arreglo-${tam}`, style: `--cols:${k}` });
  for (let i = 0; i < f * k; i++) grid.append(h('span', { class: 'emo' }, v.emoji || '🟡'));
  c.append(grid);
}

// ---------------------------------------------------------------------------
// pictograma
// ---------------------------------------------------------------------------

export function iconoPicto(icono, medio = false) {
  return h('span', { class: `pic-ico${medio ? ' medio' : ''}` }, h('span', {}, icono));
}

export function clavePicto(icono, escala) {
  return h('div', { class: 'pic-clave' }, 'Cada ', h('span', { class: 'pic-clave-ico' }, icono), ` vale ${escala}`);
}

function vPictograma(v, c) {
  const escala = Number(v.escala) > 0 ? Number(v.escala) : 1;
  const icono = v.icono || '⭐';
  const datos = lista(v.datos).filter((d) => d && typeof d === 'object');
  const cuentas = datos.map((d) => {
    const val = Math.max(0, Number(d.valor) || 0);
    return { llenos: Math.floor(val / escala), medio: val % escala > 0 };
  });
  const maxIconos = Math.max(0, ...cuentas.map((x) => x.llenos + (x.medio ? 1 : 0)));
  // Misma columna de etiquetas en todas las filas, para que los íconos queden alineados.
  const largo = Math.max(1, ...datos.map((d) => String(d.etiqueta || '').length));
  const conEmoji = datos.some((d) => d.emoji);
  const anchoEtq = `min(46%, ${(largo * 0.6 + (conEmoji ? 2.3 : 0.4)).toFixed(1)}em)`;
  const caja = h('div', { class: `pic${maxIconos > 7 ? ' pic-apilado' : ''}`, style: `--pic-etq:${anchoEtq}` });
  if (v.titulo) caja.append(h('div', { class: 'pic-titulo' }, v.titulo));
  caja.append(h('div', { class: 'pic-filas' }, datos.map((d, i) => h('div', { class: 'pic-fila' },
    h('div', { class: 'pic-etq' }, d.emoji ? h('span', { class: 'pic-etq-emo' }, d.emoji) : null, h('span', {}, d.etiqueta || '')),
    h('div', { class: 'pic-iconos' },
      Array.from({ length: cuentas[i].llenos }, () => iconoPicto(icono)),
      cuentas[i].medio ? iconoPicto(icono, true) : null)))));
  caja.append(clavePicto(icono, escala));
  c.append(caja);
}

// ---------------------------------------------------------------------------
// tabla
// ---------------------------------------------------------------------------

const esHueco = (x) => x === '?' || x === '☐' || x === null;

function celda(tag, x) {
  return h(tag, {}, esHueco(x) ? cajaPregunta() : textoDe(x));
}

function vTabla(v, c) {
  const cols = Array.isArray(v.columnas) ? v.columnas : [];
  const filas = Array.isArray(v.filas) ? v.filas : [];
  const nCols = Math.max(cols.length, ...filas.map((f) => (Array.isArray(f) ? f.length : 1)));
  const tabla = h('table', { class: `tabla-visual${nCols >= 4 ? ' tabla-ancha' : ''}`, 'aria-label': textoAlternativo(v) },
    cols.length ? h('thead', {}, h('tr', {}, cols.map((x) => celda('th', x)))) : null,
    h('tbody', {}, filas.map((f) => h('tr', {}, (Array.isArray(f) ? f : [f]).map((x) => celda('td', x))))));
  c.append(h('div', { class: 'tabla-caja' }, tabla));
}

// ---------------------------------------------------------------------------
// calendario
// ---------------------------------------------------------------------------

export const DIAS_CORTOS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

// Hoja de calendario (lunes primero). Con alTocar, los días son botones.
export function crearCalendario({ mes, anio, marcar = [], titulo, alTocar } = {}) {
  const m = entero(mes, 1, 12, 1);
  const a = anioSeguro(anio);
  const dias = diasDelMes(m, a);
  const desfase = (new Date(a, m - 1, 1).getDay() + 6) % 7;
  const marcados = new Set(lista(marcar).map(Number));
  const botones = new Map();
  const grid = h('div', { class: 'cal-grid' },
    DIAS_CORTOS.map((d, i) => h('div', { class: `cal-sem${i >= 5 ? ' finde' : ''}` }, d)));
  for (let i = 0; i < desfase; i++) grid.append(h('div', { class: 'cal-vacio' }));
  for (let d = 1; d <= dias; d++) {
    const col = (desfase + d - 1) % 7;
    const clase = `cal-dia${col >= 5 ? ' finde' : ''}${marcados.has(d) ? ' marcado' : ''}`;
    if (alTocar) {
      const b = h('button', { type: 'button', class: clase, 'aria-pressed': 'false', onclick: () => alTocar(d) }, String(d));
      botones.set(d, b);
      grid.append(b);
    } else {
      grid.append(h('div', { class: clase }, String(d)));
    }
  }
  const cont = h('div', { class: 'cal' },
    titulo ? h('div', { class: 'cal-sub' }, titulo) : null,
    h('div', { class: 'cal-titulo' }, `${mayus(MESES[m - 1])} ${a}`),
    grid);
  return { el: cont, botones, mes: m, anio: a, dias, desfase };
}

function vCalendario(v, c) {
  c.append(crearCalendario({ mes: v.mes, anio: v.anio, marcar: v.marcar, titulo: v.titulo }).el);
}

// ---------------------------------------------------------------------------
// simetría (cuadrícula con eje vertical)
// ---------------------------------------------------------------------------

// editable(fila, col) → true si la celda es un botón.
export function crearCuadricula({ filas, columnas, celdas = [], color, editable, alTocar } = {}) {
  const F = entero(filas, 2, 10, 4);
  let K = entero(columnas, 2, 10, 4);
  if (K % 2) K += 1;
  const pintadas = new Set(lista(celdas).filter(Array.isArray).map((x) => `${x[0]},${x[1]}`));
  const grid = h('div', { class: 'sim-grid', style: `--cols:${K};--filas:${F}` });
  const celdasEl = new Map();
  for (let f = 0; f < F; f++) {
    for (let k = 0; k < K; k++) {
      const clave = `${f},${k}`;
      const ed = editable && editable(f, k);
      const clase = `sim-celda${pintadas.has(clave) ? ' pintada' : ''}${k === K / 2 - 1 ? ' junto-eje' : ''}`;
      const el = ed
        ? h('button', { type: 'button', class: `${clase} editable`, 'aria-pressed': 'false', 'aria-label': `Fila ${f + 1}, columna ${k + 1}`, onclick: () => alTocar && alTocar(f, k) })
        : h('div', { class: clase });
      celdasEl.set(clave, el);
      grid.append(el);
    }
  }
  const cont = h('div', { class: 'sim', style: color ? `--sim-color:${colorSeguro(color)}` : null },
    h('div', { class: 'sim-marco' }, grid, h('div', { class: 'sim-eje', 'aria-hidden': 'true' })));
  return { el: cont, celdasEl, filas: F, columnas: K };
}

function vSimetria(v, c) {
  // Con completa:true se dibujan las dos mitades tal como vienen; si no, solo
  // viene la mitad izquierda (el validador lo exige) y la derecha queda vacía.
  const celdas = lista(v.celdas).filter((x) => Array.isArray(x) && x.length === 2);
  c.append(crearCuadricula({ filas: v.filas, columnas: v.columnas, celdas, color: v.color }).el);
}

// ---------------------------------------------------------------------------
// regla
// ---------------------------------------------------------------------------

function vRegla(v, c) {
  const lon = entero(v.longitud, 1, 20, 5);
  const L = lon + 2;
  const W = 340, M = 20;
  const u = Math.min(40, (W - 2 * M) / L);
  const x0 = (W - L * u) / 2;
  // Tamaño de los números: si no caben en una fila, se alternan en dos.
  const dig = String(L).length;
  const fsUna = (u - 5) / (dig * 0.62);
  const alterno = fsUna < 14;
  const fsFinal = Math.min(18, alterno ? (2 * u - 5) / (dig * 0.62) : fsUna);
  const xFin = x0 + lon * u;
  const emojiArriba = lon * u < 34;
  const yObj = emojiArriba ? 34 : 14;
  const hObj = 32;
  const yRegla = yObj + hObj + 14;
  const hRegla = alterno ? 68 : 52;
  const H = yRegla + hRegla + 6;
  const svg = lienzo(W, H, { clase: 'rg', max: 380 });
  // objeto
  svg.append(s('rect', { x: x0, y: yObj, width: lon * u, height: hObj, rx: Math.min(10, lon * u / 3), class: 'rg-objeto' }));
  svg.append(texto(emojiArriba ? x0 + lon * u / 2 : x0 + lon * u / 2, emojiArriba ? 16 : yObj + hObj / 2 + 1, v.objeto || '✏️', { class: 'rg-emoji' }));
  // guías punteadas
  svg.append(s('path', { d: `M${r2(x0)} ${yObj + hObj}V${yRegla}M${r2(xFin)} ${yObj + hObj}V${yRegla}`, class: 'rg-guia' }));
  // regla
  svg.append(s('rect', { x: x0 - 12, y: yRegla, width: L * u + 24, height: hRegla, rx: 6, class: 'rg-regla' }));
  let dCm = '', dMedio = '';
  for (let i = 0; i <= L; i++) {
    const x = x0 + i * u;
    dCm += `M${r2(x)} ${yRegla}v17`;
    if (i < L) dMedio += `M${r2(x + u / 2)} ${yRegla}v9`;
  }
  svg.append(s('path', { d: dMedio, class: 'rg-medio' }), s('path', { d: dCm, class: 'rg-cm' }));
  for (let i = 0; i <= L; i++) {
    const y = yRegla + 30 + (alterno && i % 2 ? 19 : 0);
    svg.append(texto(x0 + i * u, y, i, { class: 'rg-num', 'font-size': r2(Math.max(12, fsFinal)) }));
  }
  c.append(svg);
}

// ---------------------------------------------------------------------------
// balanza
// ---------------------------------------------------------------------------

function vBalanza(v, c) {
  const W = 320, H = 232;
  const P = { x: 160, y: 66 };
  const t = v.inclinada === 'izquierda' ? 1 : v.inclinada === 'derecha' ? -1 : 0;
  const ang = (12 * Math.PI) / 180;
  const brazo = 100;
  const dx = brazo * Math.cos(t ? ang : 0), dy = brazo * Math.sin(ang) * t;
  const izq = { x: P.x - dx, y: P.y + dy }, der = { x: P.x + dx, y: P.y - dy };
  const svg = lienzo(W, H, { clase: 'bal', max: 360 });
  // soporte
  svg.append(
    s('path', { d: `M${P.x - 46} ${H - 8}L${P.x - 30} ${H - 26}H${P.x + 30}L${P.x + 46} ${H - 8}Z`, class: 'bal-base' }),
    s('line', { x1: P.x, y1: P.y, x2: P.x, y2: H - 26, class: 'bal-poste' }),
    s('line', { x1: izq.x, y1: izq.y, x2: der.x, y2: der.y, class: 'bal-brazo' }),
  );
  const platillo = (E, items) => {
    const g = s('g', { class: 'bal-lado' });
    const yP = E.y + 60;
    g.append(s('path', { d: `M${r2(E.x)} ${r2(E.y)}L${r2(E.x - 45)} ${r2(yP)}M${r2(E.x)} ${r2(E.y)}L${r2(E.x + 45)} ${r2(yP)}`, class: 'bal-cuerda' }));
    const lista = (Array.isArray(items) ? items : []).slice(0, 12);
    const porFila = 4;
    const fs = lista.length > 8 ? 19 : 22;
    lista.forEach((it, i) => {
      const fila = Math.floor(i / porFila);
      const enFila = Math.min(porFila, lista.length - fila * porFila);
      const k = i % porFila;
      const esp = fs + 3;
      const x = E.x + (k - (enFila - 1) / 2) * esp;
      g.append(texto(x, yP - fs / 2 - 1 - fila * (fs + 1), textoDe(it), { class: 'bal-obj', 'font-size': fs }));
    });
    g.append(s('path', { d: `M${r2(E.x - 52)} ${r2(yP)}Q${r2(E.x)} ${r2(yP + 34)} ${r2(E.x + 52)} ${r2(yP)}Z`, class: 'bal-plato' }));
    g.append(s('circle', { cx: E.x, cy: E.y, r: 4.5, class: 'bal-gancho' }));
    return g;
  };
  svg.append(platillo(izq, v.izquierda), platillo(der, v.derecha));
  svg.append(s('circle', { cx: P.x, cy: P.y, r: 9, class: 'bal-eje' }));
  c.append(svg);
}

// ---------------------------------------------------------------------------
// operación escrita
// ---------------------------------------------------------------------------

const SIGNO = { '+': '+', '-': '−', '−': '−', '×': '×', x: '×', '*': '×', '÷': '÷', '/': '÷', ':': '÷' };

function vOperacion(v, c) {
  const nums = lista(v.numeros).slice(0, 3).map(textoDe);
  const op = SIGNO[v.op] || '+';
  if (!nums.length) {
    c.append(h('p', { class: 'visual-aviso' }, 'Este dibujo no se puede mostrar.'));
    return;
  }
  if (!v.vertical || nums.length < 2) {
    const partes = [];
    nums.forEach((x, i) => {
      if (i) partes.push(h('span', { class: 'op-signo' }, op));
      partes.push(h('span', { class: 'op-num' }, x));
    });
    c.append(h('div', { class: 'op-horizontal' }, partes, h('span', { class: 'op-signo' }, '='), cajaPregunta('op-q')));
    return;
  }
  if (op === '÷') {
    // Forma usada en Bolivia: dividendo | divisor (con raya abajo).
    c.append(h('div', { class: 'op-division' },
      h('span', { class: 'op-dividendo' }, nums[0]),
      h('span', { class: 'op-divisor' }, nums[1])));
    return;
  }
  const L = Math.max(...nums.map((x) => x.length));
  const grid = h('div', { class: 'op-vertical', style: `--cols:${L + 1}` });
  nums.forEach((x, i) => {
    grid.append(h('span', { class: 'op-celda op-signo' }, i === nums.length - 1 ? op : ''));
    const pad = x.padStart(L, ' ');
    for (const ch of pad) grid.append(h('span', { class: 'op-celda' }, ch === ' ' ? '' : ch));
  });
  grid.append(h('span', { class: 'op-raya' }));
  for (let i = 0; i <= L; i++) grid.append(h('span', { class: 'op-celda op-resultado' }));
  c.append(grid);
}

// ---------------------------------------------------------------------------
// bandera
// ---------------------------------------------------------------------------

const COLORES = {
  rojo: '#D52B1E', roja: '#D52B1E', amarillo: '#F9D616', amarilla: '#F9D616', verde: '#007A3D',
  blanco: '#FFFFFF', blanca: '#FFFFFF', azul: '#1F4FA3', celeste: '#6CB4EE', negro: '#222222', negra: '#222222',
  naranja: '#F28C28', anaranjado: '#F28C28', morado: '#7B3FA0', violeta: '#7B3FA0', lila: '#B593D6',
  rosado: '#F4A6C0', rosa: '#F4A6C0', cafe: '#8B5A2B', 'café': '#8B5A2B', marron: '#8B5A2B', 'marrón': '#8B5A2B',
  gris: '#9A9A9A', dorado: '#D4A017',
};

export function colorSeguro(x) {
  const k = String(x ?? '').trim().toLowerCase();
  if (COLORES[k]) return COLORES[k];
  if (/^#[0-9a-f]{3,8}$/i.test(k)) return k;
  if (/^[a-z]{3,20}$/.test(k)) return k;
  return '#CCCCCC';
}

function vBandera(v, c) {
  const franjas = (Array.isArray(v.franjas) ? v.franjas : []).slice(0, 7);
  const W = 240, H = 160, pad = 3;
  const svg = lienzo(W + 2 * pad, H + 2 * pad, { clase: 'bandera', max: 250 });
  const n = Math.max(1, franjas.length);
  const vertical = v.orientacion === 'vertical';
  franjas.forEach((col, i) => {
    const attrs = vertical
      ? { x: pad + (i * W) / n, y: pad, width: W / n + 0.4, height: H }
      : { x: pad, y: pad + (i * H) / n, width: W, height: H / n + 0.4 };
    svg.append(s('rect', { ...attrs, fill: colorSeguro(col) }));
  });
  svg.append(s('rect', { x: pad, y: pad, width: W, height: H, class: 'bandera-borde' }));
  c.append(svg);
  if (v.etiqueta) c.append(h('div', { class: 'visual-etiqueta' }, v.etiqueta));
}

// ---------------------------------------------------------------------------
// secuencia
// ---------------------------------------------------------------------------

export function cajaSecuencia(it, { oculto = false, clase = '' } = {}) {
  if (oculto || it === '?') return h('span', { class: `sec-caja sec-oculta ${clase}`.trim() }, '?');
  if (it === '☐' || it === '' || it === null || it === undefined) return h('span', { class: `sec-caja sec-vacia ${clase}`.trim() });
  const t = typeof it === 'object' ? (it.emoji || it.texto || '') : String(it);
  return h('span', { class: `sec-caja ${esEmoji(t) ? 'sec-emoji' : 'sec-texto'} ${clase}`.trim() }, t);
}

function vSecuencia(v, c) {
  const items = Array.isArray(v.items) ? v.items.slice(0, 12) : [];
  const oc = v.oculto === undefined ? -1 : Number(v.oculto);
  c.append(h('div', { class: 'sec-fila' }, items.map((it, i) => cajaSecuencia(it, { oculto: i === oc }))));
}

// ---------------------------------------------------------------------------
// fechas cívicas publicadas
// ---------------------------------------------------------------------------

function vFechas(v, c, ctx) {
  const filtro = v.filtro || 'todas';
  // Las fechas las edita el adulto: se normalizan día y mes, y se descartan las inválidas.
  const lista = (Array.isArray(ctx.fechas) ? ctx.fechas : [])
    .filter((f) => f && typeof f === 'object' && f.publicada !== false)
    .map((f) => ({ ...f, dia: Number(f.dia), mes: Number(f.mes) }))
    .filter((f) => Number.isInteger(f.mes) && f.mes >= 1 && f.mes <= 12 && Number.isInteger(f.dia) && f.dia >= 1 && f.dia <= 31)
    .filter((f) => filtro === 'todas' || f.tipo === filtro)
    .filter((f) => !v.mes || Number(f.mes) === Number(v.mes))
    .sort((a, b) => a.mes - b.mes || a.dia - b.dia);
  if (!lista.length) {
    c.append(h('p', { class: 'fechas-vacio' }, 'No hay fechas para mostrar.'));
    return;
  }
  const porMes = new Map();
  for (const f of lista) {
    if (!porMes.has(f.mes)) porMes.set(f.mes, []);
    porMes.get(f.mes).push(f);
  }
  const caja = h('div', { class: 'fechas', role: 'list', 'aria-label': textoAlternativo(v) });
  for (const [mes, fs] of porMes) {
    const nombreMes = MESES[mes - 1];
    caja.append(h('section', { class: 'fechas-mes', role: 'listitem' },
      h('div', { class: 'fechas-mes-nombre' }, mayus(nombreMes)),
      h('ul', {}, fs.map((f) => h('li', { class: `fecha fecha-${f.tipo || 'otra'}` },
        h('span', { class: 'fecha-dia' }, `${f.dia} de ${nombreMes}`),
        h('span', { class: 'fecha-sep', 'aria-hidden': 'true' }, ' — '),
        h('span', { class: 'fecha-nombre' }, f.nombre || ''))))));
  }
  c.append(caja);
}

// ---------------------------------------------------------------------------

const RENDER = {
  emoji: vEmoji, emojis: vEmojis, ilustracion: vIlustracion, bloques: vBloques, recta: vRecta,
  fraccion: vFraccion, dinero: vDinero, reloj: vReloj, grupos: vGrupos, arreglo: vArreglo,
  pictograma: vPictograma, tabla: vTabla, calendario: vCalendario, simetria: vSimetria,
  regla: vRegla, balanza: vBalanza, operacion: vOperacion, bandera: vBandera,
  secuencia: vSecuencia, fechas: vFechas,
};

// ---------------------------------------------------------------------------
// texto alternativo (para lectores de pantalla y para el audio)
// ---------------------------------------------------------------------------

const ILUSTRACION_ALT = {
  'planta-partes': 'una planta con sus partes',
  'ciclo-planta': 'cómo crece una planta',
  'estados-agua': 'el agua en distintas formas',
  'ciclo-agua': 'el agua que se mueve en la naturaleza',
  'tierra-rotacion': 'la Tierra y el Sol',
  'tierra-traslacion': 'la Tierra y el Sol',
  'sistema-solar': 'el Sol y los planetas',
  'fases-luna': 'la Luna vista en distintas noches',
  esqueleto: 'los huesos del cuerpo',
  'aparato-digestivo': 'el camino de la comida dentro del cuerpo',
  sentidos: 'partes del cuerpo con las que sentimos',
  'paisaje-altiplano': 'un paisaje de Bolivia',
  'paisaje-valle': 'un paisaje de Bolivia',
  'paisaje-llanos': 'un paisaje de Bolivia',
  'paisaje-chaco': 'un paisaje de Bolivia',
  estaciones: 'el mismo lugar en distintas épocas del año',
  'ciclo-rana': 'el ciclo de vida de un animal',
  'ciclo-mariposa': 'el ciclo de vida de un animal',
  'ciclo-gallina': 'el ciclo de vida de un animal',
  palanca: 'una máquina simple',
  polea: 'una máquina simple',
  'rueda-eje': 'una máquina simple',
  'plano-inclinado': 'una máquina simple',
  deforestacion: 'un bosque y sus árboles',
  cubo: 'un cuerpo geométrico',
  esfera: 'un cuerpo geométrico',
  cilindro: 'un cuerpo geométrico',
  cono: 'un cuerpo geométrico',
  piramide: 'un cuerpo geométrico',
  prisma: 'un cuerpo geométrico',
  'bandera-bolivia': 'un símbolo de Bolivia',
  wiphala: 'un símbolo de Bolivia',
  escarapela: 'un símbolo de Bolivia',
  kantuta: 'una flor de Bolivia',
  patuju: 'una flor de Bolivia',
};

const FORMA_ALT = { circulo: 'Un círculo', rectangulo: 'Un rectángulo', barra: 'Una barra' };
const OP_ALT = { '+': 'Suma', '−': 'Resta', '×': 'Multiplicación', '÷': 'División' };

export function textoAlternativo(v) {
  if (!v || typeof v !== 'object') return 'Dibujo.';
  try {
    return altDe(v);
  } catch (err) {
    console.warn('Texto alternativo no disponible', err);
    return 'Dibujo.';
  }
}

const SIGNO_ALT = { '<': 'menor que', '>': 'mayor que', '=': 'igual a' };
const anioSeguro = (a) => entero(a, 1900, 2200, new Date().getFullYear());

function altDe(v) {
  switch (v.tipo) {
    case 'emoji': {
      const n = v.cantidad === undefined ? 1 : entero(v.cantidad, 0, 30, 1);
      const base = n === 0 ? 'Un espacio vacío'
        : n === 1 ? 'Un dibujo'
          : n <= 5 ? 'Varios dibujos iguales' : 'Varios dibujos iguales, en grupos de cinco';
      return v.etiqueta ? `${base}: ${v.etiqueta}.` : `${base}.`;
    }
    case 'emojis': {
      const et = lista(v.etiquetas).map(textoDe).filter(Boolean);
      return et.length ? `Dibujos: ${et.join(', ')}.` : 'Una fila de dibujos.';
    }
    case 'ilustracion': {
      const base = `Ilustración de ${ILUSTRACION_ALT[v.id] || 'un tema de la clase'}`.replace(/\bde el\b/, 'del');
      return v.resaltar ? `${base}, con una parte resaltada.` : `${base}.`;
    }
    case 'bloques': {
      const hay = [];
      if (Number(v.centenas) > 0) hay.push('placas de cien');
      if (Number(v.decenas) > 0) hay.push('barras de diez');
      if (Number(v.unidades) > 0) hay.push('cubitos sueltos');
      return hay.length ? `Bloques para contar: ${unirY(hay)}.` : 'Bloques para contar.';
    }
    case 'recta': {
      // Mismos extremos que dibuja crearRecta.
      let min = Number(v.min), max = Number(v.max);
      if (!Number.isFinite(min)) min = 0;
      if (!Number.isFinite(max) || max <= min) max = min + 10;
      const oc = new Set(lista(v.ocultar).map(Number));
      const extremos = !oc.has(min) && !oc.has(max) ? ` del ${min} al ${max}` : '';
      const extra = [];
      const nMarcas = lista(v.marcar).length;
      if (nMarcas) extra.push(nMarcas === 1 ? 'un punto marcado' : 'puntos marcados');
      if (lista(v.saltos).length) extra.push('saltos');
      if (oc.size) extra.push('números escondidos');
      return `Recta numérica${extremos}${extra.length ? `, con ${unirY(extra)}` : ''}.`;
    }
    case 'fraccion': {
      // crearFraccion dibuja un círculo si la forma no es válida.
      const forma = FORMA_ALT[v.forma] ? v.forma : 'circulo';
      const dividido = forma === 'barra' ? 'dividida' : 'dividido';
      return `${FORMA_ALT[forma]} ${dividido} en partes${v.iguales === false ? ' de distinto tamaño' : ''}${Number(v.coloreadas) > 0 ? ', con algunas partes pintadas' : ''}.`;
    }
    case 'dinero':
      return 'Monedas y billetes de Bolivia.';
    case 'reloj':
      return 'Un reloj de agujas.';
    case 'grupos':
      return 'Platos con objetos.';
    case 'arreglo':
      return 'Objetos ordenados en filas y columnas.';
    case 'pictograma': {
      const filas = lista(v.datos).map((d) => (d && typeof d === 'object' ? textoDe(d.etiqueta) : '')).filter(Boolean);
      return `Pictograma${v.titulo ? `: ${v.titulo}` : ''}. ${filas.length ? `Filas: ${filas.join(', ')}.` : ''}`.trim();
    }
    case 'tabla': {
      const cols = lista(v.columnas).map((x) => (esHueco(x) ? 'algo que falta' : textoDe(x))).filter(Boolean);
      return cols.length ? `Tabla con columnas ${cols.join(', ')}.` : 'Tabla.';
    }
    case 'calendario': {
      const m = entero(v.mes, 1, 12, 1);
      const base = `Calendario de ${MESES[m - 1]} de ${anioSeguro(v.anio)}`;
      return lista(v.marcar).length ? `${base}, con días marcados.` : `${base}.`;
    }
    case 'simetria':
      return v.completa ? 'Cuadrícula con cuadritos pintados y una línea en el medio.' : 'Cuadrícula con cuadritos pintados a un lado de una línea de simetría.';
    case 'regla':
      return 'Un objeto junto a una regla en centímetros.';
    case 'balanza':
      return 'Una balanza con objetos en sus dos platillos.';
    case 'operacion': {
      const nums = lista(v.numeros).slice(0, 3).map(textoDe);
      const op = SIGNO[v.op] || '+';
      const tipo = OP_ALT[op] || 'Operación';
      return nums.length ? `${tipo}${v.vertical ? ' escrita en columnas' : ''}: ${nums.join(` ${op} `)}.` : `${tipo}.`;
    }
    case 'bandera':
      return v.etiqueta ? `Una bandera de franjas: ${v.etiqueta}.` : 'Una bandera de franjas.';
    case 'secuencia': {
      const items = lista(v.items);
      const oc = v.oculto === undefined ? -1 : Number(v.oculto);
      const falta = (x, i) => i === oc || x === '?';
      const hueco = items.some((x, i) => falta(x, i) || x === '☐' || x === '' || x === null);
      if (items.some((x) => esEmoji(textoDe(x)))) {
        return hueco ? 'Una secuencia de dibujos con un espacio para completar.' : 'Una secuencia de dibujos.';
      }
      const t = items.map((x, i) => {
        if (falta(x, i)) return 'algo que falta';
        if (x === '☐' || x === '' || x === null || x === undefined) return 'un espacio';
        const tx = textoDe(x);
        return SIGNO_ALT[tx.trim()] || tx;
      });
      return `Secuencia: ${t.join(', ')}.`;
    }
    case 'fechas': {
      const m = Number(v.mes);
      return Number.isInteger(m) && m >= 1 && m <= 12 ? `Fechas importantes de ${MESES[m - 1]}.` : 'Fechas importantes de Bolivia.';
    }
    default:
      return 'Dibujo.';
  }
}

function unirY(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}
