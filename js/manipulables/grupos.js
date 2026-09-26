// Grupos iguales: platos con − y + para poner la misma cantidad en cada uno.
import { h } from '../ui/dom.js';
import { plato } from '../visuales/visual.js';
import { crearBase, boton, lectura, entero, unirY } from './comun.js';

const MAX = 10;

export function crear(cfg, opts) {
  const b = crearBase('grupos', opts);
  const G = entero(cfg.grupos, 1, 6, 3);
  const porGrupo = Number.isInteger(cfg.porGrupo) ? cfg.porGrupo : null;
  const emoji = cfg.emoji || '🍎';
  const ini = Array.from({ length: G }, (_, i) => entero(Array.isArray(cfg.inicial) ? cfg.inicial[i] : 0, 0, MAX, 0));
  let st = ini.slice();
  let solucion = false;

  const tarjetas = st.map((_, i) => {
    const zona = h('div', { class: 'grm-plato' });
    const menos = boton('−', { etiqueta: `Quitar uno del plato ${i + 1}`, clase: 'menos', onclick: () => sumar(i, -1) });
    const mas = boton('+', { etiqueta: `Poner uno en el plato ${i + 1}`, clase: 'mas', onclick: () => sumar(i, 1) });
    const el = h('div', { class: 'grm-grupo', role: 'group', 'aria-label': `Plato ${i + 1}` }, zona, h('div', { class: 'grm-botones' }, menos, mas));
    return { el, zona, menos, mas };
  });
  const lect = lectura('grm-lectura');
  b.el.append(h('div', { class: 'grm-grupos' }, tarjetas.map((t) => t.el)), lect);

  function sumar(i, d) {
    if (b.bloqueado) return;
    const n = st[i] + d;
    if (n < 0 || n > MAX) return;
    st = st.map((x, k) => (k === i ? n : x));
    pintar();
    b.avisar();
  }

  const iguales = () => st.every((x) => x === st[0]);

  function pintar() {
    tarjetas.forEach((t, i) => {
      t.zona.replaceChildren(plato(st[i], emoji));
      t.menos.disabled = b.bloqueado || st[i] <= 0;
      t.mas.disabled = b.bloqueado || st[i] >= MAX;
    });
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) {
      const total = st.reduce((a, x) => a + x, 0);
      lect.textContent = iguales()
        ? `${G} ${G === 1 ? 'grupo' : 'grupos'} de ${st[0]} = ${total}`
        : `En los platos hay ${unirY(st)}. En total: ${total}`;
    }
  }

  const api = {
    el: b.el,
    listo: () => st.some((x, i) => x !== ini[i]),
    evaluar() {
      if (porGrupo === null) return { correcto: true };
      if (st.every((x) => x === porGrupo)) return { correcto: true };
      if (iguales()) {
        return {
          correcto: false,
          detalle: st[0] < porGrupo
            ? 'Todos los platos tienen lo mismo, pero les falta.'
            : 'Todos los platos tienen lo mismo, pero pusiste de más.',
        };
      }
      return { correcto: false, detalle: 'Los platos no tienen la misma cantidad. Cuenta cada plato.' };
    },
    mostrarSolucion() {
      if (porGrupo === null) return;
      st = st.map(() => Math.min(MAX, porGrupo));
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
      st = ini.slice();
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => (iguales() ? `${G} ${G === 1 ? 'grupo' : 'grupos'} de ${st[0]}` : `platos con ${unirY(st)}`),
  };
  pintar();
  return api;
}
