// Dinero: tocar monedas y billetes para ponerlos en «Mi bandeja».
// Tocar algo de la bandeja lo devuelve.
import { h } from '../ui/dom.js';
import { DINERO, formatoBs } from '../contenido/catalogo.js';
import { dineroSVG } from '../visuales/visual.js';
import { crearBase, lectura } from './comun.js';

const MAX_BANDEJA = 40;
const ORDEN = Object.keys(DINERO); // de menor a mayor valor

// Menor cantidad de piezas que suman exactamente `centavos` (null si no se puede).
export function descomponerDinero(centavos, codigos) {
  const cods = codigos.filter((k) => DINERO[k]).sort((a, b) => DINERO[b].valor - DINERO[a].valor);
  if (!cods.length || centavos <= 0) return centavos === 0 ? [] : null;
  const U = 10; // todos los valores son múltiplos de 10 centavos
  if (centavos % U) return null;
  const N = centavos / U;
  const mejor = new Array(N + 1).fill(Infinity);
  const elegido = new Array(N + 1).fill(null);
  mejor[0] = 0;
  for (let v = 1; v <= N; v++) {
    for (const k of cods) {
      const p = DINERO[k].valor / U;
      if (p <= v && mejor[v - p] + 1 < mejor[v]) {
        mejor[v] = mejor[v - p] + 1;
        elegido[v] = k;
      }
    }
  }
  if (!Number.isFinite(mejor[N])) return null;
  const res = [];
  for (let v = N; v > 0; v -= DINERO[elegido[v]].valor / U) res.push(elegido[v]);
  return res.sort((a, b) => DINERO[b].valor - DINERO[a].valor);
}

const nombreCorto = (k) => {
  const d = DINERO[k];
  if (d.clase === 'billete') return `billete de ${d.valor / 100} Bs`;
  return d.valor < 100 ? `moneda de ${d.valor} centavos` : `moneda de ${d.valor / 100} Bs`;
};

export function crear(cfg, opts) {
  const b = crearBase('dinero', opts);
  const disp = (Array.isArray(cfg.disponibles) && cfg.disponibles.length ? cfg.disponibles : ORDEN)
    .filter((k, i, a) => DINERO[k] && a.indexOf(k) === i)
    .sort((x, y) => DINERO[x].valor - DINERO[y].valor);
  const objetivo = Number.isInteger(cfg.objetivo) ? cfg.objetivo : null;
  const mostrarTotal = b.libre || cfg.mostrarTotal === true;
  const inicial = (Array.isArray(cfg.inicial) ? cfg.inicial : []).filter((k) => DINERO[k]);
  let bandeja = inicial.slice();
  let solucion = false;

  const monedas = disp.filter((k) => DINERO[k].clase === 'moneda');
  const billetes = disp.filter((k) => DINERO[k].clase === 'billete');
  const botonPaleta = (k) => h('button', {
    type: 'button', class: `din-btn din-btn-${DINERO[k].clase}`,
    'aria-label': `Poner ${nombreCorto(k)}`, onclick: () => agregar(k),
  }, dineroSVG(k, { escala: DINERO[k].clase === 'billete' ? 0.74 : 0.84 }));
  const paletaBtns = [];
  const paleta = h('div', { class: 'din-paleta', role: 'group', 'aria-label': 'Monedas y billetes' },
    monedas.length ? h('div', { class: 'din-paleta-fila' }, monedas.map((k) => { const x = botonPaleta(k); paletaBtns.push(x); return x; })) : null,
    billetes.length ? h('div', { class: 'din-paleta-fila' }, billetes.map((k) => { const x = botonPaleta(k); paletaBtns.push(x); return x; })) : null);

  const zona = h('div', { class: 'din-bandeja-zona' });
  const total = lectura('din-total');
  const bandejaEl = h('div', { class: 'din-bandeja', role: 'group', 'aria-label': 'Mi bandeja' },
    h('div', { class: 'din-bandeja-titulo' }, h('span', { 'aria-hidden': 'true' }, '🧺 '), 'Mi bandeja'),
    zona, total);
  b.el.append(paleta, bandejaEl);

  const suma = () => bandeja.reduce((a, k) => a + DINERO[k].valor, 0);

  function agregar(k) {
    if (b.bloqueado || bandeja.length >= MAX_BANDEJA) return;
    bandeja.push(k);
    pintar();
    b.avisar();
  }

  function quitar(i) {
    if (b.bloqueado) return;
    bandeja.splice(i, 1);
    pintar();
    b.avisar();
  }

  function pintar() {
    const orden = bandeja.map((k, i) => ({ k, i })).sort((x, y) => DINERO[y.k].valor - DINERO[x.k].valor);
    zona.replaceChildren(...(orden.length
      ? orden.map(({ k, i }) => h('button', {
        type: 'button', class: `din-item din-item-${DINERO[k].clase}`, disabled: b.bloqueado,
        'aria-label': `Quitar ${nombreCorto(k)}`, onclick: () => quitar(i),
      }, dineroSVG(k, { escala: DINERO[k].clase === 'billete' ? 0.7 : 0.8 })))
      : [h('div', { class: 'din-vacia' }, 'Toca el dinero de arriba para ponerlo aquí.')]));
    paletaBtns.forEach((x) => { x.disabled = b.bloqueado || bandeja.length >= MAX_BANDEJA; });
    const ver = mostrarTotal || solucion;
    total.hidden = !ver;
    if (ver) total.textContent = `Total: ${formatoBs(suma())}`;
  }

  const api = {
    el: b.el,
    listo: () => bandeja.length > 0,
    evaluar() {
      if (objetivo === null) return { correcto: true };
      const t = suma();
      if (t === objetivo) return { correcto: true };
      return { correcto: false, detalle: t < objetivo ? 'Todavía falta dinero.' : 'Pusiste más dinero del necesario.' };
    },
    mostrarSolucion() {
      if (objetivo === null) return;
      const piezas = descomponerDinero(objetivo, disp) || descomponerDinero(objetivo, ORDEN) || [];
      bandeja = piezas;
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
      bandeja = inicial.slice();
      solucion = false;
      b.bloqueado = false;
      b.el.classList.remove('bloqueado', 'solucion');
      pintar();
    },
    valorTexto() {
      if (!bandeja.length) return 'bandeja vacía';
      const cuenta = new Map();
      for (const k of bandeja) cuenta.set(k, (cuenta.get(k) || 0) + 1);
      const partes = [...cuenta.entries()]
        .sort((x, y) => DINERO[y[0]].valor - DINERO[x[0]].valor)
        .map(([k, n]) => {
          const d = DINERO[k];
          const valor = d.valor < 100 ? `${d.valor} ctv` : `${d.valor / 100} Bs`;
          return `${n} ${d.clase === 'billete' ? (n === 1 ? 'billete' : 'billetes') : (n === 1 ? 'moneda' : 'monedas')} de ${valor}`;
        });
      return `${partes.join(', ')} (total ${formatoBs(suma())})`;
    },
  };
  pintar();
  return api;
}
