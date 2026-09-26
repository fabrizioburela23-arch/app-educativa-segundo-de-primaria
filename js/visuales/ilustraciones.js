// Biblioteca de ilustraciones SVG hechas a mano (en línea, sin recursos externos).
//
//   ilustracion(id, { resaltar, etiquetas }) → texto con el <svg>
//   ILUSTRACIONES_DISPONIBLES                 → ids que sabe dibujar
//
// - Las partes con nombre (ver ILUSTRACIONES en catalogo.js) son grupos
//   <g data-parte="nombre">. Con `resaltar` esa parte recibe un borde grueso de
//   color y las demás se atenúan, para poder preguntar «¿qué parte es?».
// - Las etiquetas (nombres con líneas guía) se muestran por defecto; se ocultan
//   cuando hay `resaltar`, salvo que `etiquetas === true`. `etiquetas === false`
//   siempre las oculta.
// - El aria-label describe el dibujo sin revelar la respuesta de una pregunta.
// - Los ids internos (degradados, flechas, recortes) llevan el id de la
//   ilustración y un contador, así dos copias en la misma página no chocan.

import { ILUSTRACIONES } from '../contenido/catalogo.js';

const T = '#2B2A33'; // tinta de contorno
const RESALTE = '#E0247A'; // color del borde de la parte resaltada
const FUENTE = "Andika, 'Andika', Nunito, 'Segoe UI', Roboto, system-ui, sans-serif";
let contador = 0;

// Paleta suave compartida.
const C = {
  cielo: '#E3F3FB', cielo2: '#CDE9F8', noche: '#26335E', noche2: '#1E2A50',
  sol: '#FFD23F', solB: '#F7A531',
  hoja: '#6CC06A', hojaO: '#3E9A55', hojaC: '#A8DC8C', pasto: '#95D072',
  tronco: '#9B6A43', tierra: '#C99A6B', tierraO: '#A97C52', arena: '#E8C995',
  agua: '#6EC3EA', aguaO: '#3A8FD1', aguaC: '#BFE6F7',
  roca: '#A89CB5', rocaC: '#C9C0D6',
  rojo: '#E4572E', rosa: '#F29CB0', naranja: '#F7A531', amarillo: '#FFD23F',
  morado: '#8E6CC8', azul: '#4A78D6',
  piel: '#C68B5E', pielC: '#D9A57C', pelo: '#3A2E2A',
  hueso: '#FFF8E6', blanco: '#FFFFFF', gris: '#B9B4C7',
};

// ---------------------------------------------------------------------------
// utilidades de dibujo (devuelven texto SVG)
// ---------------------------------------------------------------------------

const f = (n) => String(Math.round(n * 10) / 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rad = (g) => (g * Math.PI) / 180;

function A(o) {
  let s = '';
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v === undefined || v === null || v === false) continue;
    s += ` ${k}="${typeof v === 'number' ? f(v) : v}"`;
  }
  return s;
}
const tz = (fill, o = {}) => ({ fill, stroke: T, 'stroke-width': 2.5, ...o });
const circ = (cx, cy, r, fill, o) => `<circle${A({ cx, cy, r, ...tz(fill, o) })}/>`;
const elip = (cx, cy, rx, ry, fill, o) => `<ellipse${A({ cx, cy, rx, ry, ...tz(fill, o) })}/>`;
const cam = (d, fill = 'none', o) => `<path${A({ d, ...tz(fill, o) })}/>`;
const rect = (x, y, width, height, rx, fill, o) => `<rect${A({ x, y, width, height, rx, ...tz(fill, o) })}/>`;
const lin = (x1, y1, x2, y2, o = {}) => `<line${A({ x1, y1, x2, y2, stroke: T, 'stroke-width': 2.5, ...o })}/>`;
const pol = (pts, fill, o) => `<polygon${A({ points: pts, ...tz(fill, o) })}/>`;
const tr = (x, y, inner, extra = '') => `<g transform="translate(${f(x)} ${f(y)})${extra ? ' ' + extra : ''}">${inner}</g>`;
const sinBorde = { stroke: 'none' };

// Varias formas unidas con un solo contorno exterior (nubes, copas, arbustos).
function mancha(formas, fill, o = {}) {
  const sw = o.sw ?? 2.5;
  const st = o.stroke ?? T;
  const forma = (q, extra) => (q.length === 3
    ? `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(q[2])}"${extra}/>`
    : `<ellipse cx="${f(q[0])}" cy="${f(q[1])}" rx="${f(q[2])}" ry="${f(q[3])}"${extra}/>`);
  const a = formas.map((q) => forma(q, ` fill="${fill}" stroke="${st}" stroke-width="${f(2 * sw)}"`)).join('');
  const b = formas.map((q) => forma(q, ` fill="${fill}"`)).join('');
  return `<g>${a}${b}</g>`;
}

// Trazos gruesos con contorno (tallos, raíces, huesos, intestinos, ríos).
function tubos(ds, color, ancho, borde = 2.5, color2 = T) {
  const a = ds.map((d) => `<path d="${d}" fill="none" stroke="${color2}" stroke-width="${f(ancho + 2 * borde)}"/>`).join('');
  const b = ds.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(ancho)}"/>`).join('');
  return a + b;
}

function hoja(x, y, largo, ang, fill = C.hoja, ancho = 0.36, nervio = true) {
  const L = largo;
  const a = L * ancho;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><path d="M0 0 Q${f(L * 0.42)} ${f(-a)} ${f(L)} 0 Q${f(L * 0.42)} ${f(a)} 0 0Z" fill="${fill}" stroke="${T}" stroke-width="2.5"/>${nervio ? `<path d="M${f(L * 0.08)} 0 L${f(L * 0.78)} 0" stroke="${T}" stroke-width="1.4" opacity=".45" fill="none"/>` : ''}</g>`;
}

function nube(cx, cy, s = 1, fill = '#FFFFFF', o = {}) {
  return mancha([
    [cx - 20 * s, cy + 3 * s, 13 * s], [cx - 4 * s, cy - 7 * s, 17 * s], [cx + 15 * s, cy - 1 * s, 14 * s],
    [cx + 27 * s, cy + 6 * s, 10 * s], [cx + 3 * s, cy + 8 * s, 30 * s, 9 * s],
  ], fill, o);
}

function sol(cx, cy, r, rayos = 10, largo = 0.55) {
  let s = '';
  for (let i = 0; i < rayos; i++) {
    const a = rad((360 / rayos) * i + 8);
    s += lin(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4), cx + Math.cos(a) * (r + 4 + r * largo), cy + Math.sin(a) * (r + 4 + r * largo), { stroke: C.solB, 'stroke-width': 3 });
  }
  return s + circ(cx, cy, r, C.sol);
}

function gota(x, y, s = 1, fill = C.aguaO) {
  return `<path d="M${f(x)} ${f(y - 7 * s)} C${f(x + 4 * s)} ${f(y - 1 * s)} ${f(x + 5 * s)} ${f(y + 2 * s)} ${f(x + 5 * s)} ${f(y + 3.5 * s)} A${f(5 * s)} ${f(5 * s)} 0 0 1 ${f(x - 5 * s)} ${f(y + 3.5 * s)} C${f(x - 5 * s)} ${f(y + 2 * s)} ${f(x - 4 * s)} ${f(y - 1 * s)} ${f(x)} ${f(y - 7 * s)}Z" fill="${fill}" stroke="${T}" stroke-width="1.8"/>`;
}

// Árbol de copa redonda. x = centro del tronco, y = suelo.
function arbol(x, y, s = 1, copa = C.hoja, o = {}) {
  const tronco = cam(`M${f(x - 5 * s)} ${f(y)} L${f(x - 4 * s)} ${f(y - 30 * s)} L${f(x + 4 * s)} ${f(y - 30 * s)} L${f(x + 5 * s)} ${f(y)}Z`, o.tronco || C.tronco);
  const c = mancha([
    [x, y - 44 * s, 20 * s], [x - 15 * s, y - 34 * s, 14 * s], [x + 15 * s, y - 34 * s, 14 * s], [x, y - 30 * s, 16 * s],
  ], copa);
  return tronco + c;
}

function pasto(x, y, s = 1, color = C.hojaO) {
  return cam(`M${f(x - 5 * s)} ${f(y)} L${f(x - 7 * s)} ${f(y - 8 * s)} M${f(x)} ${f(y)} L${f(x)} ${f(y - 10 * s)} M${f(x + 5 * s)} ${f(y)} L${f(x + 7 * s)} ${f(y - 8 * s)}`, 'none', { stroke: color, 'stroke-width': 2.2 });
}

function puntoCirculo(cx, cy, r, g0) {
  return [cx + r * Math.cos(rad(g0)), cy + r * Math.sin(rad(g0))];
}

// Cabeza de niño/niña, de frente. x,y = centro.
function cabeza(x, y, r, o = {}) {
  const piel = o.piel || C.piel;
  let s = '';
  s += circ(x, y, r, piel);
  if (o.pelo !== false) {
    s += cam(`M${f(x - r * 0.98)} ${f(y - r * 0.05)} C${f(x - r * 1.05)} ${f(y - r * 1.05)} ${f(x + r * 1.05)} ${f(y - r * 1.05)} ${f(x + r * 0.98)} ${f(y - r * 0.05)} C${f(x + r * 0.6)} ${f(y - r * 0.55)} ${f(x - r * 0.2)} ${f(y - r * 0.6)} ${f(x - r * 0.98)} ${f(y - r * 0.05)}Z`, o.colorPelo || C.pelo, { 'stroke-width': 2 });
  }
  s += circ(x - r * 0.36, y + r * 0.12, r * 0.1, T, sinBorde) + circ(x + r * 0.36, y + r * 0.12, r * 0.1, T, sinBorde);
  s += cam(`M${f(x - r * 0.3)} ${f(y + r * 0.45)} Q${f(x)} ${f(y + r * 0.7)} ${f(x + r * 0.3)} ${f(y + r * 0.45)}`, 'none', { 'stroke-width': 2 });
  return s;
}

// ---------------------------------------------------------------------------
// contexto de cada dibujo: ids únicos, partes, etiquetas y flechas
// ---------------------------------------------------------------------------

function filtroBrillo(pref, W, H) {
  // Borde grueso de color + anillo blanco + aura suave alrededor de la silueta de la parte.
  return `<filter id="${pref}-brillo" filterUnits="userSpaceOnUse" x="-12" y="-12" width="${W + 24}" height="${H + 24}" color-interpolation-filters="sRGB">`
    + '<feComponentTransfer in="SourceAlpha" result="a"><feFuncA type="linear" slope="6"/></feComponentTransfer>'
    + '<feMorphology in="a" operator="dilate" radius="2.2" result="d1"/>'
    + '<feMorphology in="a" operator="dilate" radius="5.5" result="d2"/>'
    + '<feMorphology in="a" operator="dilate" radius="8" result="d3"/>'
    + '<feGaussianBlur in="d3" stdDeviation="2.5" result="d3b"/>'
    + `<feFlood flood-color="${RESALTE}" flood-opacity="0.35"/><feComposite in2="d3b" operator="in" result="aura"/>`
    + `<feFlood flood-color="${RESALTE}"/><feComposite in2="d2" operator="in" result="anillo"/>`
    + '<feFlood flood-color="#FFFFFF"/><feComposite in2="d1" operator="in" result="blanco"/>'
    + '<feMerge><feMergeNode in="aura"/><feMergeNode in="anillo"/><feMergeNode in="blanco"/><feMergeNode in="SourceGraphic"/></feMerge>'
    + '</filter>';
}

function crearContexto(id, opciones) {
  const n = ++contador;
  const pref = `il-${id}-${n}`;
  const partes = Object.prototype.hasOwnProperty.call(ILUSTRACIONES, id) ? ILUSTRACIONES[id] : [];
  const resaltar = opciones && opciones.resaltar && partes.includes(opciones.resaltar) ? opciones.resaltar : null;
  const et = opciones ? opciones.etiquetas : undefined;
  const conEtiquetas = et === true || (et !== false && !resaltar);
  const defs = [];
  const etiquetas = [];
  const marcadores = {};

  const ctx = {
    pref, resaltar, conEtiquetas, defs, etiquetas,
    id: (s) => `${pref}-${s}`,
    copia: '',
    // Parte con nombre. Al resaltar, todo el primer plano se atenúa como un solo
    // grupo y la parte elegida se vuelve a dibujar encima con el borde de color.
    parte(nombre, contenido, extra = '') {
      if (resaltar === nombre) {
        ctx.copia = `<g data-parte="${nombre}" data-resaltada="true" filter="url(#${pref}-brillo)"${extra}>${contenido}</g>`;
        return `<g data-debajo="${nombre}"${extra}>${contenido}</g>`;
      }
      return `<g data-parte="${nombre}"${extra}>${contenido}</g>`;
    },
    punta(color, tam = 11) {
      const k = `${color}|${tam}`;
      if (!marcadores[k]) {
        const mid = `${pref}-f${Object.keys(marcadores).length}`;
        marcadores[k] = mid;
        defs.push(`<marker id="${mid}" viewBox="0 0 10 10" refX="6.5" refY="5" markerWidth="${tam}" markerHeight="${tam}" markerUnits="userSpaceOnUse" orient="auto"><path d="M1.2 1.2 L9 5 L1.2 8.8 Z" fill="${color}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></marker>`);
      }
      return `url(#${marcadores[k]})`;
    },
    flecha(d, color = '#1F7A70', ancho = 3.5, tam = 12, o = {}) {
      return `<path${A({ d, fill: 'none', stroke: color, 'stroke-width': ancho, 'marker-end': ctx.punta(color, tam), ...o })}/>`;
    },
    // Etiqueta con línea guía. (lx, ly) = punto de anclaje del texto (ly = centro
    // vertical del bloque); (px, py) = punto señalado (opcional).
    et(texto, lx, ly, px, py, o = {}) {
      if (!conEtiquetas) return;
      const size = o.size || 16;
      const lh = size * 1.13;
      const lineas = String(texto).split('\n');
      const anchor = o.anchor || 'middle';
      const color = o.color || T;
      const halo = o.halo || '#FFFFFF';
      const alto = lineas.length * lh;
      const y0 = ly - alto / 2 + lh / 2;
      let s = '';
      if (px !== undefined && px !== null) {
        let x1 = lx;
        let y1 = ly;
        if (o.desde) [x1, y1] = o.desde;
        else if (anchor === 'start') x1 = lx - 5;
        else if (anchor === 'end') x1 = lx + 5;
        else y1 = py > ly ? ly + alto / 2 + 1 : ly - alto / 2 - 3;
        s += lin(x1, y1, px, py, { stroke: halo, 'stroke-width': 4.5, opacity: 0.85 });
        s += lin(x1, y1, px, py, { stroke: color, 'stroke-width': 1.8 });
        s += circ(px, py, 3.3, color, { stroke: halo, 'stroke-width': 1.5 });
      }
      if (o.pastilla) {
        const ancho = Math.max(...lineas.map((t) => t.length)) * size * 0.6 + 16;
        const altoP = alto + 6;
        const x0 = anchor === 'start' ? lx - 8 : anchor === 'end' ? lx - ancho + 8 : lx - ancho / 2;
        s += rect(x0, ly - altoP / 2, ancho, altoP, altoP / 2, '#FFFFFF', { stroke: '#8C8799', 'stroke-width': 1.5, opacity: 0.94 });
      }
      const pesos = o.pesos || [];
      const ts = lineas.map((t, i) => `<tspan x="${f(lx)}" y="${f(y0 + i * lh + size * 0.36)}"${pesos[i] ? ` font-weight="${pesos[i]}"` : ''}>${esc(t)}</tspan>`).join('');
      s += `<text text-anchor="${anchor}" font-size="${size}" font-weight="${o.peso || 700}" fill="${color}" stroke="${halo}" stroke-width="${o.grosorHalo || 4}" paint-order="stroke" stroke-linejoin="round">${ts}</text>`;
      etiquetas.push(s);
    },
  };

  return ctx;
}

// ---------------------------------------------------------------------------
// CIENCIAS: plantas
// ---------------------------------------------------------------------------

function plantaPartes(x) {
  let s = rect(4, 4, 312, 262, 18, '#EAF6FB', sinBorde);
  const suelo = 'M4 184 C40 178 80 186 120 182 S200 178 240 183 S300 186 316 181';
  s += `<path d="${suelo} L316 248 Q316 266 298 266 L22 266 Q4 266 4 248 Z" fill="${C.tierra}"/>`;
  for (const [a, b, r] of [[40, 212, 5], [272, 232, 6], [88, 252, 4], [236, 206, 4], [298, 212, 3.5], [30, 242, 3.5], [250, 254, 3.5]]) {
    s += elip(a, b, r * 1.4, r, C.tierraO, { 'stroke-width': 1.5 });
  }
  s += cam(suelo);
  s += pasto(40, 181) + pasto(262, 182) + pasto(292, 183, 0.8) + pasto(82, 184, 0.8);
  const fondo = s;
  s = '';

  const raices = [
    'M160 184 C161 205 158 228 160 252', 'M160 196 C148 204 132 206 120 220', 'M160 202 C172 210 190 212 202 228',
    'M159 222 C150 230 140 236 134 250', 'M161 226 C170 234 180 240 186 254', 'M126 214 C118 214 108 218 102 228',
    'M196 220 C204 222 214 224 222 234',
  ];
  s += x.parte('raiz', tubos(raices, '#F2E0BC', 4, 2.2));

  s += x.parte('tallo', tubos(['M160 186 C158 152 162 118 160 80', 'M160 122 C176 108 196 102 213 106'], '#5BAF5A', 7));

  s += x.parte('hoja', hoja(158, 152, 60, 200, C.hoja) + hoja(158, 102, 46, 214, C.hoja) + hoja(162, 166, 56, -16, C.hoja));

  let fruto = circ(214, 126, 17, C.rojo);
  fruto += elip(207, 119, 4.5, 3, '#FFFFFF', { stroke: 'none', opacity: 0.6 });
  fruto += `<path d="M214 108 L218 114 L225 113 L220 118 M214 108 L210 114 L203 113 L208 118 M214 108 L214 116" fill="none" stroke="${C.hojaO}" stroke-width="3"/>`;
  s += x.parte('fruto', fruto);

  let flor = '';
  for (let k = 0; k < 5; k++) {
    const a = -90 + 72 * k;
    const [px, py] = puntoCirculo(160, 60, 15, a);
    flor += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="10" ry="15" transform="rotate(${f(a + 90)} ${f(px)} ${f(py)})" fill="${C.sol}" stroke="${T}" stroke-width="2.5"/>`;
  }
  flor += circ(160, 60, 9, C.solB);
  flor += circ(157, 58, 1.6, T, sinBorde) + circ(163, 58, 1.6, T, sinBorde) + circ(160, 63, 1.6, T, sinBorde);
  s += x.parte('flor', flor);

  x.et('flor', 236, 40, 184, 52, { anchor: 'start' });
  x.et('fruto', 252, 128, 232, 128, { anchor: 'start' });
  x.et('tallo', 64, 120, 157, 120, { anchor: 'end' });
  x.et('hoja', 64, 162, 120, 142, { anchor: 'end' });
  x.et('raíz', 64, 230, 104, 226, { anchor: 'end' });
  return { w: 320, h: 270, fondo, cuerpo: s, aria: 'Dibujo de una planta con sus partes.' };
}

// Pequeños dibujos de las etapas de una planta (centrados en 0,0; ~64×50).
function sueloChico(ancho = 64) {
  return `<path d="M${-ancho / 2} 14 Q0 10 ${ancho / 2} 14 L${ancho / 2} 22 Q${ancho / 2} 26 ${ancho / 2 - 4} 26 L${-ancho / 2 + 4} 26 Q${-ancho / 2} 26 ${-ancho / 2} 22Z" fill="${C.tierra}" stroke="${T}" stroke-width="2.2"/>`;
}
const etapaPlanta = {
  semilla: () => sueloChico() + `<ellipse cx="0" cy="4" rx="14" ry="9" transform="rotate(-18 0 4)" fill="#B07945" stroke="${T}" stroke-width="2.5"/><path d="M-6 1 Q0 -3 6 2" fill="none" stroke="#F2E0BC" stroke-width="2.2" transform="rotate(-18 0 4)"/>`,
  brote: () => sueloChico() + tubos(['M0 16 C0 6 -1 -2 0 -10'], '#5BAF5A', 4, 2)
    + hoja(0, -10, 18, 200, C.hojaC, 0.45, false) + hoja(0, -10, 18, -20, C.hojaC, 0.45, false)
    + elip(-4, 18, 7, 4, '#B07945', { 'stroke-width': 1.8 }),
  planta: () => sueloChico() + tubos(['M0 16 C-1 0 1 -14 0 -26'], '#5BAF5A', 4.5, 2)
    + hoja(0, 4, 22, 200) + hoja(0, -2, 22, -20) + hoja(0, -16, 18, 215) + hoja(0, -20, 16, -35),
  flor: () => {
    let s = sueloChico() + tubos(['M0 16 C-1 2 1 -10 0 -20'], '#5BAF5A', 4.5, 2) + hoja(0, 6, 20, 200) + hoja(0, 0, 20, -20);
    for (let k = 0; k < 5; k++) {
      const a = -90 + 72 * k;
      const [px, py] = puntoCirculo(0, -26, 8, a);
      s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="5.5" ry="8.5" transform="rotate(${f(a + 90)} ${f(px)} ${f(py)})" fill="${C.sol}" stroke="${T}" stroke-width="2"/>`;
    }
    return s + circ(0, -26, 5, C.solB, { 'stroke-width': 2 });
  },
  fruto: () => {
    let s = circ(0, 0, 23, C.rojo) + circ(0, 0, 17, '#F7967A', { 'stroke-width': 1.6 });
    s += cam('M0 -17 L0 0 M0 0 L-14 10 M0 0 L14 10', 'none', { stroke: '#E4572E', 'stroke-width': 3 });
    for (const [a, b] of [[-7, -7], [-9, 1], [7, -7], [9, 1], [-4, 11], [4, 11], [0, -12], [-12, -2], [12, -2]]) {
      s += `<ellipse cx="${a}" cy="${b}" rx="2.4" ry="3.4" transform="rotate(${a * 5} ${a} ${b})" fill="#FFE9A8" stroke="${T}" stroke-width="1.2"/>`;
    }
    s += `<path d="M0 -23 L4 -30 M0 -23 L-5 -29 M0 -23 L0 -31" stroke="${C.hojaO}" stroke-width="3" fill="none"/>`;
    return s;
  },
};

function tarjeta(x, y, w, h, fondo) {
  return rect(x, y, w, h, 16, fondo, { stroke: '#D9CDB8', 'stroke-width': 2 });
}

function cicloPlanta(x) {
  const cx = 160;
  const cy = 154;
  const R = 106;
  const etapas = [
    ['semilla', 'semilla'], ['brote', 'brote'], ['planta', 'planta'], ['flor', 'flor'], ['fruto', 'fruto con\nsemillas'],
  ];
  const W = 92;
  const H = 88;
  let s = '';
  const pos = etapas.map((_, k) => puntoCirculo(cx, cy, R, -90 + 72 * k));
  // flechas en círculo
  const RF = 128;
  for (let k = 0; k < 5; k++) {
    const a = -90 + 72 * k + 36;
    const [x1, y1] = puntoCirculo(cx, cy, RF, a - 11);
    const [x2, y2] = puntoCirculo(cx, cy, RF, a + 11);
    s += x.flecha(`M${f(x1)} ${f(y1)} A${RF} ${RF} 0 0 1 ${f(x2)} ${f(y2)}`, '#1F7A70', 4, 13);
  }
  etapas.forEach(([clave, nombre], k) => {
    const [px, py] = pos[k];
    s += tarjeta(px - W / 2, py - H / 2, W, H, '#F3FAEE');
    // «fruto con semillas» ocupa dos líneas: el dibujo se achica y sube un poco.
    const dy = x.conEtiquetas ? (clave === 'fruto' ? -19 : -10) : 0;
    const esc2 = clave === 'fruto' && x.conEtiquetas ? 0.72 : 1;
    s += `<g transform="translate(${f(px)} ${f(py + dy)}) scale(${esc2})">${etapaPlanta[clave]()}</g>`;
    if (clave === 'fruto') x.et(nombre, px, py + 22, null, null);
    else x.et(nombre, px, py + 31);
  });
  return { w: 320, h: 290, cuerpo: s, aria: 'Dibujo de cómo crece una planta, en etapas unidas por flechas en círculo.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: agua
// ---------------------------------------------------------------------------

function cuboHielo(x, y, s = 1) {
  const a = 18 * s;
  const d = 9 * s;
  let r = pol(`${f(x)},${f(y)} ${f(x + a)},${f(y)} ${f(x + a)},${f(y + a)} ${f(x)},${f(y + a)}`, '#A9DDF3', { 'stroke-width': 2.2 });
  r += pol(`${f(x)},${f(y)} ${f(x + d)},${f(y - d * 0.8)} ${f(x + a + d)},${f(y - d * 0.8)} ${f(x + a)},${f(y)}`, '#D8F1FB', { 'stroke-width': 2.2 });
  r += pol(`${f(x + a)},${f(y)} ${f(x + a + d)},${f(y - d * 0.8)} ${f(x + a + d)},${f(y + a - d * 0.8)} ${f(x + a)},${f(y + a)}`, '#86C8E6', { 'stroke-width': 2.2 });
  r += lin(x + 4 * s, y + 5 * s, x + 4 * s, y + 11 * s, { stroke: '#FFFFFF', 'stroke-width': 2.4 });
  return r;
}

function estadosAgua(x) {
  let s = '';
  const paneles = [[6, '#EAF5FB'], [116, '#E3F1FA'], [226, '#F0EEF8']];
  for (const [px, col] of paneles) s += rect(px, 6, 88, 200, 16, col, { stroke: '#D9CDB8', 'stroke-width': 2 });
  const fondo = s;
  s = '';
  // flechas entre paneles
  s += x.flecha('M97 92 L113 92', '#E4572E', 3.5, 11) + x.flecha('M207 92 L223 92', '#E4572E', 3.5, 11);

  // sólido: cubos de hielo en un plato
  s += elip(50, 132, 36, 8, '#FFFFFF');
  const hielo = cuboHielo(24, 104, 1.15) + cuboHielo(50, 106, 1.1) + cuboHielo(36, 80, 1.1);
  s += x.parte('solido', hielo);

  // líquido: vaso con agua
  let vaso = `<path d="M136 62 L142 142 Q143 148 149 148 L171 148 Q177 148 178 142 L184 62 Z" fill="#F7FCFF" stroke="${T}" stroke-width="2.5"/>`;
  vaso += `<path d="M139 92 Q150 88 160 92 T181 92 L178 142 Q177 146 171 146 L149 146 Q143 146 142 142 Z" fill="${C.agua}"/>`;
  vaso += cam('M139 92 Q150 88 160 92 T181 92', 'none', { stroke: C.aguaO, 'stroke-width': 2 });
  vaso += `<path d="M136 62 L142 142 Q143 148 149 148 L171 148 Q177 148 178 142 L184 62" fill="none" stroke="${T}" stroke-width="2.5"/>`;
  vaso += lin(146, 100, 149, 134, { stroke: '#FFFFFF', 'stroke-width': 3, opacity: 0.8 });
  vaso += elip(160, 62, 24, 4, 'none', { 'stroke-width': 2 });
  s += x.parte('liquido', vaso);

  // gaseoso: vapor que sale de una tetera
  let tetera = cam('M244 150 Q244 118 270 116 Q296 118 296 150 Z', '#E86F4C');
  tetera += cam('M248 132 Q236 126 232 108', 'none', { 'stroke-width': 9 }) + cam('M248 132 Q236 126 232 108', 'none', { stroke: '#E86F4C', 'stroke-width': 4.5 });
  tetera += cam('M292 126 Q308 130 300 146', 'none', { 'stroke-width': 3 });
  tetera += rect(262, 108, 16, 9, 4, '#C95A3B', { 'stroke-width': 2.2 });
  tetera += elip(270, 151, 30, 4, '#8D8A99', { 'stroke-width': 2 });
  s += tetera;
  const vapor = ['M231 100 C224 90 238 82 231 70 C226 62 234 56 232 48', 'M248 96 C242 86 254 78 248 66 C244 58 252 52 250 42', 'M266 100 C260 90 272 82 266 70 C262 62 270 56 268 50'];
  s += x.parte('gaseoso', tubos(vapor, '#FFFFFF', 5, 2.2));

  x.et('hielo\nsólido', 50, 182, null, null, { pesos: [400, 700] });
  x.et('agua\nlíquido', 160, 182, null, null, { pesos: [400, 700] });
  x.et('vapor\ngaseoso', 270, 182, null, null, { pesos: [400, 700] });
  return { w: 320, h: 212, fondo, cuerpo: s, aria: 'Dibujo del agua en tres formas diferentes.' };
}

function cicloAgua(x) {
  let s = rect(3, 3, 314, 234, 18, '#DDF1FB', sinBorde);
  s += sol(36, 36, 17, 10, 0.45);
  // montaña
  // (más baja que antes: la lluvia cae sobre la ladera, no encima de la cumbre nevada)
  s += cam('M168 206 L258 124 L282 148 L300 134 L318 150 L318 206 Z', '#B39B85');
  s += cam('M258 124 L268 134 L262 132 L257 138 L251 132 L245 136 Z', '#FFFFFF', { 'stroke-width': 2 });
  s += cam('M300 134 L308 141 L302 140 L298 144 L293 139 L289 142 Z', '#FFFFFF', { 'stroke-width': 2 });
  // suelo verde y lago
  s += `<path d="M3 196 Q80 188 160 196 T317 192 L317 222 Q317 237 302 237 L18 237 Q3 237 3 222 Z" fill="#9BD07A"/>`;
  s += cam('M3 196 Q80 188 160 196 T317 192');
  s += `<path d="M3 200 Q60 194 150 202 Q160 214 150 226 Q120 238 60 237 L18 237 Q3 237 3 222 Z" fill="${C.agua}" stroke="${T}" stroke-width="2.5"/>`;
  s += cam('M30 216 q8 -4 16 0 M80 222 q8 -4 16 0 M52 230 q8 -4 16 0', 'none', { stroke: '#FFFFFF', 'stroke-width': 2 });
  // río que baja de la montaña al lago
  s += tubos(['M270 150 C262 166 250 176 234 184 C214 194 200 188 186 200 C174 210 164 206 150 212'], C.agua, 6, 2.2);
  s += x.flecha('M184 202 C176 208 168 207 160 210', C.aguaO, 2.5, 9);
  s += pasto(270, 212) + pasto(300, 220, 0.8) + pasto(190, 226, 0.8);
  const fondo = s;
  s = '';

  // evaporación
  const evap = [44, 76, 108].map((xx) => x.flecha(`M${xx} 190 C${xx - 8} 172 ${xx + 8} 160 ${xx} 144 C${xx - 8} 132 ${xx + 6} 124 ${xx} 114`, '#E4572E', 3.2, 12, { 'stroke-dasharray': '7 6' })).join('');
  s += x.parte('evaporacion', evap);

  // condensación: la nube que se forma con el vapor
  s += x.parte('condensacion', nube(114, 64, 1.05, '#FFFFFF'));
  s += x.flecha('M152 62 L184 58', '#8C87A6', 3, 10);

  // precipitación: lluvia desde la nube gris
  s += nube(236, 56, 1.1, '#C7CEDF');
  let lluvia = '';
  for (const [a, b] of [[214, 86], [230, 94], [246, 86], [262, 94], [222, 106], [238, 113], [254, 104], [270, 111]]) lluvia += gota(a, b, 1.05);
  s += x.parte('precipitacion', lluvia);

  x.et('condensación', 126, 18, 118, 42, { anchor: 'middle' });
  x.et('evaporación', 120, 152, 112, 146, { anchor: 'start' });
  x.et('precipitación', 204, 96, 212, 96, { anchor: 'end' });
  x.et('Sol', 36, 82, null, null);
  x.et('lago', 74, 218, null, null);
  x.et('río', 196, 224, 196, 198);
  return { w: 320, h: 240, fondo, cuerpo: s, aria: 'Dibujo del agua que se mueve en la naturaleza: el Sol, un lago, nubes, lluvia, una montaña y un río, con flechas.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: la Tierra, el Sol y la Luna
// ---------------------------------------------------------------------------

function estrellas(lista, color = '#FFF6C9') {
  return lista.map(([a, b, r = 1.6]) => `<circle cx="${a}" cy="${b}" r="${r}" fill="${color}"/>`).join('');
}

// Tierra dibujada en (cx, cy) con radio r; eje inclinado 23,5° (arriba a la derecha).
function tierraBase(cx, cy, r) {
  let s = circ(cx, cy, r, '#4FA3E0', { stroke: 'none' });
  // continentes simplificados (manchas), girados con el eje
  s += `<g transform="rotate(23.5 ${f(cx)} ${f(cy)})">`;
  s += `<path d="M${f(cx - r * 0.35)} ${f(cy - r * 0.75)} c${f(r * 0.3)} ${f(-r * 0.1)} ${f(r * 0.55)} ${f(r * 0.1)} ${f(r * 0.45)} ${f(r * 0.4)} c${f(-r * 0.05)} ${f(r * 0.2)} ${f(r * 0.25)} ${f(r * 0.3)} ${f(r * 0.2)} ${f(r * 0.55)} c${f(-r * 0.05)} ${f(r * 0.3)} ${f(-r * 0.3)} ${f(r * 0.45)} ${f(-r * 0.35)} ${f(r * 0.8)} c${f(-r * 0.25)} ${f(-r * 0.15)} ${f(-r * 0.2)} ${f(-r * 0.5)} ${f(-r * 0.4)} ${f(-r * 0.75)} c${f(-r * 0.2)} ${f(-r * 0.3)} ${f(-r * 0.1)} ${f(-r * 0.7)} ${f(r * 0.1)} ${f(-r * 1.0)}z" fill="#7CC576" stroke="#4E9A55" stroke-width="1.5"/>`;
  s += `<ellipse cx="${f(cx + r * 0.55)}" cy="${f(cy - r * 0.15)}" rx="${f(r * 0.2)}" ry="${f(r * 0.35)}" fill="#7CC576" stroke="#4E9A55" stroke-width="1.5"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy - r * 0.93)}" rx="${f(r * 0.45)}" ry="${f(r * 0.12)}" fill="#FFFFFF"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy + r * 0.93)}" rx="${f(r * 0.45)}" ry="${f(r * 0.12)}" fill="#FFFFFF"/>`;
  s += '</g>';
  return s;
}

function tierraRotacion(x) {
  const W = 320;
  const H = 226;
  let s = rect(3, 3, W - 6, H - 6, 18, C.noche, sinBorde);
  s += estrellas([[120, 20], [290, 24], [300, 190], [96, 200], [140, 208, 1.2], [70, 60, 1.2], [290, 150, 1.2]]);
  // Sol a la izquierda
  x.defs.push(`<clipPath id="${x.id('c0')}"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="18"/></clipPath>`);
  s += `<g clip-path="url(#${x.id('c0')})">${circ(-12, 112, 58, C.sol, { stroke: C.solB, 'stroke-width': 4 })}</g>`;
  // rayos de luz
  for (const yy of [58, 86, 114, 142, 170]) s += x.flecha(`M54 ${yy} L118 ${yy}`, '#FFE58A', 2.5, 9, { 'stroke-dasharray': '6 5' });
  const cx = 196;
  const cy = 114;
  const r = 62;
  // anillo de giro (parte de atrás)
  const inc = 23.5;
  const anillo = (a1, a2) => {
    const p = (t) => {
      const px = 84 * Math.cos(rad(t));
      const py = 17 * Math.sin(rad(t));
      const c = Math.cos(rad(inc));
      const sn = Math.sin(rad(inc));
      return [cx + px * c - py * sn, cy + px * sn + py * c];
    };
    let d = '';
    const paso = a2 >= a1 ? 5 : -5;
    for (let t = a1; paso > 0 ? t <= a2 : t >= a2; t += paso) {
      const [a, b] = p(t);
      d += `${d ? 'L' : 'M'}${f(a)} ${f(b)} `;
    }
    return d;
  };
  const fondo = s;
  s = `<path d="${anillo(185, 355)}" fill="none" stroke="#FFB84D" stroke-width="3.5" opacity=".7"/>`;
  // Tierra: mitad de día y mitad de noche
  x.defs.push(`<clipPath id="${x.id('cd')}"><rect x="${cx - r - 4}" y="${cy - r - 4}" width="${r + 4}" height="${2 * r + 8}"/></clipPath>`);
  x.defs.push(`<clipPath id="${x.id('cn')}"><rect x="${cx}" y="${cy - r - 4}" width="${r + 4}" height="${2 * r + 8}"/></clipPath>`);
  x.defs.push(`<clipPath id="${x.id('ct')}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
  const base = `<g clip-path="url(#${x.id('ct')})">${tierraBase(cx, cy, r)}</g>`;
  const dia = `<g clip-path="url(#${x.id('cd')})">${base}${circ(cx, cy, r, 'none')}</g>`;
  const noche = `<g clip-path="url(#${x.id('cn')})">${base}${circ(cx, cy, r, '#0E1638', { stroke: 'none', opacity: 0.62 })}${circ(cx, cy, r, 'none')}</g>`;
  s += x.parte('dia', dia);
  s += x.parte('noche', noche);
  // eje
  const ex = Math.sin(rad(inc)) * 88;
  const ey = Math.cos(rad(inc)) * 88;
  s += lin(cx - ex, cy + ey, cx + ex, cy - ey, { stroke: '#FFFFFF', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' });
  s += circ(cx + ex, cy - ey, 3.5, '#FFFFFF', sinBorde);
  // anillo de giro (parte de adelante) con la flecha: gira de oeste a este
  s += `<path d="${anillo(175, 10)}" fill="none" stroke="#FFB84D" stroke-width="3.5" marker-end="${x.punta('#FFB84D', 13)}"/>`;
  x.et('Sol', 22, 112, null, null, { color: T, halo: C.sol });
  x.et('eje', cx + ex + 10, cy - ey - 2, null, null, { anchor: 'start', color: '#FFFFFF', halo: C.noche2 });
  x.et('día', 118, 30, 158, 72, { color: '#FFFFFF', halo: C.noche2 });
  x.et('noche', 282, 88, 236, 104, { color: '#FFFFFF', halo: C.noche2 });
  x.et('Tierra', 196, 206, null, null, { color: '#FFFFFF', halo: C.noche2 });
  return { w: W, h: H, fondo, cuerpo: s, aria: 'Dibujo del Sol que ilumina la Tierra; la Tierra gira sobre su eje.' };
}

function tierraChica(cx, cy, r, solX, solY) {
  // mitad iluminada hacia el Sol; eje inclinado siempre hacia el mismo lado
  const ang = (Math.atan2(solY - cy, solX - cx) * 180) / Math.PI;
  let s = circ(cx, cy, r, '#4FA3E0');
  s += `<ellipse cx="${f(cx - r * 0.25)}" cy="${f(cy - r * 0.1)}" rx="${f(r * 0.3)}" ry="${f(r * 0.5)}" fill="#7CC576"/>`;
  // sombra de noche (mitad opuesta al Sol)
  s += `<path d="M${f(cx)} ${f(cy - r)} A${f(r)} ${f(r)} 0 0 1 ${f(cx)} ${f(cy + r)} Z" fill="#0E1638" opacity=".6" transform="rotate(${f(ang + 180)} ${f(cx)} ${f(cy)})"/>`;
  s += circ(cx, cy, r, 'none', { 'stroke-width': 2 });
  const ex = Math.sin(rad(23.5)) * (r + 8);
  const ey = Math.cos(rad(23.5)) * (r + 8);
  s += lin(cx - ex, cy + ey, cx + ex, cy - ey, { stroke: '#FFFFFF', 'stroke-width': 2 });
  s += circ(cx + ex, cy - ey, 2.2, '#FFFFFF', sinBorde);
  return s;
}

function tierraTraslacion(x) {
  const W = 320;
  const H = 240;
  let s = rect(3, 3, W - 6, H - 6, 18, C.noche, sinBorde);
  s += estrellas([[30, 24], [292, 30], [300, 206], [22, 214], [100, 70, 1.2], [226, 176, 1.2], [230, 66, 1.2], [96, 176, 1.2]]);
  const cx = 160;
  const cy = 120;
  const rx = 122;
  const ry = 90;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#9FB0E0" stroke-width="2" stroke-dasharray="6 6"/>`;
  // flechas de dirección (sentido antihorario visto desde el norte)
  for (const t of [45, 135, 225, 315]) {
    const a1 = rad(t + 8);
    const a2 = rad(t - 8);
    s += x.flecha(`M${f(cx + rx * Math.cos(a1))} ${f(cy + ry * Math.sin(a1))} A${rx} ${ry} 0 0 0 ${f(cx + rx * Math.cos(a2))} ${f(cy + ry * Math.sin(a2))}`, '#FFB84D', 3.5, 12);
  }
  // Sol con brillo
  s += sol(cx, cy, 27, 12, 0.32);
  for (const [a, b] of [[cx + rx, cy], [cx, cy - ry], [cx - rx, cy], [cx, cy + ry]]) s += tierraChica(a, b, 14, cx, cy);
  x.et('Sol', cx, cy, null, null, { color: T, halo: C.sol });
  x.et('Tierra', cx + rx, cy - 44, cx + rx - 4, cy - 3, { color: '#FFFFFF', halo: C.noche2 });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de la Tierra en cuatro lugares de su camino alrededor del Sol.' };
}

function sistemaSolar(x) {
  const W = 320;
  const H = 316;
  let s = rect(3, 3, W - 6, H - 6, 18, C.noche, sinBorde);
  s += estrellas([[24, 60], [296, 70], [40, 150], [290, 160, 1.2], [60, 240], [280, 270, 1.2], [140, 300, 1.2], [200, 150, 1.1], [160, 186, 1.1], [300, 240]]);
  s += `<clipPath id="${x.id('c0')}"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="18"/></clipPath>`;
  const sx = 160;
  const sy = -72;
  const planetas = [
    ['Mercurio', 50, 6, 'izq'], ['Venus', 78, 9, 'der'], ['Tierra', 106, 9.5, 'izq'], ['Marte', 133, 7, 'der'],
    ['Júpiter', 172, 18, 'izq'], ['Saturno', 215, 14, 'der'], ['Urano', 255, 12, 'izq'], ['Neptuno', 290, 12, 'der'],
  ];
  let orbitas = '';
  const pos = planetas.map(([, y, , lado]) => {
    const px = lado === 'izq' ? 112 : 208;
    const R = Math.hypot(px - sx, y - sy);
    orbitas += `<circle cx="${sx}" cy="${sy}" r="${f(R)}" fill="none" stroke="#6E7DB4" stroke-width="1.5"/>`;
    return [px, y];
  });
  s += `<g clip-path="url(#${x.id('c0')})">${orbitas}${circ(sx, sy, 100, C.sol, { stroke: C.solB, 'stroke-width': 4 })}</g>`;
  const dib = {
    Mercurio: (a, b, r) => circ(a, b, r, '#B7B0A6', { 'stroke-width': 2 }),
    Venus: (a, b, r) => circ(a, b, r, '#E8C27A', { 'stroke-width': 2 }),
    Tierra: (a, b, r) => circ(a, b, r, '#4FA3E0', { 'stroke-width': 2 }) + `<path d="M${a - 4} ${b - 5} q5 1 4 5 q-1 4 2 6 q-5 1 -7 -4 z" fill="#7CC576"/>` + elip(a + 4, b - 1, 1.8, 3, '#7CC576', sinBorde),
    Marte: (a, b, r) => circ(a, b, r, '#D8643A', { 'stroke-width': 2 }),
    Júpiter: (a, b, r) => {
      let q = `<clipPath id="${x.id('jp')}"><circle cx="${a}" cy="${b}" r="${r}"/></clipPath>`;
      q += circ(a, b, r, '#E9C49A', sinBorde);
      q += `<g clip-path="url(#${x.id('jp')})"><rect x="${a - r}" y="${b - 9}" width="${2 * r}" height="4" fill="#C98A5B"/><rect x="${a - r}" y="${b + 1}" width="${2 * r}" height="5" fill="#C98A5B"/><rect x="${a - r}" y="${b + 10}" width="${2 * r}" height="3" fill="#D9A574"/></g>`;
      q += elip(a + 6, b + 5, 3.5, 2.2, '#C8553D', { stroke: 'none' });
      return q + circ(a, b, r, 'none');
    },
    Saturno: (a, b, r) => {
      const atras = `<path d="M${a - 2.1 * r} ${b} A${2.1 * r} ${0.55 * r} 0 0 1 ${a + 2.1 * r} ${b}" fill="none" stroke="${T}" stroke-width="7"/><path d="M${a - 2.1 * r} ${b} A${2.1 * r} ${0.55 * r} 0 0 1 ${a + 2.1 * r} ${b}" fill="none" stroke="#D9BF7F" stroke-width="3.5"/>`;
      const delante = `<path d="M${a - 2.1 * r} ${b} A${2.1 * r} ${0.55 * r} 0 0 0 ${a + 2.1 * r} ${b}" fill="none" stroke="${T}" stroke-width="7"/><path d="M${a - 2.1 * r} ${b} A${2.1 * r} ${0.55 * r} 0 0 0 ${a + 2.1 * r} ${b}" fill="none" stroke="#D9BF7F" stroke-width="3.5"/>`;
      return `<g transform="rotate(-12 ${a} ${b})">${atras}${circ(a, b, r, '#EBD08F')}${delante}</g>`;
    },
    Urano: (a, b, r) => circ(a, b, r, '#9EDCE6'),
    Neptuno: (a, b, r) => circ(a, b, r, '#4B74D8') + elip(a - 3, b - 3, 3, 2, '#6F95E8', sinBorde),
  };
  planetas.forEach(([nombre, , r, lado], i) => {
    const [px, py] = pos[i];
    s += dib[nombre](px, py, r);
    const extra = nombre === 'Saturno' ? 2.1 * r - r + 2 : 0;
    if (lado === 'izq') x.et(nombre, px - r - 9 - extra, py, null, null, { anchor: 'end', color: '#FFFFFF', halo: C.noche2 });
    else x.et(nombre, px + r + 9 + extra, py, null, null, { anchor: 'start', color: '#FFFFFF', halo: C.noche2 });
  });
  x.et('Sol', sx, 17, null, null, { color: T, halo: C.sol });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo del Sol y los planetas, cada uno en su órbita.' };
}

// Las fases van en círculo (como los otros ciclos): arriba nueva → creciente,
// abajo llena ← menguante, con flechas que vuelven a empezar. Así los nombres
// caben a 16 px y queda claro que se repite.
function fasesLuna(x) {
  const W = 320;
  const H = 262;
  let s = rect(3, 3, W - 6, H - 6, 18, C.noche, sinBorde);
  s += estrellas([[18, 20, 1.3], [302, 18, 1.3], [160, 22, 1.2], [160, 142, 1.1], [24, 246, 1.2], [298, 244, 1.2], [160, 250, 1.1]]);
  const r = 30;
  const pos = [[82, 56], [238, 56], [238, 172], [82, 172]];
  const nombres = ['luna\nnueva', 'cuarto\ncreciente', 'luna\nllena', 'cuarto\nmenguante'];
  // Vista desde el hemisferio sur (Bolivia): en cuarto creciente se ilumina el lado izquierdo.
  const iluminado = [
    null,
    (cx, cy) => `M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} Z`,
    (cx, cy) => `M${cx} ${cy - r} A${r} ${r} 0 1 0 ${cx} ${cy + r} A${r} ${r} 0 1 0 ${cx} ${cy - r} Z`,
    (cx, cy) => `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z`,
  ];
  pos.forEach(([cx, cy], i) => {
    s += circ(cx, cy, r, '#3E4775', { stroke: '#8F9AC8', 'stroke-width': 2.5 });
    if (iluminado[i]) {
      const cid = x.id(`l${i}`);
      const d = iluminado[i](cx, cy);
      x.defs.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
      s += `<g clip-path="url(#${cid})">${circ(cx, cy, r, '#F6EFC8', sinBorde)}${circ(cx - 10, cy - 9, 6, '#E4D9A6', sinBorde)}${circ(cx + 9, cy + 10, 7, '#E4D9A6', sinBorde)}${circ(cx + 12, cy - 11, 3.5, '#E4D9A6', sinBorde)}${circ(cx - 9, cy + 14, 3.5, '#E4D9A6', sinBorde)}</g>`;
      s += `<path d="${d}" fill="none" stroke="#F6EFC8" stroke-width="1"/>`;
    }
    s += circ(cx, cy, r, 'none', { stroke: i === 0 ? '#8F9AC8' : '#C9C2A0', 'stroke-width': 2.5 });
    x.et(nombres[i], cx, cy + r + 24, null, null, { color: '#FFFFFF', halo: C.noche2 });
  });
  const naranja = '#FFB84D';
  s += x.flecha('M122 56 L196 56', naranja, 3.5, 12);
  s += x.flecha('M292 88 Q306 114 290 140', naranja, 3.5, 12);
  s += x.flecha('M196 172 L124 172', naranja, 3.5, 12);
  s += x.flecha('M28 140 Q14 114 30 88', naranja, 3.5, 12);
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de cuatro formas en que vemos la Luna en distintas noches, unidas por flechas en círculo.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: el cuerpo humano
// ---------------------------------------------------------------------------

// Hueso largo con extremos redondeados.
function hueso(x1, y1, x2, y2, grosor = 8, nudo = 1.5) {
  const r = grosor * 0.5 * nudo;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  const nx = (-dy / L) * r * 0.55;
  const ny = (dx / L) * r * 0.55;
  const ext = [[x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny]];
  const d = `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`;
  let s = `<path d="${d}" stroke="${T}" stroke-width="${f(grosor + 5)}" fill="none"/>`;
  s += ext.map(([a, b]) => `<circle cx="${f(a)}" cy="${f(b)}" r="${f(r + 2.5)}" fill="${T}"/>`).join('');
  s += `<path d="${d}" stroke="${C.hueso}" stroke-width="${f(grosor)}" fill="none"/>`;
  s += ext.map(([a, b]) => `<circle cx="${f(a)}" cy="${f(b)}" r="${f(r)}" fill="${C.hueso}"/>`).join('');
  return s;
}

function esqueleto(x) {
  const W = 320;
  const H = 356;
  const fondo = rect(3, 3, W - 6, H - 6, 18, '#EEF3FA', sinBorde);
  let s = '';
  // costillas
  const niveles = [[98, 28], [109, 36], [120, 41], [131, 43], [142, 42], [153, 38]];
  let cost = '';
  const dsCost = [];
  for (const [y, w] of niveles) {
    dsCost.push(`M167 ${y} C${f(167 + 0.55 * w)} ${y - 5} ${f(167 + w)} ${y} ${f(167 + w)} ${y + 15}`);
    dsCost.push(`M153 ${y} C${f(153 - 0.55 * w)} ${y - 5} ${f(153 - w)} ${y} ${f(153 - w)} ${y + 15}`);
  }
  cost += tubos(dsCost, C.hueso, 4.2, 2.3);
  s += x.parte('costillas', cost);

  // clavículas (sin nombre en el catálogo)
  s += hueso(166, 88, 200, 84, 5, 1.3) + hueso(154, 88, 120, 84, 5, 1.3);

  // brazos
  let brazos = '';
  for (const lado of [1, -1]) {
    const X = (v) => 160 + lado * v;
    brazos += hueso(X(44), 88, X(54), 148, 8);
    brazos += hueso(X(55), 154, X(59), 204, 4.5, 1.2) + hueso(X(62), 152, X(67), 202, 4.5, 1.2);
    brazos += elip(X(64), 214, 8, 9, C.hueso, { 'stroke-width': 2.3 });
    for (const k of [-5, -1.5, 2, 5.5]) brazos += tubos([`M${f(X(64 + k * lado))} 220 L${f(X(64 + k * 1.2 * lado))} 234`], C.hueso, 2.4, 1.8);
    brazos += tubos([`M${f(X(57))} 212 L${f(X(52))} 224`], C.hueso, 2.4, 1.8);
  }
  s += x.parte('brazo', brazos);

  // piernas
  let piernas = '';
  for (const lado of [1, -1]) {
    const X = (v) => 160 + lado * v;
    piernas += hueso(X(18), 210, X(21), 274, 10);
    piernas += circ(X(21), 281, 5.5, C.hueso, { 'stroke-width': 2.2 });
    piernas += hueso(X(18), 290, X(19), 336, 6, 1.3) + hueso(X(26), 291, X(27), 334, 3.8, 1.2);
    piernas += cam(`M${X(12)} 340 Q${X(14)} 334 ${X(24)} 335 L${X(40)} 340 Q${X(44)} 345 ${X(38)} 347 L${X(14)} 347 Q${X(10)} 346 ${X(12)} 340Z`, C.hueso, { 'stroke-width': 2.3 });
  }
  s += x.parte('pierna', piernas);

  // pelvis
  let pelvis = cam('M160 186 C150 180 128 176 120 186 C112 198 118 214 134 222 C144 227 152 222 160 226 C168 222 176 227 186 222 C202 214 208 198 200 186 C192 176 170 180 160 186 Z', C.hueso);
  pelvis += elip(143, 212, 6, 5, '#EEF3FA', { 'stroke-width': 2 }) + elip(177, 212, 6, 5, '#EEF3FA', { 'stroke-width': 2 });
  pelvis += cam('M152 188 L168 188 L164 206 L156 206 Z', '#F4EAD2', { 'stroke-width': 2 });
  s += x.parte('pelvis', pelvis);

  // columna
  let col = '';
  for (let i = 0; i < 13; i++) {
    const y = 75 + 9 * i;
    const w = i < 3 ? 12 : 14 + Math.min(4, i * 0.4);
    col += rect(160 - w / 2, y, w, 6.8, 3, C.hueso, { 'stroke-width': 2 });
  }
  s += x.parte('columna', col);

  // cráneo
  let craneo = cam('M145 46 Q147 68 160 71 Q173 68 175 46 Z', C.hueso);
  craneo += elip(160, 31, 25, 25, C.hueso);
  craneo += elip(150, 32, 6.2, 7, '#C8D2E6', { 'stroke-width': 2 }) + elip(170, 32, 6.2, 7, '#C8D2E6', { 'stroke-width': 2 });
  craneo += cam('M160 41 L156 48 L164 48 Z', '#C8D2E6', { 'stroke-width': 1.8 });
  craneo += cam('M151 58 L169 58 M155 55 L155 62 M160 55 L160 63 M165 55 L165 62', 'none', { 'stroke-width': 1.6 });
  s += x.parte('craneo', craneo);

  x.et('cráneo', 94, 30, 135, 30, { anchor: 'end' });
  x.et('brazo', 76, 128, 111, 128, { anchor: 'end' });
  x.et('pierna', 94, 306, 140, 306, { anchor: 'end' });
  x.et('columna', 234, 64, 166, 78, { anchor: 'start' });
  x.et('costillas', 238, 138, 190, 133, { anchor: 'start' });
  x.et('pelvis', 238, 190, 196, 194, { anchor: 'start' });
  return { w: W, h: H, maxw: 340, fondo, cuerpo: s, aria: 'Dibujo de los huesos del cuerpo humano, de frente.' };
}

function aparatoDigestivo(x) {
  const W = 320;
  const H = 340;
  let s = rect(3, 3, W - 6, H - 6, 18, '#EEF3FA', sinBorde);
  // cuerpo (contexto)
  let cuerpo = cam('M146 96 L174 96 L174 108 C196 112 222 116 232 132 L228 334 L92 334 L88 132 C98 116 124 112 146 108 Z', '#FBE6D4');
  cuerpo += circ(124, 52, 7, '#E9C3A2') + circ(196, 52, 7, '#E9C3A2');
  cuerpo += circ(160, 52, 36, '#F2CFB0');
  cuerpo += cam('M125 46 C120 2 200 2 195 46 C188 30 174 24 160 28 C146 24 132 30 125 46 Z', C.pelo, { 'stroke-width': 2 });
  cuerpo += circ(147, 50, 3.2, T, sinBorde) + circ(173, 50, 3.2, T, sinBorde);
  cuerpo += cam('M158 56 Q160 62 162 56', 'none', { 'stroke-width': 2 });
  s += cuerpo;
  const fondo = s;
  s = '';

  let boca = cam('M146 68 Q160 84 174 68 Q160 72 146 68 Z', '#B8414B', { 'stroke-width': 2.2 });
  boca += elip(160, 76, 6, 3, '#F08A9A', sinBorde);
  s += x.parte('boca', boca);

  // intestino delgado (debajo del grueso)
  const delgado = 'M168 200 C150 204 136 214 146 224 C158 234 186 226 188 238 C190 250 146 244 140 254 C134 264 186 258 188 270 C190 282 146 276 140 286 C136 294 150 298 162 292 C170 288 176 290 172 296 C168 302 150 300 132 296';
  s += x.parte('intestino-delgado', tubos([delgado], '#F7C6A8', 8, 2.3));

  // intestino grueso: sube por la derecha de la persona (izquierda del dibujo),
  // cruza arriba y baja por la izquierda hasta el recto
  const grueso = 'M120 296 L118 214 Q118 206 128 206 L194 206 Q204 206 204 216 L205 290 Q205 306 180 308 Q166 310 164 322';
  let g2 = tubos([grueso], '#E8A57A', 13, 2.5);
  for (const [a, b, c2, d] of [[112, 240, 124, 240], [112, 270, 124, 270], [150, 200, 150, 212], [178, 200, 178, 212], [199, 236, 211, 236], [199, 266, 211, 266]]) {
    g2 += lin(a, b, c2, d, { stroke: '#C98262', 'stroke-width': 2 });
  }
  s += x.parte('intestino-grueso', g2);

  // esófago
  s += x.parte('esofago', tubos(['M160 82 C160 108 161 132 165 150 L170 160'], '#F2A99E', 7, 2.3));

  // estómago (lado izquierdo de la persona = derecha del dibujo)
  const est = 'M166 158 C170 148 192 146 204 158 C218 172 214 196 196 202 C182 206 166 202 160 196 C154 190 160 182 168 186 C178 190 188 186 188 176 C188 168 178 168 172 166 Z';
  s += x.parte('estomago', cam(est, '#F4A09C') + cam('M178 160 Q196 164 200 184', 'none', { stroke: '#D9807B', 'stroke-width': 2 }));

  x.et('boca', 90, 74, 146, 72, { anchor: 'end' });
  x.et('esófago', 90, 126, 158, 126, { anchor: 'end' });
  x.et('intestino\ngrueso', 84, 246, 112, 246, { anchor: 'end' });
  x.et('estómago', 238, 172, 212, 172, { anchor: 'start' });
  x.et('intestino\ndelgado', 238, 262, 186, 264, { anchor: 'start' });
  return { w: W, h: H, maxw: 340, fondo, cuerpo: s, aria: 'Dibujo del camino de la comida dentro del cuerpo de un niño.' };
}

function sentidos(x) {
  const W = 320;
  const H = 256;
  let s = rect(3, 3, W - 6, H - 6, 18, '#FFF3E4', sinBorde);
  const piel = C.piel;
  // hombros y brazo
  let base = cam('M84 253 C86 222 112 206 150 206 C188 206 214 222 216 253 Z', '#6CB6D9');
  base += tubos(['M206 226 C224 218 240 206 252 186'], piel, 14, 2.5);
  base += rect(140, 188, 22, 22, 6, piel);
  base += elip(151, 122, 58, 68, piel);
  base += cam('M93 118 C88 56 118 44 151 44 C186 44 216 58 209 118 C204 92 190 76 170 72 C150 82 120 80 106 86 C98 94 96 106 93 118 Z', C.pelo);
  base += cam('M121 98 Q131 92 141 98 M161 98 Q171 92 181 98', 'none', { stroke: C.pelo, 'stroke-width': 3.5 });
  s += base;
  const fondo = s;
  s = '';

  let ojos = '';
  for (const ox of [131, 171]) ojos += elip(ox, 114, 11, 8.5, '#FFFFFF') + circ(ox, 114, 5.5, '#5A3A22', { stroke: 'none' }) + circ(ox, 114, 2.6, T, sinBorde) + circ(ox + 2, 112, 1.3, '#FFFFFF', sinBorde);
  s += x.parte('vista', ojos);

  // Las orejas van detrás de la cara: se recortan fuera del óvalo de la cara
  // (con su borde), así no tapan el contorno aunque se dibujen después.
  const co = x.id('orejas');
  x.defs.push(`<clipPath id="${co}"><path clip-rule="evenodd" d="M0 0H${W}V${H}H0Z M${f(151 - 59.3)} 122 a59.3 69.3 0 1 0 118.6 0 a59.3 69.3 0 1 0 -118.6 0Z"/></clipPath>`);
  let orejas = '';
  for (const lado of [-1, 1]) {
    const ox = 151 + lado * 61;
    orejas += elip(ox, 124, 12, 17, piel) + cam(`M${ox + lado * 1} 115 Q${ox + lado * 7} 124 ${ox + lado * 1} 133`, 'none', { 'stroke-width': 2 });
  }
  s += x.parte('oido', `<g clip-path="url(#${co})">${orejas}</g>`);

  s += x.parte('olfato', cam('M151 118 C149 130 142 138 145 143 C148 147 154 147 158 143 C160 139 153 130 151 118 Z', '#B77B51', { 'stroke-width': 2.2 }) + circ(147.5, 142, 1.6, T, sinBorde) + circ(155.5, 142, 1.6, T, sinBorde));

  s += x.parte('gusto', cam('M133 158 Q151 184 169 158 Q151 164 133 158 Z', '#9E3B3B', { 'stroke-width': 2.2 }) + cam('M142 170 Q151 164 160 170 Q151 180 142 170 Z', '#F08A9A', { stroke: 'none' }));

  // mano abierta (tacto)
  let mano = '';
  for (const [a, b, c2, d] of [[246, 166, 244, 142], [255, 164, 255, 136], [264, 165, 266, 139], [272, 170, 277, 148]]) {
    mano += tubos([`M${a} ${b} L${c2} ${d}`], piel, 8, 2.5);
  }
  mano += tubos(['M242 184 L230 172'], piel, 8.5, 2.5);
  mano += cam('M240 166 Q258 158 276 168 L276 186 Q272 200 256 200 Q240 200 238 186 Z', piel, { 'stroke-width': 2.5 });
  mano += `<path d="M242 166 Q258 160 274 169 L274 186 Q270 198 256 198 Q242 198 240 186 Z" fill="${piel}"/>`;
  mano += cam('M250 184 Q256 188 264 184', 'none', { stroke: '#9E6A45', 'stroke-width': 1.6 });
  s += x.parte('tacto', mano);

  x.et('vista', 60, 58, 124, 108, { anchor: 'middle' });
  x.et('olfato', 60, 150, 144, 140, { anchor: 'middle' });
  x.et('gusto', 60, 196, 138, 166, { anchor: 'middle' });
  x.et('oído', 268, 64, 217, 120, { anchor: 'middle' });
  x.et('tacto', 292, 226, 264, 196, { anchor: 'middle' });
  return { w: W, h: H, fondo, cuerpo: s, aria: 'Dibujo de la cara de un niño y su mano, con las partes con las que sentimos.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS SOCIALES: paisajes de Bolivia
// ---------------------------------------------------------------------------

function llama(x, y, s = 1, lana = '#FFFFFF', mira = 1, borla = '#E0247A') {
  // x,y = patas en el suelo (centro del cuerpo). mira: 1 derecha, -1 izquierda
  const p = [];
  const X = (v) => f(x + v * s * mira);
  const Y = (v) => f(y + v * s);
  p.push(tubos([`M${X(-14)} ${Y(-20)} L${X(-15)} ${Y(0)}`, `M${X(-6)} ${Y(-20)} L${X(-5)} ${Y(0)}`, `M${X(8)} ${Y(-20)} L${X(8)} ${Y(0)}`, `M${X(15)} ${Y(-20)} L${X(16)} ${Y(0)}`], lana, 3.5 * s, 2));
  p.push(mancha([[x, y - 26 * s, 21 * s, 11 * s], [x + 14 * mira * s, y - 30 * s, 9 * s]], lana, { sw: 2 }));
  p.push(tubos([`M${X(15)} ${Y(-30)} L${X(20)} ${Y(-54)}`], lana, 9 * s, 2));
  p.push(mancha([[x + 24 * mira * s, y - 57 * s, 8 * s, 5.5 * s], [x + 20 * mira * s, y - 58 * s, 6 * s]], lana, { sw: 2 }));
  p.push(cam(`M${X(17)} ${Y(-62)} L${X(15)} ${Y(-72)} L${X(20)} ${Y(-63)}`, lana, { 'stroke-width': 2 }));
  p.push(cam(`M${X(21)} ${Y(-63)} L${X(21)} ${Y(-73)} L${X(24)} ${Y(-63)}`, lana, { 'stroke-width': 2 }));
  p.push(circ(x + 15 * mira * s, y - 68 * s, 2.4 * s, borla, sinBorde));
  p.push(circ(x + 22 * mira * s, y - 58 * s, 1.5 * s, T, sinBorde));
  p.push(cam(`M${X(-20)} ${Y(-30)} q${f(-5 * s * mira)} ${f(2 * s)} ${f(-4 * s * mira)} ${f(8 * s)}`, 'none', { 'stroke-width': 2 }));
  return p.join('');
}

function paisajeAltiplano() {
  const W = 320;
  const H = 210;
  let s = rect(3, 3, W - 6, H - 6, 18, '#BFE2F7', sinBorde);
  s += sol(270, 32, 13, 10, 0.45);
  s += nube(70, 30, 0.6, '#FFFFFF');
  // cordillera nevada al fondo
  s += cam('M3 112 L34 80 L56 94 L92 50 L124 88 L150 72 L186 38 L222 82 L246 68 L280 96 L317 74 L317 112 Z', '#9C95BC');
  s += cam('M92 50 L104 64 L98 62 L92 70 L86 63 L80 64 Z', '#FFFFFF', { 'stroke-width': 2 });
  s += cam('M186 38 L200 55 L193 53 L187 61 L180 54 L172 56 Z', '#FFFFFF', { 'stroke-width': 2 });
  s += cam('M246 68 L256 78 L250 77 L245 82 L240 77 L236 78 Z', '#FFFFFF', { 'stroke-width': 2 });
  s += cam('M34 80 L42 88 L37 87 L33 91 L29 87 L26 88 Z', '#FFFFFF', { 'stroke-width': 2 });
  // planicie
  s += `<path d="M3 110 L317 110 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z" fill="#E6CF97"/>`;
  s += lin(3, 110, 317, 110);
  s += `<path d="M3 150 Q120 142 317 152 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z" fill="#D9BD7E"/>`;
  // lago
  s += cam('M20 122 Q60 112 150 116 Q196 120 180 130 Q150 138 60 136 Q14 132 20 122 Z', '#5FB3E4');
  s += cam('M50 125 q10 -3 20 0 M104 128 q10 -3 20 0', 'none', { stroke: '#FFFFFF', 'stroke-width': 2 });
  // casita de adobe con techo de paja
  s += rect(40, 150, 40, 26, 2, '#C98F5A');
  s += cam('M34 152 L60 132 L86 152 Z', '#E2C064');
  s += rect(54, 160, 11, 16, 2, '#6E4A33', { 'stroke-width': 2 });
  // paja brava
  for (const [a, b] of [[110, 170], [140, 188], [196, 160], [24, 190], [300, 186], [262, 198], [104, 148]]) {
    s += cam(`M${a - 7} ${b} L${a - 4} ${b - 10} M${a - 2} ${b} L${a} ${b - 13} M${a + 3} ${b} L${a + 6} ${b - 10}`, 'none', { stroke: '#B8923E', 'stroke-width': 2.2 });
  }
  // llamas
  s += llama(284, 168, 0.8, '#B07A4E', -1, '#F7A531') + llama(204, 188, 1, '#FFFFFF', 1, '#E0247A');
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de un paisaje de Bolivia.' };
}

function paisajeValle() {
  const W = 320;
  const H = 210;
  let s = rect(3, 3, W - 6, H - 6, 18, '#D9F0FB', sinBorde);
  s += sol(46, 36, 15, 10, 0.45);
  s += nube(230, 34, 0.65);
  // cerros del fondo
  s += cam('M3 96 Q40 56 90 78 Q130 40 180 72 Q230 44 270 70 Q300 60 317 72 L317 130 L3 130 Z', '#A9B97C');
  // cerros verdes con chacras
  s += cam('M3 124 Q70 90 150 112 Q230 86 317 110 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z', '#8CC46A');
  s += pol('28,128 76,112 98,126 50,140', '#C9DB6A', { 'stroke-width': 2 });
  s += pol('104,122 148,116 160,130 116,138', '#E7C766', { 'stroke-width': 2 });
  s += pol('214,106 262,100 278,112 232,120', '#C9DB6A', { 'stroke-width': 2 });
  s += pol('240,124 290,116 300,130 256,138', '#6FB35A', { 'stroke-width': 2 });
  s += cam('M36 132 L84 118 M44 136 L92 122 M112 128 L152 122 M116 133 L156 127 M222 110 L268 104 M228 115 L274 109', 'none', { stroke: '#7D8F3F', 'stroke-width': 1.5, opacity: 0.7 });
  // río que serpentea
  s += `<path d="M168 118 C150 132 196 140 170 154 C140 170 200 178 160 207 L110 207 C150 182 106 170 140 154 C164 142 132 132 160 118 Z" fill="${C.agua}" stroke="${T}" stroke-width="2.5"/>`;
  s += cam('M160 150 q6 -2 10 1 M142 178 q6 -2 10 1', 'none', { stroke: '#FFFFFF', 'stroke-width': 2 });
  // árboles y casas con techo de teja
  s += arbol(60, 176, 0.9, '#5DAE5B') + arbol(92, 190, 0.7, '#74BE62') + arbol(250, 186, 0.95, '#5DAE5B') + arbol(286, 172, 0.7, '#74BE62');
  s += rect(196, 150, 34, 22, 2, '#F4E3C3') + cam('M190 152 L213 136 L236 152 Z', '#D0643F') + rect(207, 158, 9, 14, 1.5, '#8D5B3B', { 'stroke-width': 2 });
  s += rect(24, 146, 26, 18, 2, '#F4E3C3') + cam('M19 148 L37 134 L55 148 Z', '#D0643F');
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de un paisaje de Bolivia.' };
}

function palmera(x, y, s = 1, alto = 64) {
  let r = tubos([`M${f(x)} ${f(y)} C${f(x - 4 * s)} ${f(y - alto * 0.4 * s)} ${f(x + 6 * s)} ${f(y - alto * 0.7 * s)} ${f(x + 2 * s)} ${f(y - alto * s)}`], '#A67C52', 6 * s, 2.2);
  const tx = x + 2 * s;
  const ty = y - alto * s;
  for (const [ang, L] of [[-160, 30], [-130, 28], [-95, 22], [-55, 28], [-20, 30], [160 + 30, 24], [15, 24]]) {
    const ex = tx + Math.cos(rad(ang)) * L * s;
    const ey = ty + Math.sin(rad(ang)) * L * s;
    const mx = tx + Math.cos(rad(ang)) * L * 0.5 * s;
    const my = ty + Math.sin(rad(ang)) * L * 0.5 * s - 8 * s;
    r += tubos([`M${f(tx)} ${f(ty)} Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey + 6 * s)}`], '#4FA65A', 5 * s, 2);
  }
  return r;
}

function paisajeLlanos() {
  const W = 320;
  const H = 210;
  let s = rect(3, 3, W - 6, H - 6, 18, '#CDEBF8', sinBorde);
  s += nube(80, 36, 0.8) + nube(236, 28, 0.6) + sol(290, 30, 12, 10, 0.4);
  // selva en el horizonte
  const selva = [];
  for (let i = 0; i < 12; i++) selva.push([10 + i * 28, 100 - (i % 3) * 6, 18 + (i % 2) * 5]);
  s += mancha(selva, '#3E8F4E');
  s += `<rect x="3" y="100" width="${W - 6}" height="12" fill="#3E8F4E"/>`;
  // pampa verde y plana
  s += `<path d="M3 106 L317 106 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z" fill="#A5D67A"/>`;
  s += lin(3, 106, 317, 106);
  // río ancho que serpentea
  s += `<path d="M120 106 C100 120 150 128 130 140 C100 156 190 170 150 207 L220 207 C250 170 160 158 190 140 C212 128 150 120 150 106 Z" fill="#8FC7D8" stroke="${T}" stroke-width="2.5"/>`;
  s += cam('M160 150 q8 -2 14 1 M176 184 q8 -2 14 1', 'none', { stroke: '#FFFFFF', 'stroke-width': 2 });
  // palmeras
  s += palmera(60, 186, 1.05, 72) + palmera(96, 170, 0.8, 70) + palmera(268, 190, 1, 76) + palmera(240, 160, 0.7, 64);
  for (const [a, b] of [[30, 150], [200, 130], [300, 140], [110, 196]]) s += pasto(a, b, 1, '#5E9F45');
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de un paisaje de Bolivia.' };
}

function paisajeChaco() {
  const W = 320;
  const H = 210;
  let s = rect(3, 3, W - 6, H - 6, 18, '#FBE7C0', sinBorde);
  s += circ(250, 44, 26, '#FFE58A', { stroke: 'none', opacity: 0.6 }) + sol(250, 44, 18, 12, 0.4);
  s += `<path d="M3 118 Q90 108 170 116 T317 112 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z" fill="#E3B26F"/>`;
  s += cam('M3 118 Q90 108 170 116 T317 112');
  s += `<path d="M3 158 Q120 148 317 160 L317 192 Q317 207 302 207 L18 207 Q3 207 3 192 Z" fill="#D69E5C"/>`;
  // grietas
  s += cam('M40 186 l10 -6 l8 4 l10 -5 M200 190 l8 -5 l9 3 l7 -6 M120 176 l6 4 l8 -3', 'none', { stroke: '#A8733F', 'stroke-width': 1.8 });
  // arbustos secos
  for (const [a, b, sc] of [[30, 124, 0.8], [124, 128, 0.7], [292, 126, 0.75], [180, 190, 0.9]]) {
    s += mancha([[a, b - 8 * sc, 16 * sc, 10 * sc], [a - 10 * sc, b - 4 * sc, 10 * sc], [a + 11 * sc, b - 4 * sc, 10 * sc]], '#A7A568');
  }
  // árbol espinoso de copa plana (algarrobo / quebracho)
  s += tubos(['M86 170 C88 150 84 136 90 120', 'M89 138 C80 128 70 124 62 122', 'M89 132 C98 124 110 120 118 118'], '#8A6444', 5, 2.2);
  s += mancha([[90, 112, 34, 9], [66, 116, 16, 7], [114, 114, 16, 7]], '#8E9A5A');
  s += cam('M72 130 l-4 -3 M104 124 l4 -3 M86 150 l-4 -2', 'none', { 'stroke-width': 1.6 });
  // toborochi: tronco verde, panzón y con espinas; copa ancha con flores rosadas
  s += tubos(['M218 98 C204 86 190 80 176 80', 'M218 96 C212 80 206 70 198 64', 'M218 96 C226 80 234 70 242 64', 'M218 98 C232 86 246 80 260 80'], '#6F8A55', 4, 2);
  s += mancha([[176, 76, 18, 9], [200, 62, 18, 10], [220, 58, 16, 9], [242, 62, 18, 10], [262, 76, 18, 9], [218, 72, 30, 10]], '#8DB26A');
  for (const [a2, b2] of [[168, 74], [184, 80], [194, 60], [206, 66], [220, 54], [232, 66], [246, 58], [258, 72], [272, 78], [216, 74]]) {
    s += circ(a2, b2, 3.2, '#F29CB0', { 'stroke-width': 1.2 }) + circ(a2, b2, 1, '#FFFFFF', sinBorde);
  }
  s += cam('M206 182 C196 170 192 146 200 128 C206 116 212 108 213 96 L223 96 C224 108 230 116 236 128 C244 146 240 170 230 182 Z', '#A9C58A');
  s += cam('M207 150 Q210 138 214 130', 'none', { stroke: '#C9DEB0', 'stroke-width': 3 });
  for (const [a2, b2, l] of [[200, 140, -1], [238, 146, 1], [203, 164, -1], [236, 166, 1], [212, 112, -1], [226, 118, 1]]) {
    s += `<path d="M${a2} ${b2 - 3} L${a2 + l * 5} ${b2} L${a2} ${b2 + 3}" fill="#7A5A3E" stroke="${T}" stroke-width="1"/>`;
  }
  // cactus
  s += tubos(['M284 182 L284 140', 'M284 164 C272 164 270 158 270 148', 'M284 158 C296 158 298 152 298 144'], '#7FA36B', 9, 2.4);
  s += cam('M281 150 l-4 -2 M287 170 l4 -2 M270 152 l-4 0 M298 148 l4 0', 'none', { 'stroke-width': 1.4 });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de un paisaje de Bolivia.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: estaciones del año (hemisferio sur, Bolivia)
// ---------------------------------------------------------------------------

function ninoChullo(x, y) {
  // niño con chamarra, bufanda y chullo; x = centro, y = pies
  let s = '';
  s += tubos([`M${x - 5} ${y - 16} L${x - 6} ${y - 2}`, `M${x + 5} ${y - 16} L${x + 6} ${y - 2}`], '#4A4E69', 5, 2);
  s += elip(x - 7, y - 1, 5, 3, T, sinBorde) + elip(x + 7, y - 1, 5, 3, T, sinBorde);
  s += cam(`M${x - 12} ${y - 14} Q${x - 13} ${y - 36} ${x} ${y - 38} Q${x + 13} ${y - 36} ${x + 12} ${y - 14} Z`, '#3C7BD6');
  s += tubos([`M${x - 11} ${y - 32} L${x - 16} ${y - 20}`, `M${x + 11} ${y - 32} L${x + 16} ${y - 20}`], '#3C7BD6', 5, 2);
  s += lin(x, y - 36, x, y - 16, { 'stroke-width': 1.6 });
  s += circ(x, y - 48, 10, C.piel, { 'stroke-width': 2.2 });
  s += circ(x - 3.5, y - 47, 1.3, T, sinBorde) + circ(x + 3.5, y - 47, 1.3, T, sinBorde);
  // chullo con orejeras y pompón
  s += cam(`M${x - 11} ${y - 49} Q${x - 11} ${y - 62} ${x} ${y - 62} Q${x + 11} ${y - 62} ${x + 11} ${y - 49} L${x + 10} ${y - 42} L${x + 7} ${y - 49} L${x - 7} ${y - 49} L${x - 10} ${y - 42} Z`, '#E4572E', { 'stroke-width': 2 });
  s += lin(x - 10, y - 54, x + 10, y - 54, { stroke: C.sol, 'stroke-width': 2.5 });
  s += circ(x, y - 64, 3.5, C.sol, { 'stroke-width': 1.8 });
  // bufanda
  s += rect(x - 9, y - 40, 18, 5, 2.5, '#F7A531', { 'stroke-width': 1.8 }) + rect(x + 3, y - 37, 5, 10, 2, '#F7A531', { 'stroke-width': 1.8 });
  return s;
}

function estaciones(x) {
  const W = 320;
  const H = 276;
  const PW = 146;
  const PH = 124;
  const pos = { verano: [9, 9], otono: [165, 9], invierno: [9, 143], primavera: [165, 143] };
  const nombres = { verano: 'verano', otono: 'otoño', invierno: 'invierno', primavera: 'primavera' };
  const dib = {
    verano: () => {
      let s = rect(0, 0, PW, PH, 0, '#D6EAF5', sinBorde);
      s += sol(36, 30, 14, 9, 0.5);
      s += nube(78, 34, 0.85, '#E3E7F0');
      for (const [a, b] of [[56, 60], [70, 68], [82, 58], [62, 82], [76, 88]]) s += gota(a, b, 0.8);
      s += `<rect x="0" y="94" width="${PW}" height="32" fill="#8CCB63"/>` + lin(0, 94, PW, 94);
      s += elip(30, 104, 18, 4.5, C.agua, { 'stroke-width': 2 });
      s += arbol(115, 100, 0.95, '#4FA65A');
      s += pasto(66, 104) + pasto(100, 104, 0.8);
      return s;
    },
    otono: () => {
      let s = rect(0, 0, PW, PH, 0, '#FBEBD3', sinBorde);
      s += `<rect x="0" y="94" width="${PW}" height="32" fill="#D9C07A"/>` + lin(0, 94, PW, 94);
      s += arbol(56, 100, 1.1, '#F2A541');
      s += circ(46, 52, 3, '#E27D3A', sinBorde) + circ(66, 60, 3, '#E27D3A', sinBorde) + circ(52, 70, 3, '#E27D3A', sinBorde);
      for (const [a, b, ang, col] of [[104, 40, 30, '#E27D3A'], [122, 62, -20, '#F2C14E'], [96, 76, 60, '#D9622B'], [132, 88, 10, '#E27D3A'], [100, 104, -30, '#F2C14E'], [120, 112, 40, '#D9622B'], [26, 110, 20, '#E27D3A']]) {
        s += hoja(a, b, 13, ang, col, 0.45, false);
      }
      s += cam('M92 28 q12 -6 24 0 q12 6 24 0 M100 50 q10 -5 20 0', 'none', { stroke: '#B9A48A', 'stroke-width': 2 });
      return s;
    },
    invierno: () => {
      let s = rect(0, 0, PW, PH, 0, '#BFE2F8', sinBorde);
      s += circ(126, 24, 10, '#FFF1B0', { stroke: '#E9C75A', 'stroke-width': 2 });
      s += cam('M40 94 L82 42 L100 62 L114 50 L152 94 Z', '#A99FC2');
      s += cam('M82 42 L92 55 L86 53 L81 58 L76 53 L72 55 Z', '#FFFFFF', { 'stroke-width': 2 });
      s += cam('M114 50 L121 59 L116 58 L113 61 L110 58 L107 59 Z', '#FFFFFF', { 'stroke-width': 2 });
      s += `<rect x="0" y="94" width="${PW}" height="32" fill="#E3CF95"/>` + lin(0, 94, PW, 94);
      s += tubos(['M122 118 L124 96', 'M123 102 L112 90', 'M123 100 L134 86', 'M112 90 L106 84', 'M134 86 L140 82'], '#8A6444', 3, 1.8);
      s += ninoChullo(26, 106);
      s += cam('M40 60 q6 -2 8 2 q2 4 8 2', 'none', { stroke: '#FFFFFF', 'stroke-width': 2.4 });
      return s;
    },
    primavera: () => {
      let s = rect(0, 0, PW, PH, 0, '#DFF3E6', sinBorde);
      s += sol(128, 24, 11, 9, 0.5);
      s += `<rect x="0" y="94" width="${PW}" height="32" fill="#9ED77A"/>` + lin(0, 94, PW, 94);
      s += arbol(52, 100, 1.1, '#F6A3C4');
      for (const [a, b] of [[40, 46], [58, 42], [66, 56], [44, 62], [32, 56], [54, 70], [70, 70]]) s += circ(a, b, 3, '#FFFFFF', { stroke: '#E0629A', 'stroke-width': 1.2 });
      for (const [a, b, col] of [[124, 104, '#F2C14E'], [140, 110, '#E4572E'], [14, 104, '#8E6CC8'], [28, 112, '#F2C14E']]) {
        s += lin(a, b, a, b + 8, { stroke: C.hojaO, 'stroke-width': 2 });
        s += mancha([[a - 3, b, 3], [a + 3, b, 3], [a, b - 3, 3], [a, b + 3, 3]], col, { sw: 1.2 }) + circ(a, b, 1.8, '#FFF4B8', sinBorde);
      }
      // mariposa
      s += `<g transform="translate(106 58) rotate(-15)">${elip(-5, -3, 6, 5, '#8E6CC8', { 'stroke-width': 1.6 })}${elip(5, -3, 6, 5, '#8E6CC8', { 'stroke-width': 1.6 })}${elip(-4, 4, 4, 3.5, '#B79BE3', { 'stroke-width': 1.6 })}${elip(4, 4, 4, 3.5, '#B79BE3', { 'stroke-width': 1.6 })}${lin(0, -6, 0, 7, { 'stroke-width': 2.2 })}</g>`;
      return s;
    },
  };
  let s = '';
  for (const k of ['verano', 'otono', 'invierno', 'primavera']) {
    const [px, py] = pos[k];
    const cid = x.id(`p-${k}`);
    x.defs.push(`<clipPath id="${cid}"><rect x="0" y="0" width="${PW}" height="${PH}" rx="14"/></clipPath>`);
    const panel = `<g clip-path="url(#${cid})">${dib[k]()}</g>${rect(0, 0, PW, PH, 14, 'none', { stroke: '#8C8799', 'stroke-width': 2 })}`;
    s += x.parte(k, panel, ` transform="translate(${px} ${py})"`);
    x.et(nombres[k], px + PW / 2, py + PH - 14, null, null, { pastilla: true });
  }
  return { w: W, h: H, cuerpo: s, aria: 'Cuatro dibujos del mismo lugar en distintas épocas del año.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: ciclos de vida de animales
// ---------------------------------------------------------------------------

function cicloCuatro(x, fondo, etapas, colorFlecha = '#1F7A70') {
  // etapas: [[dibujo(), nombre], ...] en orden; tarjetas en las 4 esquinas
  const TW = 134;
  const TH = 108;
  const pos = [[10, 8], [176, 8], [176, 150], [10, 150]];
  let s = '';
  etapas.forEach(([dibujo, nombre], i) => {
    const [px, py] = pos[i];
    s += tarjeta(px, py, TW, TH, fondo);
    const dy = x.conEtiquetas ? -10 : 0;
    s += tr(px + TW / 2, py + TH / 2 + dy, dibujo());
    x.et(nombre, px + TW / 2, py + TH - (nombre.includes('\n') ? 24 : 14), null, null);
  });
  s += x.flecha('M148 50 Q160 42 172 50', colorFlecha, 4, 13);
  s += x.flecha('M252 120 Q262 133 252 146', colorFlecha, 4, 13);
  s += x.flecha('M172 214 Q160 222 148 214', colorFlecha, 4, 13);
  s += x.flecha('M68 146 Q58 133 68 120', colorFlecha, 4, 13);
  return s;
}

const rana = {
  huevos: () => {
    let s = elip(0, 8, 46, 14, '#BFE3F2', { stroke: 'none' });
    const pts = [[-18, 0], [-6, -4], [6, -2], [18, 2], [-12, 10], [0, 8], [12, 11], [-24, 10], [24, 12], [-4, -14], [8, -12], [-16, -10]];
    for (const [a, b] of pts) s += circ(a, b, 6.5, '#EAF7F2', { 'stroke-width': 1.8, opacity: 0.95 });
    for (const [a, b] of pts) s += circ(a + 1, b + 1, 2.4, T, sinBorde);
    return s;
  },
  renacuajo: () => elip(0, 12, 46, 8, '#BFE3F2', sinBorde)
    + cam('M-4 0 C10 -10 24 6 40 -4 C30 10 14 12 -2 6 Z', '#6C7A4F', { 'stroke-width': 2.2 })
    + elip(-12, 1, 14, 10, '#4E5A38') + circ(-17, -2, 2.2, '#FFFFFF', sinBorde) + circ(-17, -2, 1, T, sinBorde),
  patas: () => elip(0, 14, 46, 8, '#BFE3F2', sinBorde)
    + cam('M0 0 C12 -8 22 4 34 -2 C26 8 14 10 2 6 Z', '#6C7A4F', { 'stroke-width': 2.2 })
    + tubos(['M2 6 L8 16 L14 16', 'M-4 7 L-6 17 L0 18'], '#6C7A4F', 3, 1.8)
    + elip(-12, 1, 15, 11, '#5E7040') + circ(-18, -3, 2.4, '#FFFFFF', sinBorde) + circ(-18, -3, 1.1, T, sinBorde)
    + tubos(['M-20 8 L-24 16'], '#6C7A4F', 2.6, 1.6),
  rana: () => {
    let s = elip(0, 18, 40, 9, '#7CC576', { 'stroke-width': 2 }) + cam('M0 18 L30 12', 'none', { 'stroke-width': 2 });
    s += cam('M-26 14 C-34 4 -24 -6 -14 0 L-10 10 Z', '#5DAE5B', { 'stroke-width': 2.2 });
    s += cam('M26 14 C34 4 24 -6 14 0 L10 10 Z', '#5DAE5B', { 'stroke-width': 2.2 });
    s += elip(0, 2, 22, 16, '#6CC06A');
    s += elip(0, 7, 13, 9, '#D6EFA8', { stroke: 'none' });
    s += circ(-10, -12, 7, '#6CC06A') + circ(10, -12, 7, '#6CC06A');
    s += circ(-10, -12, 3.5, '#FFFFFF', { 'stroke-width': 1.5 }) + circ(10, -12, 3.5, '#FFFFFF', { 'stroke-width': 1.5 });
    s += circ(-10, -12, 1.8, T, sinBorde) + circ(10, -12, 1.8, T, sinBorde);
    s += cam('M-9 -2 Q0 4 9 -2', 'none', { 'stroke-width': 2 });
    s += tubos(['M-8 14 L-12 20', 'M8 14 L12 20'], '#5DAE5B', 3, 1.8);
    return s;
  },
};

function cicloRana(x) {
  const s = cicloCuatro(x, '#EAF6FB', [[rana.huevos, 'huevos'], [rana.renacuajo, 'renacuajo'], [rana.patas, 'renacuajo\ncon patas'], [rana.rana, 'rana']]);
  return { w: 320, h: 266, cuerpo: s, aria: 'Dibujo del ciclo de vida de un animal, en etapas unidas por flechas.' };
}

const mariposa = {
  huevo: () => hoja(-38, 12, 76, -8, C.hoja, 0.34) + elip(4, 0, 6.5, 8.5, '#FFF2B8', { 'stroke-width': 2 }) + cam('M4 -8 L4 8 M0 -6 L1 7 M8 -6 L7 7', 'none', { stroke: '#D9C07A', 'stroke-width': 1 }),
  oruga: () => {
    let s = hoja(-40, 16, 80, -6, C.hojaC, 0.3, false);
    const seg = [[-22, 6], [-13, 3], [-4, 1], [5, 1], [14, 3], [22, 1]];
    seg.forEach(([a, b], i) => {
      s += circ(a, b, 6.5, i % 2 ? '#F6F1DE' : '#9ACD5A', { 'stroke-width': 2 });
      s += lin(a, b - 6, a, b + 6, { stroke: T, 'stroke-width': 2.4 });
    });
    s += circ(29, -3, 7.5, '#2B2A33') + circ(31, -4, 1.6, '#FFFFFF', sinBorde);
    s += cam('M30 -10 Q30 -18 36 -18 M26 -10 Q24 -18 20 -18', 'none', { 'stroke-width': 2 });
    return s;
  },
  crisalida: () => tubos(['M-40 -30 L40 -30'], '#8A6444', 4, 2)
    + lin(0, -28, 0, -22, { 'stroke-width': 2 })
    + cam('M0 -22 C12 -18 14 4 8 16 C5 22 -5 22 -8 16 C-14 4 -12 -18 0 -22 Z', '#7FCB9A')
    + cam('M-10 -4 Q0 0 10 -4', 'none', { stroke: '#D9A930', 'stroke-width': 2.2 })
    + circ(-4, 8, 1.6, '#D9A930', sinBorde) + circ(4, 8, 1.6, '#D9A930', sinBorde) + circ(0, -14, 1.6, '#D9A930', sinBorde),
  mariposa: () => {
    let s = '';
    for (const l of [-1, 1]) {
      s += cam(`M0 -4 C${l * 14} -26 ${l * 40} -26 ${l * 38} -8 C${l * 36} 2 ${l * 16} 2 0 0 Z`, '#F28C28');
      s += cam(`M0 2 C${l * 14} 2 ${l * 30} 6 ${l * 26} 18 C${l * 22} 26 ${l * 8} 20 0 6 Z`, '#F7A531');
      s += cam(`M${l * 4} -4 C${l * 14} -14 ${l * 26} -18 ${l * 34} -12 M${l * 4} 4 C${l * 12} 8 ${l * 18} 12 ${l * 22} 16`, 'none', { 'stroke-width': 1.6 });
      s += circ(l * 32, -16, 2.2, '#FFFFFF', sinBorde) + circ(l * 36, -10, 1.8, '#FFFFFF', sinBorde) + circ(l * 22, 18, 1.8, '#FFFFFF', sinBorde);
    }
    s += elip(0, 2, 3.5, 14, T, sinBorde);
    s += cam('M-1 -11 Q-6 -22 -10 -24 M1 -11 Q6 -22 10 -24', 'none', { 'stroke-width': 1.8 });
    return s;
  },
};

function cicloMariposa(x) {
  const s = cicloCuatro(x, '#F3FAEE', [[mariposa.huevo, 'huevo'], [mariposa.oruga, 'oruga'], [mariposa.crisalida, 'crisálida'], [mariposa.mariposa, 'mariposa']]);
  return { w: 320, h: 266, cuerpo: s, aria: 'Dibujo del ciclo de vida de un animal, en etapas unidas por flechas.' };
}

function nido(y = 12) {
  let s = elip(0, y, 34, 11, '#C99A5B');
  s += cam(`M-30 ${y - 2} q10 6 20 0 q10 6 20 0 q10 6 20 0 M-26 ${y + 5} q10 5 20 0 q10 5 20 0 q10 5 20 0`, 'none', { stroke: '#8F6A3A', 'stroke-width': 1.6 });
  return s;
}

const gallina = {
  huevo: () => nido(14) + elip(0, 0, 13, 17, '#FFF4E0') + elip(-4, -6, 3, 5, '#FFFFFF', sinBorde),
  pollito: () => {
    let s = tubos(['M-4 16 L-6 24 M-6 24 L-10 26 M-6 24 L-2 26', 'M6 16 L7 24 M7 24 L3 26 M7 24 L11 26'], '#F29A2E', 2.2, 1.6);
    s += elip(2, 6, 18, 14, '#FFD84D');
    s += circ(-10, -8, 11, '#FFD84D');
    s += cam('M10 4 Q20 0 18 12 Q12 12 8 8', '#FFC928', { 'stroke-width': 2 });
    s += cam('M-21 -8 L-28 -5 L-21 -3 Z', '#F29A2E', { 'stroke-width': 1.8 });
    s += circ(-13, -10, 1.8, T, sinBorde);
    return s;
  },
  gallina: () => {
    let s = tubos(['M-6 22 L-7 32 M-7 32 L-12 34 M-7 32 L-2 34', 'M8 22 L9 32 M9 32 L4 34 M9 32 L14 34'], '#F2B233', 2.4, 1.6);
    s += cam('M14 -4 C30 -18 38 -4 34 6 C32 -4 26 -6 22 -2 Z', '#6B3E26', { 'stroke-width': 2 });
    s += cam('M-24 -8 C-26 14 -12 26 6 24 C24 22 34 10 30 -4 C20 4 0 4 -12 -8 Z', '#B5652F');
    s += cam('M-4 6 C4 14 16 14 22 6', 'none', { stroke: '#7E4222', 'stroke-width': 2 });
    s += circ(-18, -14, 11, '#B5652F');
    s += cam('M-24 -24 Q-22 -32 -17 -26 Q-14 -34 -10 -25 Q-6 -30 -8 -21 Z', '#E23D3D', { 'stroke-width': 2 });
    s += cam('M-29 -12 L-36 -9 L-29 -7 Z', '#F2B233', { 'stroke-width': 1.8 });
    s += cam('M-27 -6 Q-30 2 -25 1 Q-23 -3 -24 -6 Z', '#E23D3D', { 'stroke-width': 1.6 });
    s += circ(-20, -16, 1.9, T, sinBorde);
    return s;
  },
};

function cicloGallina(x) {
  const TW = 128;
  const TH = 108;
  const pos = [[96, 6], [184, 150], [8, 150]];
  const etapas = [[gallina.huevo, 'huevo'], [gallina.pollito, 'pollito'], [gallina.gallina, 'gallina']];
  let s = '';
  etapas.forEach(([dibujo, nombre], i) => {
    const [px, py] = pos[i];
    s += tarjeta(px, py, TW, TH, '#FFF5E0');
    const dy = x.conEtiquetas ? -10 : 0;
    s += tr(px + TW / 2, py + TH / 2 + dy, dibujo());
    x.et(nombre, px + TW / 2, py + TH - 14, null, null);
  });
  s += x.flecha('M232 64 Q262 90 258 140', '#1F7A70', 4, 13);
  s += x.flecha('M178 204 Q160 214 142 204', '#1F7A70', 4, 13);
  s += x.flecha('M62 140 Q58 90 88 64', '#1F7A70', 4, 13);
  return { w: 320, h: 264, cuerpo: s, aria: 'Dibujo del ciclo de vida de un animal, en etapas unidas por flechas.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: máquinas simples
// ---------------------------------------------------------------------------

function ninoSentado(x, y, polera, mira = 1) {
  // x,y = asiento. Niño sentado mirando hacia el centro (mira = 1 derecha).
  let s = '';
  s += tubos([`M${x} ${y - 2} L${x + 12 * mira} ${y + 2} L${x + 12 * mira} ${y + 18}`], '#4A4E69', 6, 2);
  s += elip(x + 15 * mira, y + 20, 5, 3, T, sinBorde);
  s += cam(`M${x - 8} ${y} Q${x - 10} ${y - 26} ${x} ${y - 28} Q${x + 10} ${y - 26} ${x + 8} ${y} Z`, polera);
  s += tubos([`M${x + 2 * mira} ${y - 22} L${x + 14 * mira} ${y - 10}`], polera, 5, 2);
  s += cabeza(x, y - 38, 11);
  return s;
}

function palanca(x) {
  const W = 320;
  const H = 214;
  let s = rect(3, 3, W - 6, H - 6, 18, '#E6F4FB', sinBorde);
  s += nube(250, 34, 0.7);
  s += `<path d="M3 182 L317 182 L317 196 Q317 211 302 211 L18 211 Q3 211 3 196 Z" fill="${C.pasto}"/>` + lin(3, 182, 317, 182);
  // punto de apoyo
  s += pol('160,128 132,182 188,182', C.naranja);
  // barra inclinada
  const y1 = 156;
  const y2 = 100;
  const x1 = 38;
  const x2 = 282;
  const m = (y2 - y1) / (x2 - x1);
  const yb = (xx) => y1 + m * (xx - x1);
  const ang = (Math.atan(m) * 180) / Math.PI;
  s += `<g transform="rotate(${f(ang)} 160 ${f(yb(160) - 4)})">${rect(34, yb(160) - 11, 252, 11, 4, '#C98F5A')}${rect(62, yb(160) - 24, 5, 14, 2, '#8A6444', { 'stroke-width': 2 })}${rect(252, yb(160) - 24, 5, 14, 2, '#8A6444', { 'stroke-width': 2 })}</g>`;
  // niños
  s += ninoSentado(52, yb(52) - 11, '#E4572E', 1);
  s += ninoSentado(270, yb(270) - 11, '#4A78D6', -1);
  s += x.flecha('M20 96 L20 130', '#1F7A70', 3.5, 11) + x.flecha('M300 60 L300 26', '#1F7A70', 3.5, 11);
  x.et('punto de apoyo', 194, 170, 172, 160, { anchor: 'start' });
  x.et('barra', 112, 100, 112, yb(112) - 10);
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de dos niños jugando en un sube y baja.' };
}

function polea(x) {
  const W = 320;
  const H = 240;
  let s = rect(3, 3, W - 6, H - 6, 18, '#E6F4FB', sinBorde);
  s += `<path d="M3 206 L317 206 L317 222 Q317 237 302 237 L18 237 Q3 237 3 222 Z" fill="${C.pasto}"/>` + lin(3, 206, 317, 206);
  // pozo de piedra
  s += cam('M66 150 L66 206 Q120 220 174 206 L174 150 Z', '#B9AFA3');
  for (const [a, b, w] of [[70, 162, 30], [104, 164, 34], [142, 162, 28], [84, 180, 32], [122, 182, 34], [70, 196, 22], [98, 198, 34], [138, 198, 32]]) {
    s += rect(a, b, w, 12, 4, '#CFC6BA', { 'stroke-width': 1.8 });
  }
  s += elip(120, 150, 54, 12, '#5B5968');
  s += elip(120, 150, 54, 12, 'none');
  // postes y travesaño
  s += rect(58, 44, 10, 110, 3, '#9B6A43') + rect(172, 44, 10, 110, 3, '#9B6A43');
  s += rect(50, 38, 140, 11, 4, '#B07A4E');
  // cuerda
  s += cam('M106 66 L106 98', 'none', { stroke: '#8A6444', 'stroke-width': 3 });
  s += cam('M134 66 L232 132', 'none', { stroke: '#8A6444', 'stroke-width': 3 });
  s += cam('M106 66 A14 14 0 0 1 134 66', 'none', { stroke: '#8A6444', 'stroke-width': 3 });
  // polea
  let rueda = lin(120, 49, 120, 60, { 'stroke-width': 4 });
  rueda += circ(120, 66, 16, '#8C8799') + circ(120, 66, 11, '#B9B4C7', { 'stroke-width': 2 }) + circ(120, 66, 3.5, T, sinBorde);
  rueda += cam('M106 66 A14 14 0 0 1 134 66', 'none', { stroke: '#8A6444', 'stroke-width': 3 });
  s += rueda;
  // balde
  s += cam('M94 104 L118 104 L114 132 L98 132 Z', '#4A78D6');
  s += cam('M94 104 Q106 88 118 104', 'none', { 'stroke-width': 2 });
  s += elip(106, 104, 12, 3, '#A9DDF3', { 'stroke-width': 2 });
  // niña que jala
  const nx = 256;
  s += tubos([`M${nx - 4} 176 L${nx - 12} 204`, `M${nx + 4} 176 L${nx + 6} 204`], '#4A4E69', 6, 2);
  s += cam(`M${nx - 12} 178 Q${nx - 10} 146 ${nx + 2} 144 Q${nx + 14} 148 ${nx + 10} 180 Z`, '#8E6CC8');
  s += tubos([`M${nx - 2} 152 L${nx - 22} 136`], C.piel, 5, 2);
  s += cabeza(nx + 2, 130, 12);
  s += cam(`M${nx + 12} 124 Q${nx + 24} 130 ${nx + 16} 150`, 'none', { stroke: C.pelo, 'stroke-width': 4 });
  x.et('polea', 176, 22, 128, 54, { anchor: 'start', desde: [172, 24] });
  x.et('cuerda', 212, 96, 184, 99, { anchor: 'start' });
  x.et('balde', 36, 118, 92, 118, { anchor: 'middle', desde: [52, 118] });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de una niña que saca un balde de un pozo con una cuerda.' };
}

function ruedaEje(x) {
  const W = 320;
  const H = 214;
  let s = rect(3, 3, W - 6, H - 6, 18, '#E6F4FB', sinBorde);
  s += `<path d="M3 184 L317 184 L317 196 Q317 211 302 211 L18 211 Q3 211 3 196 Z" fill="${C.pasto}"/>` + lin(3, 184, 317, 184);
  // patas y mangos
  s += tubos(['M86 152 L300 110', 'M200 130 L208 182'], '#8A6444', 5, 2.2);
  // carga de papas
  s += mancha([[118, 92, 12, 9], [138, 86, 13, 10], [160, 88, 12, 9], [180, 90, 12, 9], [128, 98, 12, 8], [170, 98, 12, 8], [150, 96, 12, 8]], '#C9965B');
  for (const [a, b] of [[118, 90], [140, 84], [162, 88], [180, 92], [150, 96]]) s += circ(a, b, 1.3, T, sinBorde);
  // cajón
  s += cam('M92 98 L214 98 L196 146 L118 146 Z', '#5DAE7B');
  s += lin(100, 108, 208, 108, { stroke: '#3E8A5B', 'stroke-width': 2 });
  // rueda
  let rueda = circ(84, 156, 27, '#5B5968') + circ(84, 156, 19, '#D6D2DF', { 'stroke-width': 2 });
  for (let k = 0; k < 6; k++) {
    const a = rad(k * 60 + 15);
    rueda += lin(84 + Math.cos(a) * 5, 156 + Math.sin(a) * 5, 84 + Math.cos(a) * 18, 156 + Math.sin(a) * 18, { 'stroke-width': 2 });
  }
  s += rueda;
  // eje
  s += tubos(['M84 156 L112 146'], '#8C8799', 4, 2);
  s += circ(84, 156, 6, '#F7A531', { 'stroke-width': 2.2 });
  x.et('rueda', 40, 110, 66, 136, { anchor: 'middle' });
  x.et('eje', 128, 176, 88, 160, { anchor: 'start' });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de una carretilla con papas.' };
}

function planoInclinado(x) {
  const W = 320;
  const H = 214;
  let s = rect(3, 3, W - 6, H - 6, 18, '#E6F4FB', sinBorde);
  s += `<path d="M3 184 L317 184 L317 196 Q317 211 302 211 L18 211 Q3 211 3 196 Z" fill="${C.pasto}"/>` + lin(3, 184, 317, 184);
  // plataforma
  s += rect(228, 84, 82, 100, 4, '#B9AFA3');
  s += cam('M232 110 L306 110 M232 136 L306 136 M232 160 L306 160 M268 84 L268 110 M250 110 L250 136 M286 110 L286 136 M268 136 L268 160 M250 160 L250 184 M290 160 L290 184', 'none', { stroke: '#8C8799', 'stroke-width': 1.6 });
  // rampa
  s += pol('36,184 228,184 228,86', '#D9A066');
  s += cam('M76 184 L76 164 M116 184 L116 143 M156 184 L156 123 M196 184 L196 102', 'none', { stroke: '#B07A4E', 'stroke-width': 1.8 });
  // caja sobre la rampa
  const ang = (Math.atan2(86 - 184, 228 - 36) * 180) / Math.PI;
  s += `<g transform="translate(128 137) rotate(${f(ang)})">${rect(-20, -38, 40, 36, 3, '#F2C14E')}${lin(-20, -26, 20, -26, { stroke: '#C99A2E', 'stroke-width': 2 })}${lin(0, -38, 0, -26, { stroke: '#C99A2E', 'stroke-width': 2 })}</g>`;
  s += x.flecha('M100 104 L170 68', '#1F7A70', 4, 13);
  x.et('rampa', 54, 146, 104, 172, { anchor: 'middle' });
  x.et('caja', 70, 110, 118, 118, { anchor: 'end' });
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de una caja que sube hasta una plataforma.' };
}

// ---------------------------------------------------------------------------
// CIENCIAS: deforestación
// ---------------------------------------------------------------------------

function tocon(x, y, s = 1) {
  let r = cam(`M${f(x - 9 * s)} ${f(y)} L${f(x - 8 * s)} ${f(y - 14 * s)} L${f(x + 8 * s)} ${f(y - 14 * s)} L${f(x + 9 * s)} ${f(y)} Z`, '#9B6A43');
  r += elip(x, y - 14 * s, 8 * s, 3.5 * s, '#E8C995', { 'stroke-width': 2 });
  r += elip(x, y - 14 * s, 4 * s, 1.6 * s, 'none', { stroke: '#B07A4E', 'stroke-width': 1.2 });
  return r;
}

function deforestacion(x) {
  const W = 320;
  const H = 214;
  x.defs.push(`<clipPath id="${x.id('c')}"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="18"/></clipPath>`);
  let s = '';
  s += `<path d="M21 3 L160 3 L160 211 L21 211 Q3 211 3 193 L3 21 Q3 3 21 3 Z" fill="#D6EFFA"/>`;
  s += `<path d="M160 3 L299 3 Q317 3 317 21 L317 193 Q317 211 299 211 L160 211 Z" fill="#E7E3DC"/>`;
  s += sol(40, 34, 13, 9, 0.45);
  s += cam('M96 30 q5 -5 10 0 q5 -5 10 0 M120 48 q4 -4 8 0 q4 -4 8 0', 'none', { 'stroke-width': 2 });
  // suelo
  s += `<path d="M3 160 Q80 152 160 158 L160 211 L21 211 Q3 211 3 193 Z" fill="#8CCB63"/>`;
  s += `<path d="M160 158 Q240 164 317 156 L317 193 Q317 211 299 211 L160 211 Z" fill="#B99A78"/>`;
  s += cam('M3 160 Q80 152 160 158 Q240 164 317 156');
  // bosque
  s += arbol(34, 166, 1.2, '#4FA65A') + arbol(118, 162, 1.3, '#5DB866') + arbol(76, 172, 1.45, '#3E9A55') + arbol(130, 186, 0.85, '#6CC06A');
  s += pasto(20, 190) + pasto(110, 196) + pasto(60, 204, 0.8);
  for (const [a, b, col] of [[46, 196, '#F29CB0'], [132, 200, '#FFD23F']]) s += circ(a, b, 3.5, col, { 'stroke-width': 1.5 });
  // lado cortado y quemado
  s += elip(240, 190, 44, 8, '#8F8A86', { stroke: 'none', opacity: 0.55 });
  s += tocon(196, 176, 1.1) + tocon(262, 170, 1) + tocon(296, 190, 0.9) + tocon(250, 204, 0.9);
  s += tubos(['M178 200 L222 189'], '#9B6A43', 9, 2.2) + elip(224, 188.5, 3, 5, '#E8C995', { 'stroke-width': 1.8 });
  s += cam('M270 150 C264 138 276 130 270 118 C266 110 274 102 272 94', 'none', { stroke: '#B8B3AD', 'stroke-width': 5, opacity: 0.8 });
  s += cam('M290 156 C286 146 296 140 292 130', 'none', { stroke: '#C9C4BE', 'stroke-width': 4, opacity: 0.8 });
  s += nube(252, 44, 0.8, '#D6D1CB');
  s += lin(160, 8, 160, 150, { stroke: '#8C8799', 'stroke-width': 2, 'stroke-dasharray': '5 6' });
  s = `<g clip-path="url(#${x.id('c')})">${s}</g>`;
  return { w: W, h: H, cuerpo: s, aria: 'Dibujo de un paisaje con dos lados diferentes: uno con árboles y otro con árboles cortados.' };
}

// ---------------------------------------------------------------------------
// MATEMÁTICA: cuerpos geométricos
// ---------------------------------------------------------------------------

const oculta = { fill: 'none', stroke: '#2B2A33', 'stroke-width': 1.7, 'stroke-dasharray': '4 5', opacity: 0.55 };

function sombraSuelo(cx, cy, rx, ry = 8) {
  return elip(cx, cy, rx, ry, '#2B2A33', { stroke: 'none', opacity: 0.12 });
}

function caja3D(x, a, b, dx, dy, colores) {
  // a = ancho frente, b = alto, (dx, dy) = profundidad; x0,y0 = esquina inferior izquierda del frente
  const [x0, y0] = x;
  const F = [[x0, y0 - b], [x0 + a, y0 - b], [x0 + a, y0], [x0, y0]];
  const P = (p) => [p[0] + dx, p[1] - dy];
  const pts = (arr) => arr.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
  let s = sombraSuelo(x0 + a / 2 + dx / 2, y0 - dy / 2 + 4, a / 2 + dx / 2 + 8, 9);
  // aristas ocultas
  const bl = P(F[3]);
  s += pol(pts(F), colores[0]);
  s += pol(pts([F[0], P(F[0]), P(F[1]), F[1]]), colores[1]);
  s += pol(pts([F[1], P(F[1]), P(F[2]), F[2]]), colores[2]);
  s += `<path d="M${f(bl[0])} ${f(bl[1])} L${f(P(F[0])[0])} ${f(P(F[0])[1])} M${f(bl[0])} ${f(bl[1])} L${f(P(F[2])[0])} ${f(P(F[2])[1])} M${f(bl[0])} ${f(bl[1])} L${f(F[3][0])} ${f(F[3][1])}"${A(oculta)}/>`;
  return { s, F, P };
}

function cubo(x) {
  const { s, F, P } = caja3D([92, 176], 96, 96, 44, 34, ['#F7A531', '#FBCB7A', '#D9862B']);
  x.et('cara', 60, 118, 114, 118, { anchor: 'end' });
  const v = P(F[1]);
  x.et('vértice', v[0] + 18, v[1] - 12, v[0], v[1], { anchor: 'start' });
  x.et('arista', 258, 150, P(F[2])[0] - 1, (P(F[1])[1] + P(F[2])[1]) / 2 + 20, { anchor: 'start' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

function prisma(x) {
  const { s, F, P } = caja3D([40, 172], 144, 70, 48, 34, ['#A58AD8', '#C9B6EE', '#7F63B8']);
  x.et('cara', 60, 40, 112, 84, { anchor: 'middle' });
  const v = P(F[1]);
  x.et('vértice', v[0] + 16, v[1] - 14, v[0], v[1], { anchor: 'start' });
  x.et('arista', 252, 178, (F[2][0] + P(F[2])[0]) / 2, (F[2][1] + P(F[2])[1]) / 2, { anchor: 'start' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

function piramide(x) {
  const FL = [84, 178];
  const FR = [194, 178];
  const BR = [240, 144];
  const BL = [130, 144];
  const V = [162, 30];
  const p = (arr) => arr.map((q) => `${q[0]},${q[1]}`).join(' ');
  let s = sombraSuelo(164, 166, 92, 14);
  s += pol(p([FL, FR, V]), '#FFD23F');
  s += pol(p([FR, BR, V]), '#E0AE1F');
  s += `<path d="M${BL[0]} ${BL[1]} L${FL[0]} ${FL[1]} M${BL[0]} ${BL[1]} L${BR[0]} ${BR[1]} M${BL[0]} ${BL[1]} L${V[0]} ${V[1]}"${A(oculta)}/>`;
  x.et('vértice', V[0] + 22, V[1] - 6, V[0] + 2, V[1] + 2, { anchor: 'start' });
  x.et('cara', 52, 120, 156, 158, { anchor: 'end' });
  x.et('arista', 250, 88, 205, 94, { anchor: 'start' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

function cilindro(x) {
  const cx = 122;
  const top = 50;
  const bot = 160;
  const rx = 52;
  const ry = 15;
  const gid = x.id('g');
  let s = `<linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5FB06A"/><stop offset=".35" stop-color="#8FD08F"/><stop offset="1" stop-color="#3E8A4E"/></linearGradient>`;
  s += sombraSuelo(cx + 6, bot + 6, rx + 14, 12);
  s += `<path d="M${cx - rx} ${top} L${cx - rx} ${bot} A${rx} ${ry} 0 0 0 ${cx + rx} ${bot} L${cx + rx} ${top} Z" fill="url(#${gid})" stroke="${T}" stroke-width="2.5"/>`;
  s += `<path d="M${cx - rx} ${bot} A${rx} ${ry} 0 0 1 ${cx + rx} ${bot}"${A(oculta)}/>`;
  s += elip(cx, top, rx, ry, '#B7E4B4');
  x.et('base', 214, 34, cx + 30, top - 4, { anchor: 'start' });
  x.et('superficie\ncurva', 214, 118, cx + 38, 118, { anchor: 'start' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

function cono(x) {
  const cx = 150;
  const bot = 160;
  const rx = 58;
  const ry = 16;
  const V = [cx, 30];
  const gid = x.id('g');
  // puntos de tangencia de las generatrices con la elipse de la base
  const t = Math.asin(ry / (bot - V[1]));
  const tx = rx * Math.cos(t);
  const ty = ry * Math.sin(t);
  let s = `<linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#E8736A"/><stop offset=".35" stop-color="#F6A59B"/><stop offset="1" stop-color="#C24B45"/></linearGradient>`;
  s += sombraSuelo(cx + 6, bot + 6, rx + 14, 12);
  s += `<path d="M${V[0]} ${V[1]} L${f(cx + tx)} ${f(bot - ty)} A${rx} ${ry} 0 1 1 ${f(cx - tx)} ${f(bot - ty)} Z" fill="url(#${gid})" stroke="${T}" stroke-width="2.5"/>`;
  s += `<path d="M${f(cx - tx)} ${f(bot - ty)} A${rx} ${ry} 0 0 1 ${f(cx + tx)} ${f(bot - ty)}"${A(oculta)}/>`;
  x.et('vértice', cx + 26, 24, cx + 2, 32, { anchor: 'start' });
  x.et('base', 252, 176, cx + 40, bot + 10, { anchor: 'start' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

function esfera(x) {
  const gid = x.id('g');
  let s = `<radialGradient id="${gid}" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#CFE3FF"/><stop offset=".45" stop-color="#7FA8EE"/><stop offset="1" stop-color="#3F63B8"/></radialGradient>`;
  s += sombraSuelo(166, 172, 64, 11);
  s += circ(160, 100, 66, `url(#${gid})`);
  s += elip(136, 74, 14, 9, '#FFFFFF', { stroke: 'none', opacity: 0.55, transform: 'rotate(-30 136 74)' });
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de un cuerpo geométrico.' };
}

// ---------------------------------------------------------------------------
// SÍMBOLOS DE BOLIVIA
// ---------------------------------------------------------------------------

function asta(x, y1, y2) {
  return rect(x - 3.5, y1, 7, y2 - y1, 3, '#9B8B7A', { 'stroke-width': 2.2 }) + circ(x, y1 - 4, 6.5, '#E9C75A', { 'stroke-width': 2.2 });
}

// Bandera civil: tres franjas horizontales iguales (rojo, amarillo, verde), sin escudo.
function banderaBolivia() {
  const x0 = 54;
  const y0 = 20;
  const w = 234;
  const h = 160; // 15:22 (proporción oficial)
  let s = asta(48, 16, 200);
  s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h / 3}" fill="#D52B1E"/>`;
  s += `<rect x="${x0}" y="${y0 + h / 3}" width="${w}" height="${h / 3}" fill="#F9E300"/>`;
  s += `<rect x="${x0}" y="${y0 + (2 * h) / 3}" width="${w}" height="${h / 3}" fill="#007934"/>`;
  s += rect(x0, y0, w, h, 2, 'none');
  return { w: 320, h: 206, cuerpo: s, aria: 'Dibujo de una bandera.' };
}

// Wiphala del Qullasuyu (DS 241): 7×7 cuadrados, diagonal blanca que baja de la
// esquina superior izquierda a la inferior derecha. En diagonales descendentes,
// desde el cuadrado superior derecho: 1 verde, 2 azules, 3 violetas, 4 rojos,
// 5 naranjas, 6 amarillos, 7 blancos, 6 verdes, 5 azules, 4 violetas, 3 rojos,
// 2 naranjas, 1 amarillo.
function wiphala() {
  const orden = ['#FFFFFF', '#FFD100', '#F28C1A', '#D7261E', '#6E3B96', '#1E64B4', '#1A9A4A'];
  const l = 25;
  const x0 = 70;
  const y0 = 18;
  let s = asta(64, 12, 206);
  for (let fila = 0; fila < 7; fila++) {
    for (let col = 0; col < 7; col++) {
      const k = (((col - fila) % 7) + 7) % 7;
      s += `<rect x="${x0 + col * l}" y="${y0 + fila * l}" width="${l}" height="${l}" fill="${orden[k]}" stroke="#2B2A33" stroke-opacity=".18" stroke-width="1"/>`;
    }
  }
  s += rect(x0, y0, 7 * l, 7 * l, 1.5, 'none');
  return { w: 320, h: 212, cuerpo: s, aria: 'Dibujo de una bandera.' };
}

// Escarapela: rojo en el borde exterior, amarillo en el centro de la banda y verde adentro.
function escarapela() {
  const cx = 160;
  const cy = 104;
  const ondas = (r1, r2, n, desfase = 0) => {
    let d = '';
    for (let i = 0; i <= n * 2; i++) {
      const a = rad((360 / (n * 2)) * i + desfase);
      const r = i % 2 === 0 ? r1 : r2;
      d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))} `;
    }
    return `${d}Z`;
  };
  let s = elip(cx + 2, cy + 5, 90, 90, T, { stroke: 'none', opacity: 0.07 });
  s += `<path d="${ondas(90, 84, 30)}" fill="#D52B1E" stroke="${T}" stroke-width="2.5"/>`;
  let pl = '';
  for (let i = 0; i < 30; i++) {
    const a = rad(12 * i);
    pl += `M${f(cx + 62 * Math.cos(a))} ${f(cy + 62 * Math.sin(a))} L${f(cx + 84 * Math.cos(a))} ${f(cy + 84 * Math.sin(a))} `;
  }
  s += `<path d="${pl}" stroke="#A81F15" stroke-width="1.5" fill="none"/>`;
  s += `<path d="${ondas(62, 58, 24, 7)}" fill="#F9E300" stroke="${T}" stroke-width="2.2"/>`;
  let pa = '';
  for (let i = 0; i < 24; i++) {
    const a = rad(15 * i + 7);
    pa += `M${f(cx + 36 * Math.cos(a))} ${f(cy + 36 * Math.sin(a))} L${f(cx + 57 * Math.cos(a))} ${f(cy + 57 * Math.sin(a))} `;
  }
  s += `<path d="${pa}" stroke="#D1BE00" stroke-width="1.5" fill="none"/>`;
  s += circ(cx, cy, 36, '#007934');
  s += circ(cx - 10, cy - 12, 8, '#FFFFFF', { stroke: 'none', opacity: 0.2 });
  return { w: 320, h: 208, cuerpo: s, aria: 'Dibujo de un símbolo de Bolivia.' };
}

// Kantuta tricolor: cáliz verde, tubo amarillo y pétalos rojos; flores colgantes.
function florKantuta(x, y, ang = 0, s = 1) {
  let r = '';
  r += lin(0, 0, 0, 8, { stroke: '#3E7A45', 'stroke-width': 2.5 });
  r += cam('M-5 7 C-6.5 12 -6 17 -4 20 L4 20 C6 17 6.5 12 5 7 Z', '#3E9A55', { 'stroke-width': 2 });
  r += cam('M-4 19 L4 19 L6.5 56 L-6.5 56 Z', '#FFD23F', { 'stroke-width': 2.2 });
  r += lin(-6, 76, -7, 90, { stroke: '#F3E7B8', 'stroke-width': 1.5 }) + lin(0, 78, 0, 93, { stroke: '#F3E7B8', 'stroke-width': 1.5 }) + lin(6, 76, 7, 90, { stroke: '#F3E7B8', 'stroke-width': 1.5 });
  r += circ(-7, 91, 2, '#FFD23F', { 'stroke-width': 1 }) + circ(0, 94, 2, '#FFD23F', { 'stroke-width': 1 }) + circ(7, 91, 2, '#FFD23F', { 'stroke-width': 1 });
  r += cam('M-6.5 55 C-9 62 -18 67 -25 70 Q-23 79 -15 77 Q-10 84 -3 79 Q0 85 3 79 Q10 84 15 77 Q23 79 25 70 C18 67 9 62 6.5 55 Z', '#D7263D', { 'stroke-width': 2.2 });
  r += cam('M-3 62 L-8 74 M3 62 L8 74 M0 62 L0 77', 'none', { stroke: '#A51C2E', 'stroke-width': 1.3 });
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)}) scale(${s})">${r}</g>`;
}

function kantuta() {
  let s = rect(3, 3, 314, 194, 18, '#F3FAEE', sinBorde);
  s += tubos(['M6 38 C80 22 170 26 314 52', 'M112 30 C132 16 150 12 172 14'], '#8A6444', 5, 2.2);
  for (const [a, b, L, ang] of [[30, 34, 24, -150], [58, 28, 22, -30], [96, 26, 24, -160], [146, 16, 20, -40], [170, 14, 18, 200], [196, 32, 24, -20], [236, 38, 22, -160], [262, 44, 24, -30], [298, 50, 18, 200]]) {
    s += hoja(a, b, L, ang, '#6E9E5E', 0.34, false);
  }
  s += florKantuta(160, 14, 12, 1);
  s += florKantuta(50, 31, 5, 1.4) + florKantuta(116, 29, -3, 1.52) + florKantuta(200, 35, 3, 1.45) + florKantuta(272, 46, -5, 1.34);
  return { w: 320, h: 200, cuerpo: s, aria: 'Dibujo de una flor de Bolivia.' };
}

// Patujú (Heliconia rostrata): inflorescencia colgante en zigzag; cada bráctea
// es roja, con el labio amarillo hacia la punta y un borde verde.
function bracteaPatuju(L, H) {
  // borde superior (labio): curva cuadrática P0 → P2 con control P1
  const P0 = [0, -5];
  const P1 = [0.5 * L, -0.08 * H];
  const P2 = [L, -0.62 * H];
  const B = (t) => [0, 1].map((k) => (1 - t) ** 2 * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
  const C1 = (a) => [0, 1].map((k) => (1 - a) * P1[k] + a * P2[k]);
  const pt = (q, dy = 0, dx = 0) => `${f(q[0] + dx)} ${f(q[1] + dy)}`;
  const cuerpo = `M${pt(P0)} Q${pt(P1)} ${pt(P2)} C${f(0.8 * L)} ${f(0.22 * H)} ${f(0.42 * L)} ${f(0.78 * H)} 0 ${f(0.42 * H)} Z`;
  const a = 0.36;
  const labio = `M${pt(B(a))} Q${pt(C1(a))} ${pt(P2)} Q${pt(C1(a), 0.62 * H, -0.04 * L)} ${pt(B(a), 0.4 * H)} Z`;
  const g0 = 0.22;
  const verde = `M${pt(B(g0), 2.6)} Q${pt(C1(g0), 2.6)} ${pt(P2, 3, -4)}`;
  let r = `<path d="${cuerpo}" fill="#D7263D"/>`;
  r += `<path d="${labio}" fill="#FFD23F"/>`;
  r += `<path d="${verde}" fill="none" stroke="#2E9A4A" stroke-width="3"/>`;
  r += `<path d="${cuerpo}" fill="none" stroke="${T}" stroke-width="2.3"/>`;
  return r;
}

function patuju() {
  let s = rect(3, 3, 314, 264, 18, '#F3FAEE', sinBorde);
  // hojas grandes de la planta (como de plátano), al fondo
  s += cam('M26 262 C12 206 28 132 80 96 C100 160 84 220 26 262 Z', '#8CCB78');
  s += cam('M26 262 C46 206 64 150 80 96', 'none', { stroke: '#5E9A55', 'stroke-width': 2 });
  s += cam('M296 262 C310 200 294 132 244 100 C226 166 240 224 296 262 Z', '#8CCB78');
  s += cam('M296 262 C278 206 260 152 244 100', 'none', { stroke: '#5E9A55', 'stroke-width': 2 });
  const nodos = [[164, 44, 1, 1], [156, 82, -1, 0.93], [163, 116, 1, 0.84], [157, 146, -1, 0.75], [162, 172, 1, 0.66], [158, 194, -1, 0.56], [161, 212, 1, 0.46]];
  s += tubos([`M160 6 L${nodos.map((q) => `${q[0]} ${q[1]}`).join(' L')} L160 226`], '#5E9A45', 4.5, 2);
  for (const [bx, by, l, sc] of nodos) {
    s += `<g transform="translate(${bx} ${by}) scale(${l} 1) rotate(14)">${bracteaPatuju(84 * sc, 32 * sc)}</g>`;
  }
  return { w: 320, h: 270, cuerpo: s, aria: 'Dibujo de una flor de Bolivia.' };
}

// ---------------------------------------------------------------------------
// registro
// ---------------------------------------------------------------------------

const DIBUJOS = {
  'planta-partes': plantaPartes,
  'ciclo-planta': cicloPlanta,
  'estados-agua': estadosAgua,
  'ciclo-agua': cicloAgua,
  'tierra-rotacion': tierraRotacion,
  'tierra-traslacion': tierraTraslacion,
  'sistema-solar': sistemaSolar,
  'fases-luna': fasesLuna,
  esqueleto,
  'aparato-digestivo': aparatoDigestivo,
  sentidos,
  'paisaje-altiplano': paisajeAltiplano,
  'paisaje-valle': paisajeValle,
  'paisaje-llanos': paisajeLlanos,
  'paisaje-chaco': paisajeChaco,
  estaciones,
  'ciclo-rana': cicloRana,
  'ciclo-mariposa': cicloMariposa,
  'ciclo-gallina': cicloGallina,
  palanca,
  polea,
  'rueda-eje': ruedaEje,
  'plano-inclinado': planoInclinado,
  deforestacion,
  cubo,
  esfera,
  cilindro,
  cono,
  piramide,
  prisma,
  'bandera-bolivia': banderaBolivia,
  wiphala,
  escarapela,
  kantuta,
  patuju,
};

export const ILUSTRACIONES_DISPONIBLES = Object.keys(DIBUJOS);

for (const id of Object.keys(ILUSTRACIONES)) {
  if (!DIBUJOS[id]) console.warn(`Ilustración sin dibujo: ${id}`);
}

export function ilustracion(id, opciones = {}) {
  // hasOwn: un id como «constructor» o «toString» no debe tomarse del prototipo.
  const dibujar = Object.prototype.hasOwnProperty.call(DIBUJOS, id) ? DIBUJOS[id] : null;
  if (!dibujar) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="100%" role="img" aria-label="Ilustración no disponible" style="display:block;width:100%;max-width:160px;height:auto;margin:0 auto">'
      + `<rect x="2" y="2" width="116" height="76" rx="12" fill="#FDEFD9" stroke="#E7DCCB" stroke-width="3"/><text x="60" y="52" text-anchor="middle" font-size="34" font-family="${FUENTE}" fill="#5B5968">?</text></svg>`;
  }
  const ctx = crearContexto(id, opciones || {});
  const r = dibujar(ctx);
  const W = r.w;
  const H = r.h;
  if (ctx.resaltar) ctx.defs.push(filtroBrillo(ctx.pref, W, H));
  const maxw = r.maxw || Math.round(W * 1.2);
  let aria = r.aria;
  if (ctx.resaltar) aria += id === 'estaciones' ? ' Uno de los dibujos está resaltado.' : ' Una de sus partes está resaltada.';
  const attrs = [
    'xmlns="http://www.w3.org/2000/svg"', `viewBox="0 0 ${W} ${H}"`, 'width="100%"', 'role="img"',
    `aria-label="${esc(aria)}"`, 'class="ilustracion"', `data-ilustracion="${id}"`,
    ctx.resaltar ? `data-resaltar="${ctx.resaltar}"` : '', 'focusable="false"',
    `style="display:block;width:100%;max-width:${maxw}px;height:auto;margin:0 auto"`,
    `font-family="${FUENTE}"`, 'stroke-linecap="round"', 'stroke-linejoin="round"',
  ].filter(Boolean).join(' ');
  const defs = ctx.defs.length ? `<defs>${ctx.defs.join('')}</defs>` : '';
  const etq = ctx.etiquetas.length ? `<g class="etiquetas">${ctx.etiquetas.join('')}</g>` : '';
  const dibujo = ctx.resaltar
    ? `${r.fondo || ''}<g opacity="0.35">${r.cuerpo}</g>${ctx.copia}`
    : `${r.fondo || ''}${r.cuerpo}`;
  return `<svg ${attrs}>${defs}<g class="dibujo">${dibujo}</g>${etq}</svg>`;
}
