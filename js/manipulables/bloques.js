// Bloques base 10: columnas de centenas, decenas y unidades con − y +.
// En modo ejercicio el número NO se muestra (el niño cuenta los bloques).
import { h } from '../ui/dom.js';
import { dibujarBloquesColumna } from '../visuales/visual.js';
import { crearBase, boton, lectura, plural, unirY, entero } from './comun.js';

const COLS = [
  { k: 'centenas', uno: 'centena', varios: 'centenas', titulo: 'Centenas', valor: 100 },
  { k: 'decenas', uno: 'decena', varios: 'decenas', titulo: 'Decenas', valor: 10 },
  { k: 'unidades', uno: 'unidad', varios: 'unidades', titulo: 'Unidades', valor: 1 },
];
const MAX = 20;

const CAMBIOS = [
  { texto: 'Cambiar 10 unidades por 1 decena', de: 'unidades', a: 'decenas', juntar: true },
  { texto: 'Cambiar 1 decena por 10 unidades', de: 'decenas', a: 'unidades', juntar: false },
  { texto: 'Cambiar 10 decenas por 1 centena', de: 'decenas', a: 'centenas', juntar: true },
  { texto: 'Cambiar 1 centena por 10 decenas', de: 'centenas', a: 'decenas', juntar: false },
];

export const descomponer = (n) => ({ centenas: Math.floor(n / 100), decenas: Math.floor(n / 10) % 10, unidades: n % 10 });

export function crear(cfg, opts) {
  const b = crearBase('bloques', opts);
  const ini = {
    centenas: entero(cfg.inicial?.centenas, 0, MAX, 0),
    decenas: entero(cfg.inicial?.decenas, 0, MAX, 0),
    unidades: entero(cfg.inicial?.unidades, 0, MAX, 0),
  };
  const objetivo = Number.isInteger(cfg.objetivo) ? cfg.objetivo : null;
  const canonico = !!cfg.canonico;
  let st = { ...ini };
  let solucion = false;
  const valor = () => st.centenas * 100 + st.decenas * 10 + st.unidades;

  const cols = COLS.map((col) => {
    const dibujo = h('div', { class: 'bqm-dibujo' });
    const cuenta = h('div', { class: 'bqm-cuenta' });
    const menos = boton('−', { etiqueta: `Quitar una ${col.uno}`, clase: 'menos', onclick: () => sumar(col.k, -1) });
    const mas = boton('+', { etiqueta: `Agregar una ${col.uno}`, clase: 'mas', onclick: () => sumar(col.k, 1) });
    const el = h('div', { class: `bqm-col bqm-${col.k}`, role: 'group', 'aria-label': col.titulo },
      h('div', { class: 'bqm-titulo' }, col.titulo),
      dibujo, cuenta,
      h('div', { class: 'bqm-botones' }, menos, mas));
    return { ...col, el, dibujo, cuenta, menos, mas };
  });

  const cambios = CAMBIOS.map((c) => ({
    ...c,
    btn: h('button', { type: 'button', class: 'bqm-cambio', onclick: () => canjear(c) },
      h('span', { class: 'bqm-cambio-ic', 'aria-hidden': 'true' }, c.juntar ? '⇦' : '⇨'), h('span', {}, c.texto)),
  }));
  const posible = (c) => (c.juntar
    ? st[c.de] >= 10 && st[c.a] < MAX
    : st[c.de] >= 1 && st[c.a] + 10 <= MAX);

  const lect = lectura('bqm-lectura');

  b.el.append(
    h('div', { class: 'bqm-columnas' }, cols.map((c) => c.el)),
    lect,
    h('div', { class: 'bqm-cambios', role: 'group', 'aria-label': 'Cambiar bloques' }, cambios.map((c) => c.btn)),
  );

  function sumar(k, d) {
    if (b.bloqueado) return;
    const n = st[k] + d;
    if (n < 0 || n > MAX) return;
    st = { ...st, [k]: n };
    pintar();
    b.avisar();
  }

  function canjear(c) {
    if (b.bloqueado || !posible(c)) return;
    if (c.juntar) st = { ...st, [c.de]: st[c.de] - 10, [c.a]: st[c.a] + 1 };
    else st = { ...st, [c.de]: st[c.de] - 1, [c.a]: st[c.a] + 10 };
    pintar();
    b.avisar();
  }

  function frase() {
    const partes = COLS.map((c) => plural(st[c.k], c.uno, c.varios));
    return `${partes.join(' + ')} = ${valor()}`;
  }

  function pintar() {
    const mostrar = b.libre || solucion;
    for (const c of cols) {
      c.dibujo.replaceChildren(dibujarBloquesColumna(c.k, st[c.k], 100));
      c.cuenta.textContent = String(st[c.k]);
      c.cuenta.hidden = !mostrar;
      c.menos.disabled = b.bloqueado || st[c.k] <= 0;
      c.mas.disabled = b.bloqueado || st[c.k] >= MAX;
    }
    for (const c of cambios) c.btn.disabled = b.bloqueado || !posible(c);
    b.el.classList.toggle('con-lectura', mostrar);
    lect.replaceChildren(...(mostrar
      ? [h('div', { class: 'manip-numero' }, String(valor())), h('div', { class: 'manip-frase' }, frase())]
      : []));
    lect.hidden = !mostrar;
  }

  const api = {
    el: b.el,
    listo: () => COLS.some((c) => st[c.k] !== ini[c.k]),
    evaluar() {
      if (objetivo === null) return { correcto: true };
      const v = valor();
      if (v === objetivo) {
        if (canonico) {
          if (st.unidades > 9) return { correcto: false, detalle: 'Tienes 10 o más unidades sueltas. Cambia 10 unidades por 1 decena.' };
          if (st.decenas > 9) return { correcto: false, detalle: 'Tienes 10 o más decenas. Cambia 10 decenas por 1 centena.' };
        }
        return { correcto: true };
      }
      const meta = descomponer(objetivo);
      if (COLS.every((c) => st[c.k] <= 9)) {
        const mal = COLS.filter((c) => st[c.k] !== meta[c.k]).map((c) => `las ${c.varios}`);
        return { correcto: false, detalle: `Revisa ${unirY(mal)}: cuenta cuántas pide el número.` };
      }
      return {
        correcto: false,
        detalle: v < objetivo
          ? 'Tu número quedó más pequeño. Te faltan bloques.'
          : 'Tu número quedó más grande. Pusiste bloques de más.',
      };
    },
    mostrarSolucion() {
      if (objetivo === null) return;
      st = descomponer(objetivo);
      solucion = true;
      b.el.classList.add('solucion');
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      b.el.classList.add('bloqueado');
      pintar();
    },
    reiniciar() {
      st = { ...ini };
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => COLS.map((c) => plural(st[c.k], c.uno, c.varios)).join(', '),
  };
  pintar();
  return api;
}
