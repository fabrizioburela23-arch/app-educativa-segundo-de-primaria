// Tipo «memoria»: juego de parejas. Termina solo cuando se encuentran todas.
import { h, mezclar } from '../ui/dom.js';

const lado = (x) => (typeof x === 'string' ? { texto: x } : x);

export default function memoria(cont, ej, ctx) {
  const cartas = mezclar(ej.pares.flatMap((p, i) => [{ par: i, ...lado(p[0]) }, { par: i, ...lado(p[1]) }]));
  const cols = cartas.length <= 6 ? 3 : 4;
  const grid = h('div', { class: 'memoria', style: `--cols: ${cols}` });
  const info = h('p', { class: 'memoria-info', 'aria-live': 'polite' }, 'Toca dos cartas para darles la vuelta.');
  cont.append(grid, info);

  const abiertas = [];
  const hechas = new Set();
  let intentos = 0;
  let esperando = false;

  const botones = cartas.map((c, k) => {
    const b = h('button', { class: 'carta', type: 'button', 'aria-label': 'Carta boca abajo', onclick: () => voltear(k) }, h('span', { class: 'dorso', 'aria-hidden': 'true' }, '?'));
    grid.appendChild(b);
    return b;
  });

  function mostrar(k, abierta) {
    const b = botones[k];
    const c = cartas[k];
    b.textContent = '';
    if (abierta) {
      b.classList.add('abierta');
      b.setAttribute('aria-label', c.texto || c.emoji || '');
      if (c.emoji) b.appendChild(h('span', { class: 'emoji', 'aria-hidden': 'true' }, c.emoji));
      if (c.texto) b.appendChild(h('span', {}, c.texto));
    } else {
      b.classList.remove('abierta');
      b.setAttribute('aria-label', 'Carta boca abajo');
      b.appendChild(h('span', { class: 'dorso', 'aria-hidden': 'true' }, '?'));
    }
  }

  function voltear(k) {
    if (esperando || hechas.has(k) || abiertas.includes(k)) return;
    abiertas.push(k);
    mostrar(k, true);
    if (abiertas.length < 2) return;
    intentos++;
    const [a, b] = abiertas;
    if (cartas[a].par === cartas[b].par) {
      hechas.add(a); hechas.add(b);
      botones[a].classList.add('hecha'); botones[b].classList.add('hecha');
      botones[a].disabled = true; botones[b].disabled = true;
      abiertas.length = 0;
      const faltan = (cartas.length - hechas.size) / 2;
      info.textContent = faltan ? `¡Pareja encontrada! Faltan ${faltan}.` : '¡Encontraste todas las parejas!';
      if (!faltan) setTimeout(() => ctx.alTerminar({ r: 1, respuesta: `${intentos} intentos` }), 500);
    } else {
      esperando = true;
      info.textContent = 'No son pareja. ¡Recuerda dónde están!';
      setTimeout(() => {
        mostrar(a, false); mostrar(b, false);
        abiertas.length = 0;
        esperando = false;
      }, 1100);
    }
  }

  return {
    autoCompleta: true,
    listo: () => false,
    evaluar: () => ({ correcto: hechas.size === cartas.length }),
    prepararReintento() {},
    mostrarSolucion() {
      cartas.forEach((_, k) => { mostrar(k, true); botones[k].classList.add('hecha'); });
    },
    bloquear() { botones.forEach((b) => { b.disabled = true; }); },
  };
}
