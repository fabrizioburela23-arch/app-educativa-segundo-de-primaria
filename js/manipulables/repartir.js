// Repartir: pasar objetos del montón a los platos (tocar el plato o arrastrar).
// Tocar un objeto de un plato lo devuelve al montón.
import { h, hacerArrastrable } from '../ui/dom.js';
import { crearBase, lectura, entero, activarConTeclado, unirY } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('repartir', opts);
  const total = entero(cfg.total, 1, 30, 12);
  const G = entero(cfg.grupos, 2, 6, 3);
  const emoji = cfg.emoji || '🍬';
  let platos = Array(G).fill(0);
  let monton = total;
  let elegido = false; // un objeto del montón está «levantado»
  let solucion = false;

  const montonZona = h('div', { class: 'rep-monton-items' });
  const montonEl = h('div', { class: 'rep-monton', role: 'group', 'aria-label': 'Para repartir' },
    h('div', { class: 'rep-titulo' }, 'Para repartir'), montonZona);
  const ayuda = h('div', { class: 'rep-ayuda' }, 'Toca un plato para poner uno. También puedes arrastrar.');
  const platosEl = Array.from({ length: G }, (_, i) => {
    const items = h('div', { class: 'rep-plato-items' });
    const el = h('div', {
      class: 'rep-plato', role: 'button', tabindex: 0, 'aria-label': `Plato ${i + 1}: toca para poner uno`,
      onclick: () => aPlato(i),
    }, h('div', { class: 'rep-plato-num', 'aria-hidden': 'true' }, String(i + 1)), items);
    activarConTeclado(el, () => aPlato(i));
    return { el, items };
  });
  const lect = lectura('rep-lectura');
  b.el.append(montonEl, ayuda, h('div', { class: `rep-platos rep-${G}` }, platosEl.map((p) => p.el)), lect);

  const destinosPlatos = () => platosEl.map((p) => p.el);

  function aPlato(i) {
    if (b.bloqueado || monton <= 0) return;
    monton -= 1;
    platos = platos.map((x, k) => (k === i ? x + 1 : x));
    elegido = false;
    pintar();
    b.avisar();
  }

  function aMonton(i) {
    if (b.bloqueado || platos[i] <= 0) return;
    monton += 1;
    platos = platos.map((x, k) => (k === i ? x - 1 : x));
    pintar();
    b.avisar();
  }

  function dePlatoAPlato(i, j) {
    if (b.bloqueado || i === j || platos[i] <= 0) return;
    platos = platos.map((x, k) => (k === i ? x - 1 : k === j ? x + 1 : x));
    pintar();
    b.avisar();
  }

  function pintar() {
    montonZona.replaceChildren(...Array.from({ length: monton }, (_, k) => {
      const it = h('button', {
        type: 'button', class: `manip-item${elegido && k === monton - 1 ? ' elegida' : ''}`,
        disabled: b.bloqueado, 'aria-label': 'Objeto para repartir',
      }, emoji);
      hacerArrastrable(it, {
        destinos: destinosPlatos,
        alSoltar: (d) => {
          const i = platosEl.findIndex((p) => p.el === d);
          if (i >= 0) aPlato(i);
        },
        alTocar: () => {
          if (b.bloqueado) return;
          elegido = !elegido;
          pintar();
        },
      });
      return it;
    }));
    if (!monton) montonZona.append(h('div', { class: 'rep-vacio' }, '¡Ya no queda nada!'));
    platosEl.forEach((p, i) => {
      p.el.classList.toggle('destino-sugerido', elegido && !b.bloqueado);
      p.el.setAttribute('aria-disabled', b.bloqueado || monton <= 0 ? 'true' : 'false');
      p.el.setAttribute('tabindex', b.bloqueado ? '-1' : '0');
      p.items.replaceChildren(...Array.from({ length: platos[i] }, () => {
        const it = h('button', { type: 'button', class: 'manip-item en-plato', disabled: b.bloqueado, 'aria-label': `Devolver uno del plato ${i + 1}` }, emoji);
        it.addEventListener('click', (e) => e.stopPropagation());
        it.addEventListener('keydown', (e) => e.stopPropagation());
        hacerArrastrable(it, {
          destinos: () => [montonEl, ...destinosPlatos()],
          alSoltar: (d) => {
            if (d === montonEl) aMonton(i);
            else {
              const j = platosEl.findIndex((q) => q.el === d);
              if (j >= 0) dePlatoAPlato(i, j);
            }
          },
          alTocar: () => aMonton(i),
        });
        return it;
      }));
    });
    const mostrar = b.libre || solucion;
    lect.hidden = !mostrar;
    if (mostrar) {
      const iguales = platos.every((x) => x === platos[0]);
      if (monton > 0) lect.textContent = `Quedan ${monton} por repartir`;
      else if (iguales) lect.textContent = `${total} repartidos en ${G} platos: ${platos[0]} en cada plato`;
      else lect.textContent = `En los platos hay ${unirY(platos)}: no es lo mismo`;
    }
  }

  const api = {
    el: b.el,
    listo: () => monton === 0,
    evaluar() {
      if (monton > 0) return { correcto: false, detalle: 'Todavía quedan para repartir.' };
      if (!platos.every((x) => x === platos[0])) return { correcto: false, detalle: 'Los platos no tienen la misma cantidad.' };
      return { correcto: true };
    },
    mostrarSolucion() {
      const cada = Math.floor(total / G);
      platos = Array(G).fill(cada);
      monton = total - cada * G;
      elegido = false;
      solucion = true;
      b.el.classList.add('solucion');
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      elegido = false;
      b.el.classList.add('bloqueado');
      pintar();
    },
    reiniciar() {
      platos = Array(G).fill(0);
      monton = total;
      elegido = false;
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => `platos con ${unirY(platos)}; quedan ${monton}`,
  };
  pintar();
  return api;
}
