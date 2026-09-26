// Tipo «relacionar»: unir parejas tocando un elemento de cada columna.
import { h, mezclarDistinto } from '../ui/dom.js';
import { textoOpcion } from '../contenido/texto.js';

const COLORES = ['#1F7A70', '#3C5BA9', '#B06A00', '#8E3B8E', '#2E7D4F', '#B3412E'];

const lado = (x) => (typeof x === 'string' ? { texto: x } : x);

export default function relacionar(cont, ej, ctx) {
  const izq = ej.pares.map((p, i) => ({ i, ...lado(p[0]) }));
  const der = mezclarDistinto(ej.pares.map((p, i) => ({ i, ...lado(p[1]) })), (a, b) => a.i === b.i);
  const uniones = new Map(); // izq.i → der.i
  let elegidoIzq = null;
  let elegidoDer = null;
  let bloqueado = false;

  const boton = (item, onclick) => h('button', { class: 'ficha', type: 'button', onclick },
    item.emoji ? h('span', { class: 'emoji', 'aria-hidden': 'true' }, item.emoji) : null,
    item.texto ? h('span', {}, item.texto) : null);

  const bIzq = izq.map((it) => boton(it, () => tocarIzq(it.i)));
  const bDer = der.map((it) => boton(it, () => tocarDer(it.i)));
  const colI = h('div', { class: 'col', role: 'group', 'aria-label': 'Columna izquierda' }, bIzq);
  const colD = h('div', { class: 'col', role: 'group', 'aria-label': 'Columna derecha' }, bDer);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'lineas');
  svg.setAttribute('aria-hidden', 'true');
  const caja = h('div', { class: 'relacionar' }, colI, colD);
  caja.appendChild(svg);
  cont.appendChild(caja);
  cont.appendChild(h('p', { style: 'text-align:center;color:var(--tinta-suave);margin-top:10px;font-size:.95rem' }, 'Toca uno de cada lado para unirlos. Toca otra vez para separarlos.'));

  function unir(a, b) {
    for (const [k, v] of uniones) if (v === b) uniones.delete(k);
    uniones.set(a, b);
    elegidoIzq = null; elegidoDer = null;
    pintar();
    ctx.alCambiar();
  }
  function tocarIzq(i) {
    if (bloqueado) return;
    if (uniones.has(i)) { uniones.delete(i); pintar(); ctx.alCambiar(); return; }
    if (elegidoDer !== null) { unir(i, elegidoDer); return; }
    elegidoIzq = elegidoIzq === i ? null : i;
    pintar();
  }
  function tocarDer(i) {
    if (bloqueado) return;
    const unido = [...uniones].find(([, v]) => v === i);
    if (unido) { uniones.delete(unido[0]); pintar(); ctx.alCambiar(); return; }
    if (elegidoIzq !== null) { unir(elegidoIzq, i); return; }
    elegidoDer = elegidoDer === i ? null : i;
    pintar();
  }

  function pintar() {
    const colorDe = new Map();
    let c = 0;
    izq.forEach((it) => { if (uniones.has(it.i)) colorDe.set(it.i, COLORES[c++ % COLORES.length]); });
    bIzq.forEach((b, k) => {
      const i = izq[k].i;
      b.classList.toggle('unida', uniones.has(i));
      b.classList.toggle('elegida', elegidoIzq === i);
      b.style.setProperty('--par', colorDe.get(i) || '');
      b.disabled = bloqueado;
    });
    bDer.forEach((b, k) => {
      const i = der[k].i;
      const par = [...uniones].find(([, v]) => v === i);
      b.classList.toggle('unida', !!par);
      b.classList.toggle('elegida', elegidoDer === i);
      b.style.setProperty('--par', par ? colorDe.get(par[0]) : '');
      b.disabled = bloqueado;
    });
    requestAnimationFrame(dibujarLineas);
  }

  function dibujarLineas() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const base = caja.getBoundingClientRect();
    for (const [a, b] of uniones) {
      const ea = bIzq[izq.findIndex((x) => x.i === a)];
      const eb = bDer[der.findIndex((x) => x.i === b)];
      if (!ea || !eb) continue;
      const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
      const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      linea.setAttribute('x1', String(ra.right - base.left));
      linea.setAttribute('y1', String(ra.top + ra.height / 2 - base.top));
      linea.setAttribute('x2', String(rb.left - base.left));
      linea.setAttribute('y2', String(rb.top + rb.height / 2 - base.top));
      linea.setAttribute('stroke', getComputedStyle(ea).getPropertyValue('--par') || '#1F7A70');
      linea.setAttribute('stroke-width', '4');
      linea.setAttribute('stroke-linecap', 'round');
      svg.appendChild(linea);
    }
  }
  window.addEventListener('resize', dibujarLineas);
  pintar();

  const texto = (it) => textoOpcion(it);

  return {
    listo: () => uniones.size === izq.length,
    evaluar() {
      const malos = [...uniones].filter(([a, b]) => a !== b);
      const respuesta = [...uniones].map(([a, b]) => `${texto(izq.find((x) => x.i === a))}–${texto(der.find((x) => x.i === b))}`).join(', ');
      if (!malos.length && uniones.size === izq.length) return { correcto: true, respuesta };
      const extra = malos.length === 1 ? 'Una pareja no va junta.' : `${malos.length} parejas no van juntas.`;
      return { correcto: false, pista: `${extra} ${ej.pista}`, error: ej.error, respuesta };
    },
    prepararReintento() {
      for (const [a, b] of [...uniones]) if (a !== b) uniones.delete(a);
      pintar();
    },
    mostrarSolucion() {
      uniones.clear();
      izq.forEach((it) => uniones.set(it.i, it.i));
      bloqueado = true;
      pintar();
    },
    bloquear() { bloqueado = true; pintar(); },
  };
}
