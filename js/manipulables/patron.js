// Patrón: completar los espacios con fichas de la paleta.
// Tocar una ficha llena el siguiente espacio vacío; tocar un espacio lleno lo vacía.
import { h } from '../ui/dom.js';
import { cajaSecuencia, esEmoji } from '../visuales/visual.js';
import { crearBase, entero } from './comun.js';

const ORDINAL = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto'];
const valor = (x) => (x && typeof x === 'object' ? (x.emoji || x.texto || '') : String(x ?? ''));

export function crear(cfg, opts) {
  const b = crearBase('patron', opts);
  const secuencia = Array.isArray(cfg.secuencia) ? cfg.secuencia.map(valor) : [];
  const opciones = Array.isArray(cfg.opciones) ? cfg.opciones.map(valor) : [];
  const sol = Array.isArray(cfg.solucion) ? cfg.solucion.map(valor) : null;
  const n = entero(cfg.completar ?? (sol ? sol.length : 3), 1, 6, 3);
  let huecos = Array(n).fill(null);

  const huecosEl = huecos.map((_, i) => h('button', {
    type: 'button', class: 'pat-hueco', 'aria-label': `Espacio ${i + 1}`, onclick: () => vaciar(i),
  }));
  const paletaEl = opciones.map((o) => h('button', {
    type: 'button', class: `pat-ficha ${esEmoji(o) ? 'sec-emoji' : 'sec-texto'}`, 'aria-label': `Poner ${o}`, onclick: () => poner(o),
  }, o));
  b.el.append(
    h('div', { class: 'sec-fila pat-fila' }, secuencia.map((x) => cajaSecuencia(x)), huecosEl),
    h('div', { class: 'pat-paleta', role: 'group', 'aria-label': 'Fichas' }, paletaEl),
  );

  function poner(o) {
    if (b.bloqueado) return;
    const i = huecos.indexOf(null);
    if (i < 0) return;
    huecos = huecos.map((x, k) => (k === i ? o : x));
    pintar();
    b.avisar();
  }

  function vaciar(i) {
    if (b.bloqueado || huecos[i] === null) return;
    huecos = huecos.map((x, k) => (k === i ? null : x));
    pintar();
    b.avisar();
  }

  function pintar() {
    const siguiente = huecos.indexOf(null);
    huecosEl.forEach((el, i) => {
      const x = huecos[i];
      el.textContent = x === null ? '' : x;
      el.className = `pat-hueco${x === null ? '' : ` lleno ${esEmoji(x) ? 'sec-emoji' : 'sec-texto'}`}${i === siguiente && !b.bloqueado ? ' siguiente' : ''}`;
      el.setAttribute('aria-label', x === null ? `Espacio ${i + 1}, vacío` : `Espacio ${i + 1}: ${x}. Toca para quitar.`);
      el.disabled = b.bloqueado;
    });
    paletaEl.forEach((el) => { el.disabled = b.bloqueado || siguiente < 0; });
  }

  const api = {
    el: b.el,
    listo: () => huecos.every((x) => x !== null),
    evaluar() {
      if (!sol || b.libre) return { correcto: true };
      if (huecos.some((x) => x === null)) return { correcto: false, detalle: 'Todavía hay espacios vacíos.' };
      const i = huecos.findIndex((x, k) => x !== sol[k]);
      if (i < 0) return { correcto: true };
      return { correcto: false, detalle: `Mira otra vez qué se repite. Revisa el ${ORDINAL[i] || `espacio ${i + 1}`}${ORDINAL[i] ? ' espacio' : ''}.` };
    },
    mostrarSolucion() {
      if (!sol) return;
      huecos = huecos.map((_, i) => (sol[i] !== undefined ? sol[i] : null));
      b.el.classList.add('solucion');
      pintar();
    },
    bloquear() {
      b.bloqueado = true;
      b.el.classList.add('bloqueado');
      pintar();
    },
    reiniciar() {
      huecos = Array(n).fill(null);
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto: () => huecos.map((x) => (x === null ? '_' : x)).join(', '),
  };
  pintar();
  return api;
}
