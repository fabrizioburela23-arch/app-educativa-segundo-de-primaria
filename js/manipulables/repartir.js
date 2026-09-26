// Repartir: pasar objetos del montón a los platos (tocar el plato o arrastrar).
// Tocar un objeto de un plato lo devuelve al montón.
import { h, hacerArrastrable } from '../ui/dom.js';
import { crearBase, lectura, entero, unirY } from './comun.js';

export function crear(cfg, opts) {
  const b = crearBase('repartir', opts);
  const total = entero(cfg.total, 1, 30, 12);
  const G = entero(cfg.grupos, 2, 6, 3);
  const emoji = cfg.emoji || '🍬';
  // Si el total no se reparte exacto (9 entre 2), lo correcto es dar lo mismo
  // a cada plato y dejar el resto en el montón.
  const resto = total % G;
  let platos = Array(G).fill(0);
  let monton = total;
  let elegido = false; // un objeto del montón está «levantado»
  let solucion = false;

  const montonZona = h('div', { class: 'rep-monton-items' });
  const montonEl = h('div', { class: 'rep-monton', role: 'group', 'aria-label': 'Para repartir' },
    h('div', { class: 'rep-titulo' }, 'Para repartir'), montonZona);
  const ayuda = h('div', { class: 'rep-ayuda' }, 'Toca un plato para poner uno. Toca un objeto del plato para devolverlo.');
  // Cada plato: tocar el plato (o su botón «+») pone uno; tocar un objeto del
  // plato lo devuelve al montón. El botón evita tocar sin querer un objeto.
  const platosEl = Array.from({ length: G }, (_, i) => {
    const items = h('div', { class: 'rep-plato-items' });
    const el = h('div', {
      class: 'rep-plato', role: 'group', 'aria-label': `Plato ${i + 1}`,
      onclick: () => aPlato(i),
    }, h('div', { class: 'rep-plato-num', 'aria-hidden': 'true' }, String(i + 1)), items);
    const poner = h('button', {
      type: 'button', class: 'manip-btn mas rep-poner', 'aria-label': `Poner uno en el plato ${i + 1}`,
      onclick: () => aPlato(i),
    }, '+ ', h('span', { class: 'emo', 'aria-hidden': 'true' }, emoji));
    return { el, items, poner, caja: h('div', { class: 'rep-caja' }, el, poner) };
  });
  const lect = lectura('rep-lectura');
  b.el.append(montonEl, ayuda, h('div', { class: `rep-platos rep-${G}` }, platosEl.map((p) => p.caja)), lect);

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

  // Captura el puntero desde el primer toque: así un arrastre rápido con el
  // mouse no se pierde al salir del objeto.
  const capturar = (it) => it.addEventListener('pointerdown', (e) => {
    try { it.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  });

  function pintar() {
    montonZona.replaceChildren(...Array.from({ length: monton }, (_, k) => {
      const it = h('button', {
        type: 'button', class: `manip-item${elegido && k === monton - 1 ? ' elegida' : ''}`,
        disabled: b.bloqueado, 'aria-label': 'Objeto para repartir',
      }, emoji);
      capturar(it);
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
      p.el.classList.toggle('sin-toque', b.bloqueado || monton <= 0);
      p.poner.disabled = b.bloqueado || monton <= 0;
      p.items.replaceChildren(...Array.from({ length: platos[i] }, () => {
        const it = h('button', { type: 'button', class: 'manip-item en-plato', disabled: b.bloqueado, 'aria-label': `Devolver uno del plato ${i + 1}` }, emoji);
        it.addEventListener('click', (e) => e.stopPropagation());
        capturar(it);
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
      const sobran = monton === 1 ? 'sobra 1' : `sobran ${monton}`;
      if (iguales && platos[0] > 0 && monton > 0 && monton < G) lect.textContent = `${platos[0]} en cada plato y ${sobran}`;
      else if (monton > 0) lect.textContent = monton === 1 ? 'Queda 1 por repartir' : `Quedan ${monton} por repartir`;
      else if (iguales) lect.textContent = `${total} repartidos en ${G} platos: ${platos[0]} en cada plato`;
      else lect.textContent = `En los platos hay ${unirY(platos)}: no es lo mismo`;
    }
  }

  const api = {
    el: b.el,
    listo: () => monton <= resto,
    evaluar() {
      if (b.libre) return { correcto: true };
      if (monton > resto) return { correcto: false, detalle: 'Todavía quedan para repartir.' };
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
